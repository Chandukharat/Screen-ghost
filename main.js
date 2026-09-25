const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

const windowsByDisplay = new Map();
let opacity = 0.9;
let clickThrough = false;
let quitting = false;
let closingForDisplayChange = false;

// Transparent windows on Linux do not receive mouse input unless these are set
// before ready, and the window is created on a short delay after ready.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('disable-gpu');
}

function eachWindow(fn) {
  for (const win of windowsByDisplay.values()) {
    if (!win.isDestroyed()) fn(win);
  }
}

function topRightPosition(display, width) {
  const margin = 16;
  const area = display.workArea;
  return {
    x: Math.round(area.x + area.width - width - margin),
    y: Math.round(area.y + margin),
  };
}

function pinToEveryWorkspace(win) {
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setFullScreenable(false);
}

function applySharedState(win) {
  if (!win || win.isDestroyed()) return;
  win.setOpacity(opacity);
  win.setIgnoreMouseEvents(clickThrough, { forward: clickThrough });
  win.webContents.send('opacity-changed', opacity);
  win.webContents.send('click-through-changed', clickThrough);
}

function broadcastState() {
  eachWindow((win) => {
    win.setOpacity(opacity);
    win.setIgnoreMouseEvents(clickThrough, { forward: clickThrough });
    win.webContents.send('opacity-changed', opacity);
    win.webContents.send('click-through-changed', clickThrough);
  });
}

function createWindowForDisplay(display) {
  const existing = windowsByDisplay.get(display.id);
  if (existing && !existing.isDestroyed()) return existing;

  const area = display.workArea;
  const winWidth = 440;
  const winHeight = Math.min(780, Math.max(480, area.height - 32));
  const position = topRightPosition(display, winWidth);

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: position.x,
    y: position.y,
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

  windowsByDisplay.set(display.id, win);

  // macOS: NSWindow.sharingType = .none
  // Windows: SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
  win.setContentProtection(true);
  pinToEveryWorkspace(win);

  win.on('show', () => pinToEveryWorkspace(win));

  win.on('closed', () => {
    if (windowsByDisplay.get(display.id) === win) windowsByDisplay.delete(display.id);
  });

  win.on('close', () => {
    if (quitting || closingForDisplayChange) return;
    quitting = true;
    app.quit();
  });

  win.webContents.on('did-finish-load', () => applySharedState(win));

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  return win;
}

function syncDisplays() {
  const displays = screen.getAllDisplays();
  const liveIds = new Set(displays.map((display) => display.id));

  for (const [displayId, win] of windowsByDisplay) {
    if (liveIds.has(displayId)) continue;
    windowsByDisplay.delete(displayId);
    if (!win.isDestroyed()) {
      closingForDisplayChange = true;
      win.close();
      closingForDisplayChange = false;
    }
  }

  displays.forEach((display) => createWindowForDisplay(display));
}

function repositionWindow(display) {
  const win = windowsByDisplay.get(display.id);
  if (!win || win.isDestroyed()) {
    createWindowForDisplay(display);
    return;
  }
  const bounds = win.getBounds();
  const position = topRightPosition(display, bounds.width);
  win.setPosition(position.x, position.y);
  pinToEveryWorkspace(win);
}

function registerHotkeys() {
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    const anyVisible = Array.from(windowsByDisplay.values()).some((win) => !win.isDestroyed() && win.isVisible());
    eachWindow((win) => {
      if (anyVisible) win.hide();
      else {
        win.show();
        pinToEveryWorkspace(win);
      }
    });
  });

  globalShortcut.register('CommandOrControl+Shift+C', () => {
    clickThrough = !clickThrough;
    broadcastState();
  });
}

app.whenReady().then(() => {
  const start = () => {
    if (process.platform === 'darwin' && app.dock) {
      app.dock.hide();
    }
    syncDisplays();
    registerHotkeys();
    screen.on('display-added', syncDisplays);
    screen.on('display-removed', syncDisplays);
    screen.on('display-metrics-changed', (_event, display) => repositionWindow(display));
  };

  if (process.platform === 'linux') setTimeout(start, 300);
  else start();
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.on('request-window-state', (event) => {
  event.sender.send('opacity-changed', opacity);
  event.sender.send('click-through-changed', clickThrough);
});

ipcMain.on('set-opacity', (_event, value) => {
  const next = Number(value);
  if (!Number.isFinite(next)) return;
  opacity = Math.min(1, Math.max(0.2, next));
  broadcastState();
});

ipcMain.on('set-click-through', (_event, enabled) => {
  clickThrough = Boolean(enabled);
  broadcastState();
});

ipcMain.on('minimize-window', () => {
  eachWindow((win) => win.minimize());
});

ipcMain.on('close-window', () => {
  quitting = true;
  app.quit();
});
