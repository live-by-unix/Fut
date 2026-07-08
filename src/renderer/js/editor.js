'use strict';

/**
 * Owns the central editor textarea + title field and the autosave lifecycle.
 * Emits changes through callbacks so the orchestrator can persist to disk and
 * refresh the sidebar/preview.
 */
(function initEditor(global) {
  const titleEl = document.getElementById('note-title');
  const editorEl = document.getElementById('editor');
  const statusEl = document.getElementById('save-status');
  const deleteBtn = document.getElementById('btn-delete');

  let currentName = null;
  let saving = false; // a write is currently in flight
  let dirty = false; // content changed while a write was in flight
  let handlers = {
    onSave: async () => {},
    onRename: async () => {},
    onDelete: async () => {},
    onInput: () => {}
  };

  function setStatus(text, kind = '') {
    statusEl.textContent = text;
    statusEl.className = 'editor__status' + (kind ? ` editor__status--${kind}` : '');
  }

  function setEnabled(enabled) {
    editorEl.disabled = !enabled;
    titleEl.disabled = !enabled;
    deleteBtn.disabled = !enabled;
  }

  // Serialised autosave: every keystroke triggers a write. If a write is still
  // in flight, the newest content is coalesced and written immediately after,
  // so the file always converges to exactly what is on screen with no debounce
  // gap where edits could be lost.
  async function flush() {
    if (currentName == null || saving) {
      if (currentName != null) dirty = true;
      return;
    }
    saving = true;
    try {
      do {
        dirty = false;
        const name = currentName;
        const content = editorEl.value;
        setStatus('Saving…');
        // eslint-disable-next-line no-await-in-loop
        await handlers.onSave(name, content);
      } while (dirty && currentName != null);
      setStatus('Saved', 'ok');
    } catch (err) {
      setStatus('Save failed', 'error');
      global.FutToast && global.FutToast(`Save failed: ${err.message}`, 'error');
    } finally {
      saving = false;
    }
  }

  editorEl.addEventListener('input', () => {
    flush();
    handlers.onInput(editorEl.value);
  });

  // Persist immediately when focus leaves the editor or the window hides.
  editorEl.addEventListener('blur', flush);
  window.addEventListener('beforeunload', flush);

  titleEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      titleEl.blur();
    }
  });

  titleEl.addEventListener('blur', async () => {
    const next = titleEl.value.trim();
    if (currentName == null) return;
    if (!next || next === currentName) {
      titleEl.value = currentName;
      return;
    }
    try {
      await flush();
      const renamed = await handlers.onRename(currentName, next);
      currentName = renamed;
      titleEl.value = renamed;
      setStatus('Renamed', 'ok');
    } catch (err) {
      titleEl.value = currentName;
      global.FutToast && global.FutToast(err.message, 'error');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (currentName == null) return;
    await handlers.onDelete(currentName);
  });

  global.FutEditor = {
    configure(next) {
      handlers = Object.assign(handlers, next);
    },
    async load(name, content) {
      await flush();
      currentName = name;
      titleEl.value = name || '';
      editorEl.value = content || '';
      setEnabled(true);
      setStatus('Ready');
      editorEl.focus();
    },
    clear() {
      currentName = null;
      dirty = false;
      titleEl.value = '';
      editorEl.value = '';
      setEnabled(false);
      setStatus('Ready');
    },
    getName() {
      return currentName;
    },
    getContent() {
      return editorEl.value;
    },
    flush,
    focus() {
      editorEl.focus();
    }
  };
})(window);
