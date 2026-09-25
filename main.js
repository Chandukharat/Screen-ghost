const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

let win = null;

// Transparent windows on Linux do not receive mouse input unless these are set
// before ready, and the window is created on a short delay after ready.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('disable-gpu');
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { x, y, width: screenW, height: screenH } = display.workArea;
  const winWidth = 440;
  const winHeight = Math.min(780, Math.max(480, screenH - 32));
  const margin = 16;

  win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: x + screenW - winWidth - margin,
    y: y + margin,
    minWidth: 320,
    minHeight: 420,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: 'Stealth Desk',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // macOS: NSWindow.sharingType = .none
  // Windows: SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
  win.setContentProtection(true);

  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

function registerHotkeys() {
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isVisible()) win.hide();
    else win.show();
  });

  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (!win || win.isDestroyed()) return;
    win.webContents.send('toggle-click-through-hotkey');
  });
}

app.whenReady().then(() => {
  const start = () => {
    if (process.platform === 'darwin' && app.dock) {
      app.dock.hide();
    }
    createWindow();
    registerHotkeys();
  };

  if (process.platform === 'linux') setTimeout(start, 300);
  else start();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.on('set-opacity', (_event, value) => {
  if (!win || win.isDestroyed()) return;
  const opacity = Number(value);
  if (!Number.isFinite(opacity)) return;
  win.setOpacity(Math.min(1, Math.max(0.2, opacity)));
});

ipcMain.on('set-click-through', (_event, enabled) => {
  if (!win || win.isDestroyed()) return;
  const on = Boolean(enabled);
  win.setIgnoreMouseEvents(on, { forward: on });
});

ipcMain.on('minimize-window', () => {
  if (!win || win.isDestroyed()) return;
  win.minimize();
});

ipcMain.on('close-window', () => {
  if (!win || win.isDestroyed()) return;
  win.close();
});
