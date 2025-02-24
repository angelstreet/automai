Below is a concise Markdown document outlining your goal (turning a Next.js web app into a desktop app with shared evolution, Python execution, and Git sync) and how to achieve it using Electron. It starts with a short summary, followed by detailed instructions an AI agent could execute.
markdown
# Next.js Web-to-Desktop App Conversion

## Summary
Convert an existing Next.js React web app (with Prisma, Google/GitHub auth, Python execution, and Git sync) into a desktop app using Electron, ensuring a single codebase evolves for both platforms. Electron will run the Next.js app dynamically, with desktop features (Python, Git) handled via IPC, activated only in Electron.

## Detailed Instructions for AI Agent

### 1. Project Setup
- **Objective**: Integrate Electron into the existing Next.js project.
- **Steps**:
  1. In the project root, install dependencies:
     ```
     npm install --save-dev electron electron-builder concurrently
     npm install next simple-git electron-store
     ```
  2. Create `electron/main.js` with:
     ```javascript
     const { app, BrowserWindow, ipcMain } = require('electron');
     const next = require('next');
     const { exec } = require('child_process');
     const simpleGit = require('simple-git');
     const git = simpleGit();
     const dev = process.env.NODE_ENV !== 'production';
     const nextApp = next({ dev });
     const handle = nextApp.getRequestHandler();

     let win;

     app.on('ready', async () => {
       await nextApp.prepare();
       win = new BrowserWindow({ width: 800, height: 600 });
       win.loadURL('http://localhost:3000');
       win.on('closed', () => app.quit());
     });

     const server = require('http').createServer((req, res) => handle(req, res));
     server.listen(3000);

     ipcMain.handle('run-python', async (event, script) => {
       return new Promise((resolve, reject) => {
         exec(`python ${script}`, (err, stdout) => (err ? reject(err) : resolve(stdout)));
       });
     });

     ipcMain.handle('git-sync', async () => {
       await git.pull();
       return 'Repo synced';
     });
     ```
  3. Update `package.json` scripts:
     ```json
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "electron": "electron electron/main.js",
       "desktop": "npm run build && npm run electron",
       "pack": "npm run build && electron-builder"
     }
     ```
  4. Add Electron build config to `package.json`:
     ```json
     "build": {
       "extends": null,
       "files": ["electron/**/*", "out/**/*"],
       "directories": { "output": "dist" }
     }
     ```

### 2. Platform Detection
- **Objective**: Enable conditional logic for web vs. desktop.
- **Steps**:
  1. Create `lib/isElectron.js`:
     ```javascript
     const isElectron = () => typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
     module.exports = isElectron;
     ```
  2. Test it in `pages/index.js`:
     ```javascript
     import isElectron from '../lib/isElectron';
     export default function Home() {
       return <div>{isElectron() ? 'Desktop' : 'Web'}</div>;
     }
     ```

### 3. Desktop Features Integration
- **Objective**: Add Python execution and Git sync, accessible only in Electron.
- **Steps**:
  1. Create `lib/electronApi.js`:
     ```javascript
     const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

     export const runPython = async (script) => {
       if (ipcRenderer) return ipcRenderer.invoke('run-python', script);
       return 'Python not available';
     };

     export const syncGit = async () => {
       if (ipcRenderer) return ipcRenderer.invoke('git-sync');
       return 'Git sync not available';
     };
     ```
  2. Add to a component (e.g., `pages/tools.js`):
     ```javascript
     import { runPython, syncGit } from '../lib/electronApi';

     export default function Tools() {
       const handlePython = async () => console.log(await runPython('script.py'));
       const handleGit = async () => console.log(await syncGit());
       return (
         <div>
           <button onClick={handlePython}>Run Python</button>
           <button onClick={handleGit}>Sync Git</button>
         </div>
       );
     }
     ```

### 4. Backend Compatibility
- **Objective**: Ensure Prisma and auth work across platforms.
- **Steps**:
  1. Modify `prisma/index.js` for local SQLite in Electron:
     ```javascript
     const { PrismaClient } = require('@prisma/client');
     const prisma = new PrismaClient({
       datasources: {
         db: { url: process.env.IS_ELECTRON ? 'file:./app.db' : process.env.DATABASE_URL },
       },
     });
     module.exports = prisma;
     ```
  2. Set `IS_ELECTRON` in `electron/main.js` before Next.js prep:
     ```javascript
     process.env.IS_ELECTRON = 'true';
     ```
  3. Keep auth in Next.js API routes (e.g., `/api/auth/[...nextauth]`), using Electron’s BrowserWindow for OAuth redirects if needed.

### 5. Testing & Packaging
- **Objective**: Verify and distribute the app.
- **Steps**:
  1. Test web: `npm run dev`
  2. Test desktop: `npm run desktop`
  3. Package: `npm run pack` (outputs to `dist/`)

### Notes
- Web app runs as usual; Electron runs the same Next.js instance.
- Update Next.js code normally—desktop inherits changes.
- Ensure Python and Git are installed on target machines or bundle them.