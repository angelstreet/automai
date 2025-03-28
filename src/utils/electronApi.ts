import isElectronModule from 'is-electron';

// Type definitions for IPC communication
interface IPCResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Safe require of electron
const getIpcRenderer = () => {
  if (isElectronModule()) {
    const electron = window.require('electron');
    return electron.ipcRenderer;
  }
  return null;
};

export const runPython = async (script: string): Promise<IPCResponse<string>> => {
  const ipcRenderer = getIpcRenderer();
  if (!ipcRenderer) {
    return { success: false, message: 'Python execution is only available in desktop mode' };
  }
  try {
    const result = await ipcRenderer.invoke('run-python', script);
    return { success: true, data: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, message };
  }
};

export const syncGit = async (): Promise<IPCResponse<string>> => {
  const ipcRenderer = getIpcRenderer();
  if (!ipcRenderer) {
    return { success: false, message: 'Git sync is only available in desktop mode' };
  }
  try {
    const result = await ipcRenderer.invoke('git-sync');
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, message };
  }
};

export const store = {
  set: async <T>(key: string, value: T): Promise<IPCResponse<void>> => {
    const ipcRenderer = getIpcRenderer();
    if (!ipcRenderer) {
      return { success: false, message: 'Local storage is only available in desktop mode' };
    }
    try {
      return await ipcRenderer.invoke('store-set', { key, value });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, message };
    }
  },

  get: async <T>(key: string): Promise<IPCResponse<T>> => {
    const ipcRenderer = getIpcRenderer();
    if (!ipcRenderer) {
      return { success: false, message: 'Local storage is only available in desktop mode' };
    }
    try {
      const value = await ipcRenderer.invoke('store-get', { key });
      return { success: true, data: value };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, message };
    }
  },
};
