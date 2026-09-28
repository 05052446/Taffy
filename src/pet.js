// 永雏塔菲桌宠交互与状态机引擎
const petWrapper = document.getElementById('pet-wrapper');
const sprite = document.getElementById('pet-sprite');
const petContainer = document.getElementById('pet-container');
const bubble = document.getElementById('bubble');
const bubbleText = document.getElementById('bubble-text');

const FRAME_W = 192;
const FRAME_H = 208;
const TOTAL_COLS = 8;
const TOTAL_ROWS = 9;

// 状态枚举 (与 Petdex 官方 8x9 精灵图规范 100% 对齐)
const STATES = {
  IDLE: 0,        // 0: 原地呼吸待机 (6帧)
  RUN_RIGHT: 1,   // 1: 向右小跑 (8帧)
  RUN_LEFT: 2,    // 2: 向左小跑 (8帧)
  WAVING: 3,      // 3: 挥手打招呼 (4帧)
  JUMPING: 4,     // 4: 原地开心跳跃 (5帧)
  FAILED: 5,      // 5: 受挫生气跺脚 (8帧)
  WAITING: 6,     // 6: 左右晃脑发呆 (6帧)
  SPRINT: 7,      // 7: 奋力向前冲刺 (6帧)
  REVIEW: 8       // 8: 好奇回头/被抓起 (6帧)
};

const STATE_TITLES = [
  "原地待机",
  "向右小跑",
  "向左小跑",
  "挥手打招呼",
  "开心跳跃",
  "受挫生气",
  "晃脑发呆",
  "向前冲刺",
  "好奇回头"
];

// 每套动作的真实有效分帧数
const ROW_FRAMES = [6, 8, 8, 4, 5, 8, 6, 6, 6];

// 每套动作的自然播放周期 (ms/帧)，待机采用 190ms 舒缓呼吸节奏
const STATE_SPEEDS = [
  190, // 0: 待机呼吸 (190ms*6 = 1.14s 循环周期，温和自然不刺眼)
  105, // 1: 向右跑 (轻快小跑)
  105, // 2: 向左跑 (轻快小跑)
  160, // 3: 挥手 (自然挥手打招呼)
  120, // 4: 跳跃 (活泼连贯跳跃)
  130, // 5: 生气 (连贯跺脚)
  180, // 6: 晃脑发呆 (慢节奏晃头)
  85,  // 7: 向前冲刺 (急速冲刺)
  130  // 8: 好奇回头/被抓起
];

let currentState = STATES.IDLE;
let currentFrame = 0;
let frameInterval = 125; // ms
let animTimer = null;
let bubbleTimer = null;

// 拖拽与点击判定
let isMouseDown = false;
let isDragging = false;
let hasMovedFar = false;
let originX = 0;
let originY = 0;
let startX = 0;
let startY = 0;
let lastStateBeforeDrag = STATES.IDLE;

// 自动漫步系统
let isWalkEnabled = true;
let roamTimer = null;
let roamStepTimer = null;
let walkDirection = 1; // 1 为向右，-1 为向左

// 塔菲经典台词库
const TAFFY_LINES = [
  "最喜欢雏草姬啦！",
  "今天写了几行 Bug 呀？",
  "塔菲才没有摸鱼呢，哼！",
  "呼...有点困了，要抱抱~",
  "别戳啦别戳啦，脑袋要被戳扁了！",
  "吃饱饱，没烦恼~",
  "大击败！全部击败！",
  "写代码辛苦啦，记得喝水哦！",
  "塔菲永远是你的头号小助手！",
  "傲娇？才没有傲娇呢！"
];

// 核心帧步进
function step() {
  const maxFrames = ROW_FRAMES[currentState] || 6;
  currentFrame = (currentFrame + 1) % maxFrames;
  const x = -(currentFrame * FRAME_W);
  const y = -(currentState * FRAME_H);
  sprite.style.backgroundPosition = `${x}px ${y}px`;
}

function startAnimation(interval = frameInterval) {
  if (animTimer) clearInterval(animTimer);
  animTimer = setInterval(step, interval);
}

function setState(newState, customSpeed = null) {
  currentState = newState;
  currentFrame = 0;
  frameInterval = customSpeed || STATE_SPEEDS[currentState] || 150;
  step();
  startAnimation(frameInterval);
}

// 气泡台词展示
function showBubble(text, duration = 2600) {
  if (bubbleTimer) clearTimeout(bubbleTimer);
  bubbleText.textContent = text;
  bubble.classList.add('show');
  bubbleTimer = setTimeout(() => {
    bubble.classList.remove('show');
  }, duration);
}

