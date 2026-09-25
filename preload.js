const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  setOpacity: (value) => ipcRenderer.send('set-opacity', value),
  setClickThrough: (enabled) => ipcRenderer.send('set-click-through', enabled),
  minimize: () => ipcRenderer.send('minimize-window'),
  close: () => ipcRenderer.send('close-window'),
  requestWindowState: () => ipcRenderer.send('request-window-state'),
  onOpacityChanged: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('opacity-changed', listener);
    return () => ipcRenderer.removeListener('opacity-changed', listener);
  },
  onClickThroughChanged: (callback) => {
    const listener = (_event, enabled) => callback(Boolean(enabled));
    ipcRenderer.on('click-through-changed', listener);
    return () => ipcRenderer.removeListener('click-through-changed', listener);
  },
  onToggleClickThroughHotkey: (callback) => {
    const listener = (_event, enabled) => callback(enabled);
    ipcRenderer.on('toggle-click-through-hotkey', listener);
    return () => ipcRenderer.removeListener('toggle-click-through-hotkey', listener);
  },
});
