'use strict';

/**
 * Thin wrapper around the preload `window.fut` bridge that unwraps the
 * { ok, data, error } envelope into either resolved data or a thrown Error.
 */
(function initApi(global) {
  const bridge = global.fut;
  if (!bridge) {
    throw new Error('Preload bridge (window.fut) is unavailable.');
  }

  function unwrap(promise) {
    return promise.then((res) => {
      if (res && res.ok) return res.data;
      throw new Error((res && res.error) || 'Unknown error');
    });
  }

  global.FutApi = {
    list: () => unwrap(bridge.list()),
    read: (name) => unwrap(bridge.read(name)),
    create: (name) => unwrap(bridge.create(name)),
    write: (name, content) => unwrap(bridge.write(name, content)),
    rename: (oldName, newName) => unwrap(bridge.rename(oldName, newName)),
    remove: (name) => unwrap(bridge.remove(name)),
    notesDir: () => unwrap(bridge.notesDir()),
    revealFolder: () => unwrap(bridge.revealFolder()),
    onMenu: (channel, handler) => bridge.onMenu(channel, handler)
  };
})(window);
