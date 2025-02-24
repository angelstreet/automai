# Next.js Web-to-Desktop App Integration

## Summary
Integration of Next.js React web app with Electron for desktop functionality, featuring shared server capabilities, Python execution, and Git synchronization. The implementation allows both web and desktop versions to coexist and evolve together, with smart server management that can either use an existing Next.js server or start a new one.

## Implementation Details

### 1. Project Setup
- **Dependencies**:
  ```bash
  npm install --save-dev electron electron-builder cross-env
  npm install electron-store simple-git
  ```

### 2. Core Implementation

#### Main Process (electron/main.js)
```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.ELECTRON_PORT || 3000;
const { exec, spawn } = require('child_process');
const simpleGit = require('simple-git');
const http = require('http');

let mainWindow;
let store;
let nextProcess;

// Server detection and management
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const testServer = http.createServer()
      .once('error', (err) => {
        resolve(err.code === 'EADDRINUSE');
      })
      .once('listening', () => {
        testServer.close();
        resolve(false);
      })
      .listen(port);
  });
}

async function startNextServer() {
  const portInUse = await isPortInUse(PORT);
  if (portInUse) {
    console.log(`Port ${PORT} in use, using existing Next.js server`);
    return Promise.resolve();
  }

  nextProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });

  return new Promise((resolve) => {
    function checkServer() {
      http.get(`http://localhost:${PORT}`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(checkServer, 1000);
        }
      }).on('error', () => setTimeout(checkServer, 1000));
    }
    setTimeout(checkServer, 1000);
  });
}
```

### 3. Development Workflow

#### Option 1: Shared Server Mode
```bash
# Terminal 1: Start Next.js for web development
npm run dev

# Terminal 2: Start Electron (will use existing Next.js server)
npm run electron-dev
```

#### Option 2: Standalone Mode
```bash
# Single command (will start Next.js if needed)
npm run electron-dev
```

### 4. Features

#### Store Management
```javascript
// Initialize electron-store
async function initializeStore() {
  const Store = (await import('electron-store')).default;
  store = new Store();
}

// IPC handlers for store operations
ipcMain.handle('store-set', async (event, { key, value }) => {
  if (!store) return { success: false, message: 'Store not initialized' };
  try {
    store.set(key, value);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('store-get', async (event, { key }) => {
  if (!store) return { success: false, message: 'Store not initialized' };
  try {
    return store.get(key);
  } catch (error) {
    return { success: false, message: error.message };
  }
});
```

#### Python Execution
```javascript
ipcMain.handle('run-python', async (event, script) => {
  return new Promise((resolve, reject) => {
    exec(`python ${script}`, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
});
```

#### Git Synchronization
```javascript
const git = simpleGit();
ipcMain.handle('git-sync', async () => {
  try {
    await git.pull();
    return { success: true, message: 'Repository synchronized' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
```

### 5. Building for Distribution

```bash
# Build the application
npm run electron-pack
```

This will:
1. Build the Next.js application
2. Package everything with electron-builder
3. Output to the `dist` directory

### 6. Important Notes

- The application automatically detects if a Next.js server is running on port 3000
- In development, you can work on both web and desktop versions simultaneously
- The desktop app will manage the Next.js server lifecycle automatically
- All IPC operations (Python, Git, Store) are only available in the desktop version
- OAuth callbacks are handled appropriately in both web and desktop contexts
- Extensive logging is implemented for debugging purposes

### 7. Requirements

- Node.js and npm
- Python (for Python script execution)
- Git (for repository synchronization)
- Electron dependencies based on the target platform

### 8. Debugging

The application includes comprehensive logging:
- Server status and port detection
- Window lifecycle events
- Content loading states
- IPC operations
- OAuth navigation

DevTools are automatically opened in development mode for debugging.