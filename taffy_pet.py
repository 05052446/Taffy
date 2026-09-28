import sys
import os
from PyQt5.QtWidgets import QApplication, QMainWindow, QMenu, QAction
from PyQt5.QtCore import Qt, QTimer, QPoint, QRect
from PyQt5.QtGui import QPixmap, QPainter, QCursor, QIcon
from PIL import Image

SPRITE_PATH = os.path.expanduser(r"~/.petdex/pets/taffy-2/spritesheet.webp")

STATE_NAMES = [
    "待机 (Idle)",
    "走动 (Walk)",
    "奔跑 (Run)",
    "思考/工作 (Working)",
    "开心/庆祝 (Happy)",
    "警惕/吃惊 (Alert)",
    "犯困/打盹 (Sleepy)",
    "睡觉 (Sleeping)",
    "特殊动作 (Special)"
]

class DesktopPet(QMainWindow):
    def __init__(self):
        super().__init__()

        # 窗口无边框、置顶、背景透明
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.SubWindow)
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WA_NoSystemBackground, True)

        # 加载精灵图
        self.load_spritesheet()

        # 当前状态与帧索引
        self.current_state = 0  # 0~8 行
        self.current_frame = 0  # 0~7 列
        self.scale_factor = 1.0  # 缩放比例

        # 设置窗口初始大小与位置
        self.resize(int(self.frame_w * self.scale_factor), int(self.frame_h * self.scale_factor))
        
        # 放置在屏幕右下角附近
        screen = QApplication.primaryScreen().geometry()
        init_x = screen.width() - self.width() - 120
        init_y = screen.height() - self.height() - 100
        self.move(init_x, init_y)

        # 拖拽相关属性
        self.dragging = False
        self.drag_position = QPoint()

        # 动画定时器 (每 130ms 切一帧)
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.next_frame)
        self.timer.start(130)

    def load_spritesheet(self):
        # 使用 QPixmap 加载
        if not os.path.exists(SPRITE_PATH):
            raise FileNotFoundError(f"找不到精灵图: {SPRITE_PATH}")

        # 使用 PIL 转换或直接加载
        # 由于某些 Qt 版本直接读 webp 可能需要插件，先用 PIL 转临时 png 或直接加载
        try:
            self.full_pixmap = QPixmap(SPRITE_PATH)
            if self.full_pixmap.isNull():
                raise Exception("QPixmap directly loading webp is null")
        except Exception:
            im = Image.open(SPRITE_PATH)
            tmp_png = os.path.join(os.path.dirname(SPRITE_PATH), "spritesheet.png")
            if not os.path.exists(tmp_png):
                im.save(tmp_png, "PNG")
            self.full_pixmap = QPixmap(tmp_png)

        self.cols = 8
        self.rows = 9
        self.frame_w = self.full_pixmap.width() // self.cols
        self.frame_h = self.full_pixmap.height() // self.rows

    def next_frame(self):
        self.current_frame = (self.current_frame + 1) % self.cols
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.SmoothPixmapTransform, False) # 像素风禁用平滑抗锯齿更清晰

        src_x = self.current_frame * self.frame_w
        src_y = self.current_state * self.frame_h

        # 截取对应帧并绘制
        frame_pixmap = self.full_pixmap.copy(src_x, src_y, self.frame_w, self.frame_h)
        target_rect = QRect(0, 0, self.width(), self.height())
        painter.drawPixmap(target_rect, frame_pixmap)

    # 鼠标按下（准备拖拽）
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.dragging = True
            self.drag_position = event.globalPos() - self.frameGeometry().topLeft()
            event.accept()
        elif event.button() == Qt.RightButton:
            self.show_context_menu(event.pos())

    # 鼠标移动（拖拽中）
    def mouseMoveEvent(self, event):
        if self.dragging and (event.buttons() & Qt.LeftButton):
            self.move(event.globalPos() - self.drag_position)
            event.accept()

    # 鼠标松开
    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.dragging = False
            event.accept()

    # 双击切换下一个状态
    def mouseDoubleClickEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.current_state = (self.current_state + 1) % self.rows
            self.current_frame = 0
            self.update()

    # 右键菜单
    def show_context_menu(self, pos):
        menu = QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background-color: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 4px;
                font-family: sans-serif;
                font-size: 13px;
            }
            QMenu::item {
                padding: 6px 20px;
                border-radius: 4px;
            }
            QMenu::item:selected {
                background-color: #f3e8ff;
                color: #7e22ce;
            }
        """)

        # 动作选择子菜单
        action_menu = menu.addMenu("✨ 切换动作")
        for idx, name in enumerate(STATE_NAMES):
            act = QAction(f"{'● ' if idx == self.current_state else '  '}{name}", self)
            act.triggered.connect(lambda checked, s=idx: self.set_state(s))
            action_menu.addAction(act)

        # 缩放菜单
        scale_menu = menu.addMenu("🔍 大小缩放")
        scales = [("小 (0.75x)", 0.75), ("正常 (1.0x)", 1.0), ("大 (1.25x)", 1.25), ("超大 (1.5x)", 1.5)]
        for label, factor in scales:
            act = QAction(label, self)
            act.triggered.connect(lambda checked, f=factor: self.set_scale(f))
            scale_menu.addAction(act)

        menu.addSeparator()
        exit_act = menu.addAction("❌ 退出桌宠")
        exit_act.triggered.connect(QApplication.quit)

        menu.exec_(self.mapToGlobal(pos))

    def set_state(self, state_idx):
        self.current_state = state_idx
        self.current_frame = 0
        self.update()

    def set_scale(self, factor):
        self.scale_factor = factor
        self.resize(int(self.frame_w * factor), int(self.frame_h * factor))
        self.update()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    pet = DesktopPet()
    pet.show()
    sys.exit(app.exec_())
