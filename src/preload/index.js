'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * The single, minimal surface exposed to the renderer. Everything is promise
 * based and returns the { ok, data, error } envelope produced by the main
 * process IPC handlers. No Node.js primitives leak into the renderer.
 */
const api = {
  list: () => ipcRenderer.invoke('notes:list'),
  read: (name) => ipcRenderer.invoke('notes:read', name),
  create: (name) => ipcRenderer.invoke('notes:create', name),
  write: (name, content) => ipcRenderer.invoke('notes:write', name, content),
  rename: (oldName, newName) => ipcRenderer.invoke('notes:rename', oldName, newName),
  remove: (name) => ipcRenderer.invoke('notes:delete', name),
  notesDir: () => ipcRenderer.invoke('notes:dir'),
  revealFolder: () => ipcRenderer.invoke('notes:reveal'),
  onMenu: (channel, handler) => {
    const allowed = ['menu:new-note', 'menu:reveal-folder'];
    if (!allowed.includes(channel)) return () => {};
    const listener = () => handler();
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
};

contextBridge.exposeInMainWorld('fut', api);
