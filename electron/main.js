const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.ELECTRON_PORT || 3000;
const { exec } = require('child_process');
const simpleGit = require('simple-git');

let mainWindow;
let store;

async function initializeStore() {
  const Store = (await import('electron-store')).default;
  store = new Store();
}

async function createWindow() {
  // Initialize store before creating window
  await initializeStore();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    // Add show: false to prevent white flash
    show: false
  });

  // Load the app with the correct port
  const startURL = isDev
    ? `http://localhost:${PORT}`
    : `file://${path.join(__dirname, '../out/index.html')}`;

  try {
    await mainWindow.loadURL(startURL);
    // Once content is loaded, show the window
    mainWindow.show();
  } catch (error) {
    console.error('Failed to load URL:', error);
  }

  // Handle OAuth callbacks
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.includes('/api/auth/callback')) {
      event.preventDefault();
      mainWindow.loadURL(`http://localhost:${PORT}${new URL(url).pathname}${new URL(url).search}`);
    }
  });

  // Remove automatic DevTools opening
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('run-python', async (event, script) => {
  return new Promise((resolve, reject) => {
    exec(`python ${script}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      resolve(stdout);
    });
  });
});

// Git operations
const git = simpleGit();

ipcMain.handle('git-sync', async () => {
  try {
    await git.pull();
    return { success: true, message: 'Repository synchronized successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Store operations
ipcMain.handle('store-set', async (event, { key, value }) => {
  if (!store) return { success: false, message: 'Store not initialized' };
  store.set(key, value);
  return { success: true };
});

ipcMain.handle('store-get', async (event, { key }) => {
  if (!store) return { success: false, message: 'Store not initialized' };
  return store.get(key);
}); 