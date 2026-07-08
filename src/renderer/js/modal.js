'use strict';

/**
 * A tiny promise-based modal used for note creation and renaming. Resolves with
 * the entered string, or null if the user cancels. Supports inline validation
 * by passing a `validate(value)` function that returns an error string.
 */
(function initModal(global) {
  const modal = document.getElementById('modal');
  const dialogTitle = document.getElementById('modal-title');
  const message = document.getElementById('modal-message');
  const input = document.getElementById('modal-input');
  const errorEl = document.getElementById('modal-error');
  const confirmBtn = document.getElementById('modal-confirm');
  const cancelBtn = document.getElementById('modal-cancel');
  const backdrop = modal.querySelector('[data-modal-close]');

  let resolver = null;
  let validate = null;

  function close(value) {
    modal.hidden = true;
    document.removeEventListener('keydown', onKeydown, true);
    const r = resolver;
    resolver = null;
    validate = null;
    if (r) r(value);
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function submit() {
    const value = input.value.trim();
    if (validate) {
      const err = validate(value);
      if (err) {
        showError(err);
        return;
      }
    }
    close(value);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(null);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  }

  confirmBtn.addEventListener('click', submit);
  cancelBtn.addEventListener('click', () => close(null));
  backdrop.addEventListener('click', () => close(null));
  input.addEventListener('input', () => showError(''));

  global.FutModal = {
    prompt({ title, messageText, value = '', confirmLabel = 'OK', validate: v = null } = {}) {
      dialogTitle.textContent = title || 'Fut';
      message.textContent = messageText || '';
      confirmBtn.textContent = confirmLabel;
      input.value = value;
      validate = v;
      showError('');
      modal.hidden = false;
      document.addEventListener('keydown', onKeydown, true);
      // Focus + select on next frame so the modal is visible first.
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
      return new Promise((resolve) => {
        resolver = resolve;
      });
    }
  };
})(window);
