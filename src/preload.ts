import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process (React app)
// to communicate with the main process via IPC invoke/handle.
contextBridge.exposeInMainWorld('electronAPI', {
  loadDemos: (): Promise<any[]> => ipcRenderer.invoke('load-demos'),
  launchDemo: (demoId: string): Promise<{ status: string; message: string }> =>
    ipcRenderer.invoke('launch-demo', demoId),
});