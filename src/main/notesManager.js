'use strict';

const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');

const NOTES_DIR_NAME = '.futnotes';
const NOTE_EXT = '.md';

/**
 * NotesManager owns every interaction with the on-disk note store. All notes
 * live as plain Markdown files inside ~/.futnotes. The class deliberately keeps
 * zero UI/Electron knowledge so it stays trivially testable.
 */
class NotesManager {
  constructor(baseDir) {
    this.notesDir = baseDir || path.join(os.homedir(), NOTES_DIR_NAME);
  }

  async ensureDir() {
    await fsp.mkdir(this.notesDir, { recursive: true });
    return this.notesDir;
  }

  /**
   * Turns an arbitrary user-supplied name into a safe bare note name (no
   * extension, no path separators, no traversal). Throws on empty results.
   */
  sanitizeName(rawName) {
    if (typeof rawName !== 'string') {
      throw new Error('Note name must be a string.');
    }
    let name = rawName.trim();
    if (name.toLowerCase().endsWith(NOTE_EXT)) {
      name = name.slice(0, -NOTE_EXT.length);
    }
    // Strip any directory components and characters illegal on common systems.
    name = path.basename(name);
    // eslint-disable-next-line no-control-regex
    name = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim();
    // Disallow names that resolve to hidden/dot files or reserved dots.
    name = name.replace(/^\.+/, '').trim();
    if (!name) {
      throw new Error('Please provide a valid note name.');
    }
    if (name.length > 200) {
      name = name.slice(0, 200).trim();
    }
    return name;
  }

  fileNameFor(name) {
    return `${this.sanitizeName(name)}${NOTE_EXT}`;
  }

  filePathFor(name) {
    const filePath = path.join(this.notesDir, this.fileNameFor(name));
    const resolved = path.resolve(filePath);
    // Final guard against path traversal escaping the notes directory.
    if (path.dirname(resolved) !== path.resolve(this.notesDir)) {
      throw new Error('Resolved note path is outside the notes directory.');
    }
    return resolved;
  }

  static deriveTitle(name, content) {
    const match = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/m.exec(content || '');
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    return name;
  }

  static deriveSnippet(content) {
    if (!content) return '';
    const plain = content
      .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
      .replace(/`[^`]*`/g, ' ') // inline code
      .replace(/^\s{0,3}#{1,6}\s+/gm, '') // heading markers
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
      .replace(/[*_>#~-]/g, ' ') // stray markdown punctuation
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length > 140 ? `${plain.slice(0, 140)}\u2026` : plain;
  }

  async list() {
    await this.ensureDir();
    const entries = await fsp.readdir(this.notesDir, { withFileTypes: true });
    const notes = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith(NOTE_EXT)) continue;
      const name = entry.name.slice(0, -NOTE_EXT.length);
      const full = path.join(this.notesDir, entry.name);
      let content = '';
      let stat;
      try {
        [content, stat] = await Promise.all([
          fsp.readFile(full, 'utf8'),
          fsp.stat(full)
        ]);
      } catch (err) {
        continue;
      }
      notes.push({
        name,
        title: NotesManager.deriveTitle(name, content),
        snippet: NotesManager.deriveSnippet(content),
        modified: stat.mtimeMs,
        size: stat.size
      });
    }
    notes.sort((a, b) => b.modified - a.modified);
    return notes;
  }

  async read(name) {
    const filePath = this.filePathFor(name);
    const content = await fsp.readFile(filePath, 'utf8');
    return { name: this.sanitizeName(name), content };
  }

  async create(name) {
    await this.ensureDir();
    const safeName = this.sanitizeName(name);
    const filePath = this.filePathFor(safeName);
    try {
      // 'wx' fails if the file already exists.
      const initial = `# ${safeName}\n\n`;
      await fsp.writeFile(filePath, initial, { flag: 'wx', encoding: 'utf8' });
    } catch (err) {
      if (err.code === 'EEXIST') {
        throw new Error(`A note named "${safeName}" already exists.`);
      }
      throw err;
    }
    return this.read(safeName);
  }

  async write(name, content) {
    await this.ensureDir();
    const filePath = this.filePathFor(name);
    await fsp.writeFile(filePath, content == null ? '' : String(content), 'utf8');
    return { name: this.sanitizeName(name), ok: true };
  }

  async rename(oldName, newName) {
    await this.ensureDir();
    const from = this.filePathFor(oldName);
    const safeNew = this.sanitizeName(newName);
    const to = this.filePathFor(safeNew);
    if (from === to) {
      return { name: safeNew, ok: true };
    }
    try {
      await fsp.access(to, fs.constants.F_OK);
      throw new Error(`A note named "${safeNew}" already exists.`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
    await fsp.rename(from, to);
    return { name: safeNew, ok: true };
  }

  async remove(name) {
    const filePath = this.filePathFor(name);
    await fsp.rm(filePath, { force: true });
    return { name: this.sanitizeName(name), ok: true };
  }
}

module.exports = { NotesManager, NOTES_DIR_NAME, NOTE_EXT };
