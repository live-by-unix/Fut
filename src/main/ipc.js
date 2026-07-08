'use strict';

const { ipcMain, shell } = require('electron');
const { NotesManager } = require('./notesManager');

/**
 * Registers every renderer-facing IPC handler. Each handler returns a plain
 * serialisable object of the shape { ok, data } or { ok:false, error } so the
 * renderer never has to deal with thrown exceptions across the bridge.
 */
function registerIpcHandlers(notesManager = new NotesManager()) {
  const handle = (channel, fn) => {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        const data = await fn(...args);
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    });
  };

  handle('notes:list', () => notesManager.list());
  handle('notes:read', (name) => notesManager.read(name));
  handle('notes:create', (name) => notesManager.create(name));
  handle('notes:write', (name, content) => notesManager.write(name, content));
  handle('notes:rename', (oldName, newName) => notesManager.rename(oldName, newName));
  handle('notes:delete', (name) => notesManager.remove(name));
  handle('notes:dir', () => notesManager.ensureDir());
  handle('notes:reveal', async () => {
    const dir = await notesManager.ensureDir();
    await shell.openPath(dir);
    return dir;
  });

  return notesManager;
}

module.exports = { registerIpcHandlers };
