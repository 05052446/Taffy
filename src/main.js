const { app, BrowserWindow, ipcMain, Menu, Tray, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let logFile = null;
function log(...args) {
  try {
    if (!logFile) {
      try { logFile = path.join(app.getPath('userData'), 'electron_debug.log'); } catch (e) {}
    }
    if (logFile) {
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${args.join(' ')}\n`);
    } else {
      console.log(...args);
    }
  } catch (e) {}
}

process.on('uncaughtException', (err) => {
  log('Uncaught Exception:', err.stack || err);
});
process.on('unhandledRejection', (err) => {
  log('Unhandled Rejection:', err);
});

log('Electron main script loaded');

let mainWindow = null;
let tray = null;
let currentScale = 1.0;
let currentStateIndex = 0;
let isWalkEnabled = true;

const BASE_WIDTH = 220;
const BASE_HEIGHT = 270;

const STATE_NAMES = [
  '0. 原地待机 (Idle)',
  '1. 向右奔跑 (Run Right)',
  '2. 向左奔跑 (Run Left)',
  '3. 挥手打招呼 (Waving)',
  '4. 开心跳跃 (Jumping)',
  '5. 受挫生气 (Failed)',
  '6. 晃脑发呆 (Waiting)',
  '7. 奋力冲刺 (Sprint)',
  '8. 好奇回头/被抓起 (Review)'
];

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

  const initW = Math.round(BASE_WIDTH * currentScale);
  const initH = Math.round(BASE_HEIGHT * currentScale);
  const initX = Math.round((screenW - initW) / 2);
  const initY = Math.round((screenH - initH) / 2);

  mainWindow = new BrowserWindow({
    width: initW,
    height: initH,
    x: initX,
    y: initY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('index.html loaded successfully');
    mainWindow.webContents.send('change-scale', currentScale);
  });

  mainWindow.webContents.on('did-fail-load', (e, errCode, errDesc, validatedURL) => {
    log('Failed to load:', errCode, errDesc, validatedURL);
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    log(`[Renderer Console] ${message}`);
  });

  mainWindow.on('close', () => {
    log('mainWindow close event');
  });

  mainWindow.on('closed', () => {
    log('mainWindow closed event');
    mainWindow = null;
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  log('loadFile called');
}

function createTray() {
  try {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    const iconPath = path.join(__dirname, '../assets', iconName);
    tray = new Tray(iconPath);
    tray.setToolTip('永雏塔菲 (Taffy) 桌宠');

    updateTrayMenu();

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    log('createTray error:', err);
  }
}

function buildContextMenu() {
  const stateMenuItems = STATE_NAMES.map((name, index) => ({
    label: name,
    type: 'radio',
    checked: currentStateIndex === index,
    click: () => {
      currentStateIndex = index;
      if (mainWindow) mainWindow.webContents.send('change-state', index);
    }
  }));

  const scaleMenuItems = [
    { label: '小 (0.75x)', scale: 0.75 },
    { label: '标准 (1.0x)', scale: 1.0 },
    { label: '中等 (1.25x)', scale: 1.25 },
    { label: '特大 (1.5x)', scale: 1.5 }
  ].map(item => ({
    label: item.label,
    type: 'radio',
    checked: currentScale === item.scale,
    click: () => setScale(item.scale)
  }));

  return Menu.buildFromTemplate([
    {
      label: '🐰 永雏塔菲 (Taffy)',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '✨ 切换动作状态',
      submenu: stateMenuItems
    },
    {
      label: '🔍 画面大小缩放',
      submenu: scaleMenuItems
    },
    {
      label: '🚶 自动边缘漫步巡游',
      type: 'checkbox',
      checked: isWalkEnabled,
      click: (item) => {
        isWalkEnabled = item.checked;
        if (mainWindow) mainWindow.webContents.send('toggle-walk', isWalkEnabled);
      }
    },
    { type: 'separator' },
    {
      label: '❌ 退出塔菲桌宠',
      click: () => {
        app.quit();
      }
    }
  ]);
}

function updateTrayMenu() {
  if (tray) {
    tray.setContextMenu(buildContextMenu());
  }
}

function setScale(scale) {
  currentScale = scale;
  if (mainWindow) {
    const [curX, curY] = mainWindow.getPosition();
    const newW = Math.round(BASE_WIDTH * scale);
    const newH = Math.round(BASE_HEIGHT * scale);
    mainWindow.setSize(newW, newH);
    mainWindow.webContents.send('change-scale', scale);
  }
  updateTrayMenu();
}

// IPC 通信监听
ipcMain.on('pet-move', (event, { dx, dy }) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(Math.round(x + dx), Math.round(y + dy));
});

ipcMain.handle('pet-get-pos', () => {
  return mainWindow ? mainWindow.getPosition() : [0, 0];
});

ipcMain.on('pet-set-pos', (event, { x, y }) => {
  if (mainWindow) mainWindow.setPosition(Math.round(x), Math.round(y));
});

ipcMain.handle('pet-get-screen-bounds', () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workArea;
});

ipcMain.on('pet-set-scale', (event, scale) => {
  setScale(scale);
});

ipcMain.on('pet-show-context-menu', () => {
  if (mainWindow) {
    const menu = buildContextMenu();
    menu.popup({ window: mainWindow });
  }
});

ipcMain.on('pet-quit', () => {
  app.quit();
});

log('Requesting single instance lock...');
const gotTheLock = app.requestSingleInstanceLock();
log('Got the lock:', gotTheLock);

if (!gotTheLock) {
  log('Could not get lock, exiting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    log('Second instance triggered');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    log('app.whenReady firing');
    createWindow();
    createTray();
    log('createWindow and createTray called');

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  }).catch(err => {
    log('Error in whenReady:', err);
  });
}

app.on('window-all-closed', () => {
  log('window-all-closed event fired');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  log('app will-quit event fired');
});

app.on('quit', () => {
  log('app quit event fired');
});
