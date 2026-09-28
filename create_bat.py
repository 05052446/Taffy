import os

target = r"C:\Users\54185\Desktop\启动永雏塔菲桌宠.bat"
content = '@echo off\r\ncd /d "%~dp0雏草姬"\r\nstart "" "node_modules\\electron\\dist\\electron.exe" .\r\n'

with open(target, 'w', encoding='gbk') as f:
    f.write(content)

print("Created:", target)
