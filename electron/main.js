const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.ELECTRON_PORT || 3000;
const { exec, spawn } = require('child_process');
const simpleGit = require('simple-git');
const http = require('http');
const fs = require('fs');
const os = require('os');

let mainWindow;
let store;
let nextProcess;

// Filter out non-critical DevTools errors
function filterDevToolsErrors(level, message) {
  const ignoredErrors = [
    'Autofill.enable',
    'Autofill.setAddresses',
    'chrome.autofillPrivate'
  ];
  
  return !ignoredErrors.some(error => message.includes(error));
}

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

async function checkNextJsHealth() {
  return new Promise((resolve) => {
    console.log(`Checking Next.js health at http://localhost:${PORT}`);
    http.get(`http://localhost:${PORT}/api/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('Next.js health check response:', {
          statusCode: res.statusCode,
          data: data
        });
        resolve(res.statusCode === 200);
      });
    }).on('error', (err) => {
      console.log('Next.js health check failed:', err.message);
      resolve(false);
    });
  });
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    console.log(`Checking if port ${port} is in use...`);
    const testServer = http.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use`);
          resolve(true);
        } else {
          console.log(`Port check error:`, err.message);
          resolve(false);
        }
      })
      .once('listening', () => {
        testServer.close();
        console.log(`Port ${port} is free`);
        resolve(false);
      })
      .listen(port);
  });
}

// macOS permissions check
async function checkMacPermissions() {
  if (process.platform === 'darwin') {
    console.log('Running detailed macOS permission checks...');
    
    // Ensure electron user directory exists
    const electronUserDir = path.join(os.homedir(), '.electron');
    try {
      await fs.promises.mkdir(electronUserDir, { recursive: true });
      console.log('✅ Created/verified ~/.electron directory');
    } catch (error) {
      console.error('❌ Failed to create ~/.electron directory:', error);
    }

    const checks = [
      {
        name: 'App Directory',
        path: app.getAppPath(),
        required: ['read', 'write'],
        create: false
      },
      {
        name: 'User Data',
        path: app.getPath('userData'),
        required: ['read', 'write'],
        create: true
      },
      {
        name: 'Project Root',
        path: process.cwd(),
        required: ['read', 'write'],
        create: false
      },
      {
        name: '.next Directory',
        path: path.join(process.cwd(), '.next'),
        required: ['read', 'write'],
        create: true
      },
      {
        name: 'electron Directory',
        path: path.join(process.cwd(), 'electron'),
        required: ['read', 'write'],
        create: false
      },
      {
        name: 'src Directory',
        path: path.join(process.cwd(), 'src'),
        required: ['read', 'write'],
        create: false
      }
    ];

    let hasErrors = false;
    const errors = [];

    for (const check of checks) {
      try {
        console.log(`\nChecking ${check.name} at: ${check.path}`);
        
        // Check if path exists
        try {
          await fs.promises.access(check.path);
          console.log(`✅ ${check.name} exists`);
        } catch (error) {
          if (error.code === 'ENOENT' && check.create) {
            console.log(`📝 Creating ${check.name}...`);
            await fs.promises.mkdir(check.path, { recursive: true, mode: 0o755 });
            console.log(`✅ Created ${check.name}`);
          } else {
            throw error;
          }
        }

        // Get stats for detailed info
        const stats = await fs.promises.stat(check.path);
        const mode = stats.mode.toString(8);
        const uid = stats.uid;
        const gid = stats.gid;
        
        console.log(`📊 Permissions: ${mode}`);
        console.log(`👤 Owner: ${uid}:${gid}`);

        // Verify read permission
        try {
          await fs.promises.access(check.path, fs.constants.R_OK);
          console.log(`✅ Read permission OK`);
        } catch (error) {
          throw new Error(`No read permission: ${error.message}`);
        }

        // Verify write permission
        try {
          await fs.promises.access(check.path, fs.constants.W_OK);
          console.log(`✅ Write permission OK`);
        } catch (error) {
          throw new Error(`No write permission: ${error.message}`);
        }

      } catch (error) {
        hasErrors = true;
        errors.push(`${check.name}: ${error.message}`);
        console.error(`❌ Error checking ${check.name}:`, error.message);
      }
    }

    if (hasErrors) {
      const errorMessage = 'Permission issues detected:\n\n' + 
        errors.join('\n\n') + 
        '\n\nTry running these commands:\n' +
        `sudo chown -R $(whoami) "${process.cwd()}"\n` +
        `chmod -R u+rw "${process.cwd()}"`;
      
      dialog.showErrorBox('Permission Issues', errorMessage);
      throw new Error('Permission check failed');
    }

    console.log('\n✅ All permission checks passed');
  }
}

