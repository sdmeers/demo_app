// src/main.ts
import { app, BrowserWindow, ipcMain, Menu } from 'electron'; // Import Menu
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

// Define path to demos.json
// const isDev = !app.isPackaged;
// const demosFilePath = isDev
//   ? path.join(app.getAppPath(), 'demos.json')
//   : path.join(process.resourcesPath, 'app', 'demos.json'); // Ensure build copies this
const isDev = !app.isPackaged;
const demosFilePath = isDev
  ? path.join(app.getAppPath(), 'demos.json') // Path in development (usually project root)
  : path.join(process.resourcesPath, 'demos.json'); // Assume it's directly in resources path

// Function to load demos
async function loadDemosFromFile() {
  console.log(`Attempting to load demos from: ${demosFilePath}`);
  try {
    const data = await fs.readFile(demosFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading or parsing ${demosFilePath}:`, error);
    return [];
  }
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // --- Remove the menu bar ---
  mainWindow.setMenu(null);
  // --- End Remove Menu Bar ---


  // Load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

// (Keep the rest of the file the same - app.whenReady(), IPC handlers, etc.)

app.whenReady().then(() => {
  // Set up IPC handlers
  ipcMain.handle('load-demos', async () => {
    return await loadDemosFromFile();
  });

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
    const name = demoToLaunch.name || demoId;

    if (!command) {
      console.error(`IPC: No command specified for demo: ${demoId}`);
      return { status: 'error', message: 'No command specified for this demo' };
    }

    if (launchType === 'unknown') {
       console.error(`IPC: Unknown launch type for demo: ${demoId}`);
       return { status: 'error', message: `Unknown launch type: ${launchType}` };
    }

    console.log(`IPC: Attempting to launch "${name}" (Type: ${launchType}) using spawn`);
    console.log(`IPC: Command: ${command}`);

    try {
      // Use spawn for scripts, videos, docker, and now URLs (via direct browser call)
      const spawnOptions: any = {
        stdio: 'inherit', // Show output/errors in terminal
        shell: true // Use shell to handle complex commands
      };

      console.log(`IPC: Spawning command with options:`, spawnOptions);
      const child = spawn(command, [], spawnOptions);

      child.on('error', (spawnError) => {
        console.error(`IPC: Failed to start subprocess for ${demoId} (${name}). Error: ${spawnError.message}`);
      });

      child.on('close', (code) => {
        console.log(`IPC: Subprocess for ${demoId} (${name}) closed with code ${code}`);
      });

      console.log(`IPC: Spawn command initiated for ${demoId} (${name})`);
      return { status: 'success', message: `Launch command initiated via spawn for ${demoId}` };

    } catch (error) {
      console.error(`IPC: General error launching demo ${demoId} (${name}):`, error);
      return { status: 'error', message: `Failed to launch demo: ${error.message || error}` };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});