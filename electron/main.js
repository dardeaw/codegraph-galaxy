const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;
const DEFAULT_PORT = 5001;

function checkServerReady(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/projects`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startPythonBackend(port) {
  const isAlreadyRunning = await checkServerReady(port);
  if (isAlreadyRunning) {
    console.log(`[CodeGraph] Python backend is already running on port ${port}`);
    return;
  }

  const appPyPath = path.join(__dirname, '..', 'app.py');
  console.log(`[CodeGraph] Launching Python backend daemon on port ${port}...`);

  pythonProcess = spawn('python', [appPyPath, '-p', port.toString(), '-H', '127.0.0.1'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
    windowsHide: true
  });

  pythonProcess.on('error', (err) => {
    console.error('[CodeGraph] Failed to spawn Python backend:', err);
  });

  // Wait for server to become responsive
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 300));
    if (await checkServerReady(port)) {
      console.log('[CodeGraph] Python backend successfully ready!');
      return;
    }
  }
}

function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    title: 'Code Graph Galaxy - Multi-Project Architecture Topology',
    backgroundColor: '#090d13',
    darkTheme: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webgl: true
    }
  });

  // Build sleek application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Manage Repositories...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.executeJavaScript('openPathModal()')
        },
        {
          label: 'Sync from CodeGraph',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.executeJavaScript('document.getElementById("btn-sync")?.click()')
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit Code Graph Galaxy' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Refresh View', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R' },
        { type: 'separator' },
        {
          label: 'Reset Camera View',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow.webContents.executeJavaScript('document.getElementById("btn-reset-cam")?.click()')
        },
        {
          label: 'Toggle Auto Rotate',
          accelerator: 'CmdOrCtrl+Space',
          click: () => mainWindow.webContents.executeJavaScript('document.getElementById("btn-rotate")?.click()')
        },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' },
        { role: 'toggleDevTools', label: 'Developer Tools' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GitHub Documentation',
          click: () => shell.openExternal('https://github.com/your-org/codegraph-viz')
        },
        {
          label: 'About Code Graph Galaxy',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Code Graph Galaxy',
              message: 'Code Graph Galaxy Topology Visualizer',
              detail: 'Next-Generation Multi-Project Codebase Architecture & AST Topology Explorer.\nBuilt with Three.js, WebGL & Electron.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for native OS folder picker
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Project Directory to Scan & Index'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

app.whenReady().then(async () => {
  const targetPort = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;
  await startPythonBackend(targetPort);
  createMainWindow(targetPort);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(targetPort);
    }
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    try {
      pythonProcess.kill();
    } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