async function startNextServer() {
  console.log('Starting Next.js server check sequence...');
  
  try {
    const portInUse = await isPortInUse(PORT);
    if (portInUse) {
      console.log(`Port ${PORT} is in use, checking if Next.js is responding...`);
      const isHealthy = await checkNextJsHealth();
      if (isHealthy) {
        console.log('Next.js server is running and healthy');
        return Promise.resolve();
      } else {
        console.log('Port is in use but Next.js is not responding properly');
        // On macOS, try to kill the existing process
        if (process.platform === 'darwin') {
          try {
            await exec(`lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
            console.log(`Killed existing process on port ${PORT}`);
          } catch (error) {
            console.error('Failed to kill existing process:', error);
          }
        }
      }
    }

    console.log('Starting new Next.js server...');
    nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        PATH: process.env.PATH,
        // Ensure npm can find node on macOS
        NODE_PATH: process.execPath
      }
    });

    nextProcess.on('error', (error) => {
      console.error('Failed to start Next.js:', error);
      dialog.showErrorBox(
        'Server Start Error',
        `Failed to start Next.js server: ${error.message}`
      );
    });

    // Return a promise that resolves when the server is ready
    return new Promise((resolve) => {
      async function checkServer() {
        const isHealthy = await checkNextJsHealth();
        if (isHealthy) {
          console.log('New Next.js server is ready');
          resolve();
        } else {
          console.log('Waiting for Next.js server to be ready...');
          setTimeout(checkServer, 1000);
        }
      }
      
      setTimeout(checkServer, 1000);
    });
  } catch (error) {
    console.error('Error in startNextServer:', error);
    dialog.showErrorBox(
      'Server Error',
      'Failed to start or connect to Next.js server. Check your permissions and try again.'
    );
    throw error;
  }
}

async function createWindow() {
  try {
    console.log('Creating main window...');
    await initializeStore();

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        sandbox: false,
        devTools: true,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false,
      backgroundColor: '#FFFFFF'
    });

    // Set CSP headers
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            isDev 
              ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* data: devtools://*;"
              : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
          ]
        }
      });
    });

    // Configure console message handling
    mainWindow.webContents.on('console-message', (event, level, message) => {
      if (filterDevToolsErrors(level, message)) {
        const levels = ['debug', 'info', 'warning', 'error'];
        console.log(`[Web Console] ${levels[level]}: ${message}`);
      }
    });

    const startURL = isDev
      ? `http://localhost:${PORT}`
      : `file://${path.join(__dirname, '../out/index.html')}`;

    console.log(`Loading URL: ${startURL}`);

    let loadSuccess = false;
    
    // Loading sequence events
    mainWindow.webContents.on('did-start-loading', () => {
      console.log('⏳ Content loading started - This is normal');
      loadSuccess = false;
    });

    mainWindow.webContents.on('did-stop-loading', () => {
      console.log(`🛑 Content loading stopped - ${loadSuccess ? 'Successfully' : 'Check for errors'}`);
    });

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('✅ Content finished loading - Application ready');
      loadSuccess = true;
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('❌ Failed to load:', {
        errorCode,
        errorDescription,
        url: validatedURL
      });
      
      // Attempt to reload if it's a temporary error
      if (errorCode === -6) { // ERR_FILE_NOT_FOUND
        console.log('Page not found, waiting for Next.js to be ready...');
        setTimeout(() => {
          console.log('Retrying page load...');
          mainWindow.loadURL(startURL);
        }, 1000);
      }
    });

    mainWindow.webContents.on('crashed', (event, killed) => {
      console.error('💥 Window crashed:', { killed });
      // You might want to reload the window here
      mainWindow.reload();
    });

    mainWindow.on('unresponsive', () => {
      console.error('🚨 Window became unresponsive');
      // You might want to show a dialog to the user here
    });

    mainWindow.on('responsive', () => {
      console.log('✅ Window became responsive again');
    });

    // Open DevTools on start for debugging
    mainWindow.webContents.openDevTools();

    mainWindow.once('ready-to-show', () => {
      console.log('🎯 Window ready to show');
      mainWindow.show();
    });

    mainWindow.webContents.on('page-title-updated', (event, title) => {
      console.log('📑 Page title updated:', title);
    });

    mainWindow.webContents.on('dom-ready', () => {
      console.log('🌳 DOM is ready');
    });

    try {
      await mainWindow.loadURL(startURL);
      console.log('🚀 URL loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load URL:', error);
      // Attempt to reload after a delay
      setTimeout(() => {
        console.log('🔄 Retrying page load...');
        mainWindow.loadURL(startURL);
      }, 2000);
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
    mainWindow.on('close', () => {
      console.log('Window closing');
      if (nextProcess) {
        console.log('Shutting down Next.js server...');
        nextProcess.kill();
      }
    });
  } catch (error) {
    console.error('Error in createWindow:', error);
  }
}

// Log app lifecycle events
app.on('ready', async () => {
  console.log('App is ready');
  try {
    await checkMacPermissions();
    if (isDev) {
      await startNextServer();
    }
    await createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox(
      'Initialization Error',
      'Failed to start the application. Please check permissions and try again.'
    );
    app.quit();
  }
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