// 鼠标交互事件
petContainer.addEventListener('mousedown', (e) => {
  if (e.button === 0) { // 左键
    isMouseDown = true;
    isDragging = false;
    hasMovedFar = false;
    originX = e.screenX;
    originY = e.screenY;
    startX = e.screenX;
    startY = e.screenY;
    lastStateBeforeDrag = currentState;
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isMouseDown) return;

  const totalDist = Math.hypot(e.screenX - originX, e.screenY - originY);

  // 超过阈值判定为拖拽
  if (!isDragging && totalDist > 7) {
    isDragging = true;
    hasMovedFar = true;
    stopRoaming();
    // 拖起时变为被拎起回头动作 (8: REVIEW)
    setState(STATES.REVIEW, 110);
    showBubble("哇啊！放我下来！", 1500);
  }

  if (isDragging) {
    const dx = e.screenX - startX;
    const dy = e.screenY - startY;
    window.petAPI.moveWindow(dx, dy);
    startX = e.screenX;
    startY = e.screenY;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0 && isMouseDown) {
    isMouseDown = false;
    if (isDragging) {
      isDragging = false;
      // 拖拽结束恢复呼吸待机
      setState(STATES.IDLE);
      showBubble("哼，总算着地了~", 2000);
      scheduleNextRoam();
    } else if (!hasMovedFar) {
      // 纯粹的单击点击
      handleClickInteraction();
    }
  }
});

// 单击互动反馈
function handleClickInteraction() {
  const line = TAFFY_LINES[Math.floor(Math.random() * TAFFY_LINES.length)];
  showBubble(line, 2600);

  // Q 弹视觉反馈
  sprite.classList.remove('bounce');
  void sprite.offsetWidth; // 触发 reflow
  sprite.classList.add('bounce');

  // 随机播放挥手打招呼 (3) 或 开心跳跃 (4)
  const interactiveState = Math.random() > 0.5 ? STATES.WAVING : STATES.JUMPING;
  const prev = (currentState === STATES.WAVING || currentState === STATES.JUMPING) ? STATES.IDLE : currentState;
  setState(interactiveState);
  setTimeout(() => {
    if (!isDragging && (currentState === STATES.WAVING || currentState === STATES.JUMPING)) {
      setState(prev);
    }
  }, 1900);
}

// 双击切换状态
petContainer.addEventListener('dblclick', (e) => {
  e.stopPropagation();
  const next = (currentState + 1) % TOTAL_ROWS;
  setState(next);
  showBubble(`✨ 动作切换：${STATE_TITLES[next]}`, 2200);
});

// 右键在窗口内任意位置唤出菜单
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.petAPI.showContextMenu();
});

// 自动漫步巡游机制
async function performRoam() {
  if (!isWalkEnabled || isDragging || currentState === STATES.WAITING || currentState === STATES.FAILED) {
    scheduleNextRoam();
    return;
  }

  const bounds = await window.petAPI.getScreenBounds();
  const [posX, posY] = await window.petAPI.getPosition();

  // 随机向右跑 (1: RUN_RIGHT) 或 向左跑 (2: RUN_LEFT)
  walkDirection = Math.random() > 0.5 ? 1 : -1;
  const walkSpeed = 2; // px per tick
  const duration = 2500 + Math.random() * 2500; // 漫步 2.5~5 秒

  // 设置专属左右跑动动作 (无需 CSS 翻转，原生精灵图已画好侧跑)
  sprite.classList.remove('flip-h');
  setState(walkDirection === 1 ? STATES.RUN_RIGHT : STATES.RUN_LEFT);

  const startTime = Date.now();
  roamStepTimer = setInterval(async () => {
    if (isDragging || !isWalkEnabled) {
      clearInterval(roamStepTimer);
      return;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed >= duration) {
      clearInterval(roamStepTimer);
      setState(STATES.IDLE);
      scheduleNextRoam();
      return;
    }

    const [curX, curY] = await window.petAPI.getPosition();
    const nextX = curX + walkDirection * walkSpeed;

    // 屏幕边缘检测与折返
    if (nextX <= bounds.x + 10) {
      walkDirection = 1;
      setState(STATES.RUN_RIGHT);
    } else if (nextX >= bounds.x + bounds.width - 210) {
      walkDirection = -1;
      setState(STATES.RUN_LEFT);
    }

    window.petAPI.moveWindow(walkDirection * walkSpeed, 0);
  }, 30);
}

function stopRoaming() {
  if (roamTimer) clearTimeout(roamTimer);
  if (roamStepTimer) clearInterval(roamStepTimer);
}

function scheduleNextRoam() {
  stopRoaming();
  if (!isWalkEnabled) return;
  const nextDelay = 12000 + Math.random() * 15000; // 12~27 秒后再次漫步
  roamTimer = setTimeout(performRoam, nextDelay);
}

// 接收主进程 IPC 消息
window.petAPI.onStateChange((stateIndex) => {
  stopRoaming();
  setState(stateIndex);
  scheduleNextRoam();
});

window.petAPI.onToggleWalk((enabled) => {
  isWalkEnabled = enabled;
  if (!enabled) {
    stopRoaming();
    if (currentState === STATES.RUN_RIGHT || currentState === STATES.RUN_LEFT) {
      setState(STATES.IDLE);
    }
  } else {
    scheduleNextRoam();
  }
});

// 监听缩放变化并实时应用到包装层上 (人物与气泡恒定绑定缩放)
window.petAPI.onScaleChange((scale) => {
  if (petWrapper) {
    petWrapper.style.transform = `scale(${scale})`;
    petWrapper.style.transformOrigin = 'center bottom';
  }
});

// 启动桌宠引擎 (初始呼吸待机 190ms 舒缓平滑)
setState(STATES.IDLE);
setTimeout(() => {
  showBubble("塔菲来陪你啦！");
  scheduleNextRoam();
}, 800);
