import os

desktop = os.path.expanduser("~/Desktop")
bat_path = os.path.join(desktop, "永雏塔菲桌宠.bat")

content = (
    "@echo off\r\n"
    "chcp 65001 >nul\r\n"
    "cd /d \"C:\\Users\\54185\\Desktop\\雏草姬\"\r\n"
    "start \"\" \"node_modules\\electron\\dist\\electron.exe\" .\r\n"
)

# 写入为 UTF-8
with open(bat_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Created batch launcher at:", bat_path)

# 删除有问题的 .lnk 快捷方式与 .vbs
old_lnk = os.path.join(desktop, "永雏塔菲桌宠.lnk")
if os.path.exists(old_lnk):
    try:
        os.remove(old_lnk)
        print("Removed faulty .lnk")
    except Exception as e:
        print("Could not remove .lnk:", e)

vbs_path = r"C:\Users\54185\Desktop\雏草姬\run_silent.vbs"
if os.path.exists(vbs_path):
    try:
        os.remove(vbs_path)
    except Exception:
        pass
