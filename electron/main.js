const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.ELECTRON_PORT || 3000;
const { exec } = require('child_process');
const simpleGit = require('simple-git');

let mainWindow;
let store;

async function initializeStore() {
  try {
    console.log('Initializing electron-store...');
    const Store = (await import('electron-store')).default;
    store = new Store();
    console.log('electron-store initialized successfully');
  } catch (error) {
    console.error('Failed to initialize electron-store:', error);
  }
}

async function createWindow() {
  try {
    console.log('Creating main window...');
    // Initialize store before creating window
    await initializeStore();

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: true
      },
      show: false,
      backgroundColor: '#FFFFFF'
    });

    // Load the app with the correct port
    const startURL = isDev
      ? `http://localhost:${PORT}`
      : `file://${path.join(__dirname, '../out/index.html')}`;

    console.log(`Loading URL: ${startURL}`);

    // Add more detailed loading events
    mainWindow.webContents.on('did-start-loading', () => {
      console.log('Content started loading');
    });

    mainWindow.webContents.on('did-stop-loading', () => {
      console.log('Content stopped loading');
    });

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Content finished loading');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', { errorCode, errorDescription });
    });

    // Open DevTools on start for debugging
    mainWindow.webContents.openDevTools();

    // Listen for window ready-to-show
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      mainWindow.show();
    });

    // Add debugging for page title changes
    mainWindow.webContents.on('page-title-updated', (event, title) => {
      console.log('Page title updated:', title);
    });

    // Add debugging for DOM ready
    mainWindow.webContents.on('dom-ready', () => {
      console.log('DOM is ready');
    });

    try {
      await mainWindow.loadURL(startURL);
      console.log('URL loaded successfully');
    } catch (error) {
      console.error('Failed to load URL:', error);
    }

    // Handle OAuth callbacks
    mainWindow.webContents.on('will-navigate', (event, url) => {
      console.log('Navigation requested to:', url);
      if (url.includes('/api/auth/callback')) {
        event.preventDefault();
        mainWindow.loadURL(`http://localhost:${PORT}${new URL(url).pathname}${new URL(url).search}`);
      }
    });

    // Add window state logging
    mainWindow.on('show', () => console.log('Window shown'));
    mainWindow.on('hide', () => console.log('Window hidden'));
    mainWindow.on('close', () => console.log('Window closing'));
  } catch (error) {
    console.error('Error in createWindow:', error);
  }
}

// Log app lifecycle events
app.on('ready', () => {
  console.log('App is ready');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('run-python', async (event, script) => {
  console.log('Running Python script:', script);
  return new Promise((resolve, reject) => {
    exec(`python ${script}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Python script error:', error);
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
    console.log('Starting git sync');
    await git.pull();
    return { success: true, message: 'Repository synchronized successfully' };
  } catch (error) {
    console.error('Git sync error:', error);
    return { success: false, message: error.message };
  }
});

// Store operations
ipcMain.handle('store-set', async (event, { key, value }) => {
  if (!store) return { success: false, message: 'Store not initialized' };
  try {
    store.set(key, value);
    return { success: true };
  } catch (error) {
    console.error('Store set error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('store-get', async (event, { key }) => {
  if (!store) return { success: false, message: 'Store not initialized' };
  try {
    return store.get(key);
  } catch (error) {
    console.error('Store get error:', error);
    return { success: false, message: error.message };
  }
}); 