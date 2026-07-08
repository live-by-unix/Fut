'use strict';

/**
 * Application orchestrator. Wires together the split-pane layout, sidebar,
 * editor and live preview, and coordinates every filesystem interaction via
 * FutApi. This is the only module that knows about all the others.
 */
(function initApp(global) {
  const api = global.FutApi;
  const md = global.FutMarkdown;
  const sidebar = global.FutSidebar;
  const editor = global.FutEditor;
  const modal = global.FutModal;
  const Split = global.Split;

  const previewEl = document.getElementById('preview');
  const newNoteBtn = document.getElementById('btn-new-note');
  const revealBtn = document.getElementById('btn-reveal');
  const toastEl = document.getElementById('toast');

  let notes = [];
  let currentName = null;
  let toastTimer = null;

  // ---- Toast ---------------------------------------------------------------
  function toast(message, kind = 'info') {
    toastEl.textContent = message;
    toastEl.className = `toast toast--${kind}`;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 3200);
  }
  global.FutToast = toast;

  // ---- Preview -------------------------------------------------------------
  const placeholderHTML = previewEl.innerHTML;

  function renderPreview(text) {
    if (text == null || text.trim() === '') {
      previewEl.innerHTML = '<p class="preview__muted">Nothing to preview yet — start typing.</p>';
      return;
    }
    previewEl.innerHTML = md.render(text);
  }

  // ---- Data flow -----------------------------------------------------------
  async function refreshList(selectName) {
    notes = await api.list();
    sidebar.setNotes(notes);
    if (selectName !== undefined) {
      sidebar.setActive(selectName);
    } else {
      sidebar.setActive(currentName);
    }
  }

  async function openNote(name) {
    try {
      const note = await api.read(name);
      currentName = note.name;
      sidebar.setActive(currentName);
      await editor.load(note.name, note.content);
      renderPreview(note.content);
    } catch (err) {
      toast(`Could not open note: ${err.message}`, 'error');
      await refreshList();
    }
  }

  function validateName(value, { excluding } = {}) {
    if (!value) return 'Please enter a name.';
    if (/[<>:"/\\|?*]/.test(value)) return 'Name cannot contain \\ / : * ? " < > |';
    const exists = notes.some(
      (n) => n.name.toLowerCase() === value.toLowerCase() && n.name !== excluding
    );
    if (exists) return `A note named "${value}" already exists.`;
    return '';
  }

  async function createNote() {
    const name = await modal.prompt({
      title: 'New Note',
      messageText: 'Enter a name for your note (without .md).',
      confirmLabel: 'Create',
      validate: (value) => validateName(value)
    });
    if (name == null) return;
    try {
      const note = await api.create(name);
      await refreshList(note.name);
      currentName = note.name;
      await editor.load(note.name, note.content);
      renderPreview(note.content);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function saveNote(name, content) {
    await api.write(name, content);
    // Refresh the card's snippet/title/order without stealing focus.
    await refreshList();
  }

  async function renameNote(oldName, newName) {
    const result = await api.rename(oldName, newName);
    currentName = result.name;
    await refreshList(result.name);
    return result.name;
  }

  async function deleteNote(name) {
    const confirmed = await modal.prompt({
      title: 'Delete Note',
      messageText: `Type the note name to permanently delete "${name}".`,
      confirmLabel: 'Delete',
      validate: (value) => (value === name ? '' : 'Names do not match.')
    });
    if (confirmed == null) return;
    try {
      await api.remove(name);
      currentName = null;
      editor.clear();
      previewEl.innerHTML = placeholderHTML;
      await refreshList(null);
      toast(`Deleted "${name}".`, 'info');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ---- Wire up -------------------------------------------------------------
  editor.configure({
    onSave: saveNote,
    onRename: renameNote,
    onDelete: deleteNote,
    onInput: renderPreview
  });

  sidebar.onSelect((name) => {
    if (name === currentName) return;
    openNote(name);
  });

  newNoteBtn.addEventListener('click', createNote);
  revealBtn.addEventListener('click', async () => {
    try {
      await api.revealFolder();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  api.onMenu('menu:new-note', createNote);
  api.onMenu('menu:reveal-folder', () => api.revealFolder());

  document.addEventListener('keydown', (event) => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      createNote();
    }
  });

  // ---- Split panes ---------------------------------------------------------
  function setupSplit() {
    Split(['#pane-sidebar', '#pane-editor', '#pane-preview'], {
      sizes: [22, 42, 36],
      minSize: [180, 280, 220],
      gutterSize: 8,
      snapOffset: 0,
      elementStyle: (dimension, size, gutterSize) => ({
        'flex-basis': `calc(${size}% - ${gutterSize}px)`
      }),
      gutterStyle: (dimension, gutterSize) => ({
        'flex-basis': `${gutterSize}px`
      })
    });
  }

  // ---- Boot ----------------------------------------------------------------
  async function boot() {
    try {
      setupSplit();
      await refreshList(null);
      if (notes.length > 0) {
        await openNote(notes[0].name);
      }
    } catch (err) {
      toast(`Startup error: ${err.message}`, 'error');
    }
  }

  boot();
})(window);
