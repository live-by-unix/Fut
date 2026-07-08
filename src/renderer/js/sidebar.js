'use strict';

/**
 * Renders the list of note cards in the sidebar and emits selection events.
 * Owns only the sidebar DOM; the app orchestrator wires callbacks.
 */
(function initSidebar(global) {
  const listEl = document.getElementById('note-list');
  const emptyEl = document.getElementById('sidebar-empty');
  const searchEl = document.getElementById('search');

  let notes = [];
  let activeName = null;
  let filter = '';
  let onSelect = () => {};

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(ms) {
    const d = new Date(ms);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function visibleNotes() {
    if (!filter) return notes;
    const q = filter.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.name.toLowerCase().includes(q) ||
        n.snippet.toLowerCase().includes(q)
    );
  }

  function render() {
    const items = visibleNotes();
    listEl.innerHTML = '';

    if (notes.length === 0) {
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
    }

    for (const note of items) {
      const card = document.createElement('button');
      card.className = 'note-card' + (note.name === activeName ? ' note-card--active' : '');
      card.type = 'button';
      card.setAttribute('role', 'listitem');
      card.dataset.name = note.name;
      card.innerHTML = `
        <div class="note-card__title">${escapeHtml(note.title)}</div>
        <div class="note-card__snippet">${escapeHtml(note.snippet) || '<span class="note-card__muted">Empty note</span>'}</div>
        <div class="note-card__meta">${formatDate(note.modified)}</div>
      `;
      card.addEventListener('click', () => onSelect(note.name));
      listEl.appendChild(card);
    }

    if (notes.length > 0 && items.length === 0) {
      const noMatch = document.createElement('div');
      noMatch.className = 'sidebar__nomatch';
      noMatch.textContent = 'No notes match your search.';
      listEl.appendChild(noMatch);
    }
  }

  searchEl.addEventListener('input', () => {
    filter = searchEl.value;
    render();
  });

  global.FutSidebar = {
    setNotes(next) {
      notes = Array.isArray(next) ? next : [];
      render();
    },
    setActive(name) {
      activeName = name;
      render();
    },
    onSelect(fn) {
      onSelect = fn;
    }
  };
})(window);
