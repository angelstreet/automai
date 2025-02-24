# Desktop Implementation Guide

This guide explains how to use the desktop functionality in AutomAI, which allows the Next.js web application to run as a desktop application using Electron while maintaining a single codebase.

## Table of Contents
1. [Installation](#installation)
2. [Project Structure](#project-structure)
3. [Development and Building](#development-and-building)
4. [Using Desktop Features](#using-desktop-features)
5. [Important Notes](#important-notes)

## Installation

Add the necessary Electron dependencies to your project:

```bash
npm install --save-dev electron electron-builder concurrently wait-on
npm install electron-store simple-git
```

## Project Structure

The desktop implementation consists of several key files:

### 1. Electron Main Process (`electron/main.js`)
- Handles the main Electron process
- Creates and manages the application window
- Sets up IPC (Inter-Process Communication) handlers for:
  - Python script execution
  - Git operations
  - Local storage operations

### 2. Electron Environment Detection (`src/utils/isElectron.ts`)
- Utility function to detect if the app is running in Electron
- Used for conditional rendering of desktop-specific features

### 3. Electron API Wrapper (`src/utils/electronApi.ts`)
- TypeScript wrapper for Electron IPC communication
- Provides type-safe interfaces for desktop features
- Handles errors and provides consistent response format

## Development and Building

### Scripts in package.json

```json
{
  "scripts": {
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron electron/main.js\"",
    "electron-build": "next build && electron-builder",
    "electron-pack": "npm run build && electron-builder -c.extraMetadata.main=electron/main.js"
  }
}
```

### Development Mode
To run the application in development mode:
```bash
npm run electron-dev
```
This will:
1. Start the Next.js development server
2. Wait for the server to be ready
3. Launch the Electron application

### Building for Production
To build the desktop application for distribution:
```bash
npm run electron-pack
```
This will:
1. Build the Next.js application
2. Package it with Electron for distribution
3. Output the packaged application to the `dist` directory

## Using Desktop Features

### Example Component Usage

```typescript
import { runPython, syncGit, store } from '@/utils/electronApi';
import isElectron from '@/utils/isElectron';

const YourComponent = () => {
  const handlePythonExecution = async () => {
    const result = await runPython('your_script.py');
    if (result.success) {
      console.log('Python output:', result.data);
    } else {
      console.error('Error:', result.message);
    }
  };

  const handleGitSync = async () => {
    const result = await syncGit();
    if (result.success) {
      console.log('Git sync successful');
    } else {
      console.error('Git sync failed:', result.message);
    }
  };

  return (
    <div>
      {isElectron() && (
        <>
          <button onClick={handlePythonExecution}>Run Python Script</button>
          <button onClick={handleGitSync}>Sync Git Repository</button>
        </>
      )}
    </div>
  );
};
```

### Available Desktop Features

1. **Python Execution**
   ```typescript
   const result = await runPython('script.py');
   ```

2. **Git Synchronization**
   ```typescript
   const result = await syncGit();
   ```

3. **Local Storage**
   ```typescript
   await store.set('key', value);
   const value = await store.get('key');
   ```

## Important Notes

1. **Feature Availability**
   - Desktop features (Python execution, Git sync, local storage) are only available when running in Electron
   - The app continues to work as a web application when accessed through a browser
   - Use `isElectron()` to conditionally render desktop-specific features

2. **Response Format**
   All desktop operations return a consistent response format:
   ```typescript
   interface IPCResponse<T> {
     success: boolean;
     message?: string;
     data?: T;
   }
   ```

3. **Error Handling**
   - All desktop operations include built-in error handling
   - Failed operations return `{ success: false, message: 'error message' }`
   - Successful operations return `{ success: true, data: result }`

4. **Security Considerations**
   - The desktop app runs with Node.js integration enabled
   - Be cautious when executing Python scripts or Git commands
   - Validate and sanitize all inputs before execution

5. **Cross-Platform Compatibility**
   - The application can be built for Windows, macOS, and Linux
   - Build configuration is specified in `package.json`
   - Ensure Python and Git are installed on target machines

## Troubleshooting

1. **Python Execution Issues**
   - Ensure Python is installed and accessible in the system PATH
   - Check script paths are correct and accessible

2. **Git Sync Issues**
   - Verify Git is installed and configured
   - Check repository permissions and authentication

3. **Development Mode Issues**
   - Ensure Next.js server is running on port 3000
   - Check for console errors in both Next.js and Electron windows

## Running Web and Desktop Simultaneously

### Setup Different Ports

1. For the web version, keep the default port (3000)
2. For the Electron version, create a new script in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "electron-dev": "concurrently \"next dev -p 3001\" \"wait-on http://localhost:3001 && cross-env ELECTRON_PORT=3001 electron electron/main.js\"",
  }
}
```

### Handling Authentication Callbacks

When running both versions, you need to handle OAuth callbacks properly. Update the Electron main process (`electron/main.js`):

```javascript
const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.ELECTRON_PORT || 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load the app with the correct port
  const startURL = isDev
    ? `http://localhost:${PORT}`
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(startURL);

  // Handle OAuth callbacks
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.includes('/api/auth/callback')) {
      event.preventDefault();
      mainWindow.loadURL(`http://localhost:${PORT}${new URL(url).pathname}${new URL(url).search}`);
    }
  });
}
```

### Environment Configuration

Create separate `.env` files for web and desktop:

1. `.env.web`:
```env
NEXTAUTH_URL=http://localhost:3000
// ... other env variables ...
```

2. `.env.desktop`:
```env
NEXTAUTH_URL=http://localhost:3001
// ... other env variables ...
```

### Running Both Versions

1. Start the web version:
```bash
npm run dev
```

2. In a separate terminal, start the desktop version:
```bash
npm run electron-dev
```

### Authentication Flow

1. **Web Version (Port 3000)**
   - OAuth callbacks will use: `http://localhost:3000/api/auth/callback/{provider}`
   - Configure this URL in your OAuth provider settings

2. **Desktop Version (Port 3001)**
   - OAuth callbacks will use: `http://localhost:3001/api/auth/callback/{provider}`
   - Add this as an additional callback URL in your OAuth provider settings

### Important Notes

1. **OAuth Provider Configuration**
   - Make sure to add both callback URLs to your OAuth provider settings:
     - `http://localhost:3000/api/auth/callback/{provider}`
     - `http://localhost:3001/api/auth/callback/{provider}`

2. **Session Management**
   - Sessions are managed separately for each port
   - Users will need to log in separately for web and desktop versions

3. **Development Considerations**
   - API calls should use relative paths to automatically use the correct port
   - Use `window.location.origin` for dynamic base URL construction
   - Test authentication flows on both versions when making changes

4. **Production Build**
   - In production, the desktop app will use its own bundled server
   - OAuth callbacks will be handled differently in production (using custom protocol handlers)
