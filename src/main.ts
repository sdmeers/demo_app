import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs/promises'; // Use promises for async file reading
import { spawn } from 'child_process'; // Use spawn for non-blocking process launch

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// --- Define path to demos.json ---
// Need to adjust path depending on whether running in dev or packaged app
const isDev = !app.isPackaged;
const demosFilePath = isDev
  ? path.join(app.getAppPath(), 'demos.json') // In dev, it's usually in project root
  : path.join(process.resourcesPath, 'app', 'demos.json'); // In packaged app, it might be here (needs build config)
  // **IMPORTANT**: Ensure demos.json is copied to the packaged app's resources/app folder.
  // You might need to configure electron-forge (e.g., in forge.config.js) to copy extra resources.

// --- Function to load demos ---
async function loadDemosFromFile() {
  console.log(`Attempting to load demos from: ${demosFilePath}`);
  try {
    const data = await fs.readFile(demosFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading or parsing ${demosFilePath}:`, error);
    return []; // Return empty array on error
  }
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Use the preload script
      contextIsolation: true, // Recommended for security
      nodeIntegration: false, // Recommended for security
    },
  });

  // Load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Open the DevTools in development.
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // --- Set up IPC handlers ---

  // Handler to load demos
  ipcMain.handle('load-demos', async () => {
    return await loadDemosFromFile();
  });

  // Handler to launch a demo
  ipcMain.handle('launch-demo', async (event, demoId) => {
    console.log(`IPC: Received launch request for demo ID: ${demoId}`);
    const demos = await loadDemosFromFile();
    const demoToLaunch = demos.find(demo => demo.id === demoId);

    if (!demoToLaunch) {
      console.error(`IPC: Demo ID not found: ${demoId}`);
      return { status: 'error', message: 'Demo ID not found' };
    }

    const launchType = demoToLaunch.launch_type || 'unknown';
    const command = demoToLaunch.command;

    if (!command) {
      console.error(`IPC: No command specified for demo: ${demoId}`);
      return { status: 'error', message: 'No command specified for this demo' };
    }

    console.log(`IPC: Attempting to launch "${demoToLaunch.name}" (Type: ${launchType})`);
    console.log(`IPC: Command: ${command}`);

    try {
      if (launchType === 'url') {
        await shell.openExternal(command); // Use Electron's safe URL opener
        console.log(`IPC: Opened URL: ${command}`);
        return { status: 'success', message: `Opened URL for ${demoId}` };
      } else if (['script', 'video', 'docker'].includes(launchType)) {
        // Use spawn for external processes. Shell=true can be a security risk
        // but might be necessary for complex commands or paths with spaces.
        // Detached=true and stdio='ignore' attempts to launch and forget.
        const child = spawn(command, [], { detached: true, stdio: 'ignore', shell: true });

        child.on('error', (err) => {
          console.error(`IPC: Error spawning process for ${demoId}:`, err);
          // We can't easily return this error asynchronously via handle,
          // but we log it on the main process side.
        });

        child.unref(); // Allow the main Electron app to exit even if the child is running

        console.log(`IPC: Initiated command via spawn for ${demoId}`);
        return { status: 'success', message: `Launch command initiated for ${demoId}` };
      } else {
        console.error(`IPC: Unknown launch type: ${launchType}`);
        return { status: 'error', message: `Unknown launch type: ${launchType}` };
      }
    } catch (error) {
      console.error(`IPC: Error launching demo ${demoId}:`, error);
      return { status: 'error', message: `Failed to launch demo: ${error.message || error}` };
    }
  });

  // --- Create main window ---
  createWindow();

  // Handle macOS activation
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});