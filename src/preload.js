const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  // 窗口位置与移动
  moveWindow: (dx, dy) => ipcRenderer.send('pet-move', { dx, dy }),
  getPosition: () => ipcRenderer.invoke('pet-get-pos'),
  setPosition: (x, y) => ipcRenderer.send('pet-set-pos', { x, y }),
  getScreenBounds: () => ipcRenderer.invoke('pet-get-screen-bounds'),
  
  // 右键菜单
  showContextMenu: () => ipcRenderer.send('pet-show-context-menu'),

  // 尺寸调整
  setScale: (scale) => ipcRenderer.send('pet-set-scale', scale),

  // 关闭应用
  quitApp: () => ipcRenderer.send('pet-quit'),

  // 监听来自托盘或主进程的命令
  onStateChange: (callback) => ipcRenderer.on('change-state', (event, stateIndex) => callback(stateIndex)),
  onScaleChange: (callback) => ipcRenderer.on('change-scale', (event, scale) => callback(scale)),
  onToggleWalk: (callback) => ipcRenderer.on('toggle-walk', (event, enabled) => callback(enabled))
});
