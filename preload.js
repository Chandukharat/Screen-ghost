const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  setOpacity: (value) => ipcRenderer.send('set-opacity', value),
  setClickThrough: (enabled) => ipcRenderer.send('set-click-through', enabled),
  minimize: () => ipcRenderer.send('minimize-window'),
  close: () => ipcRenderer.send('close-window'),
  onToggleClickThroughHotkey: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('toggle-click-through-hotkey', listener);
    return () => ipcRenderer.removeListener('toggle-click-through-hotkey', listener);
  },
});
