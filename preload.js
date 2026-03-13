const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xboxPicker', {
  // Load config and initial data
  getConfig: () => ipcRenderer.invoke('get-config'),
  getTheme: (themeName) => ipcRenderer.invoke('get-theme', themeName),
  getAvailableThemes: () => ipcRenderer.invoke('get-available-themes'),

  // Game library
  scanGames: () => ipcRenderer.invoke('scan-games'),

  // Selection
  selectGame: (filePath) => ipcRenderer.invoke('select-game', filePath),
  cancel: () => ipcRenderer.invoke('cancel'),

  // Art loading
  loadCoverArt: (artPath) => ipcRenderer.invoke('load-cover-art', artPath),
});
