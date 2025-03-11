const { contextBridge, ipcRenderer } = require('electron');

try {
  // Expose protected methods that allow the renderer process to use
  // the ipcRenderer without exposing the entire object
  contextBridge.exposeInMainWorld('electron', {
    store: {
      get: (key) => ipcRenderer.invoke('store-get', { key }),
      set: (key, value) => ipcRenderer.invoke('store-set', { key, value }),
    },
    python: {
      run: (script) => ipcRenderer.invoke('run-python', script),
    },
    git: {
      sync: () => ipcRenderer.invoke('git-sync'),
    },
    // Add any other methods you need to expose here
  });
  console.log('✅ Preload script loaded successfully');
} catch (error) {
  console.error('❌ Error in preload script:', error);
}
