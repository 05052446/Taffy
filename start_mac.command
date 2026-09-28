#!/bin/bash
cd "$(dirname "$0")"
echo "======================================"
echo "      永雏塔菲桌宠 - macOS 启动器      "
echo "======================================"

if ! command -v node &> /dev/null; then
    echo "【提示】未检测到 Node.js，请先访问 https://nodejs.org/ 下载安装！"
    read -n 1 -s -r -p "按任意键退出..."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "首次运行正在安装依赖，请稍候..."
    npm install
fi

echo "正在启动桌宠..."
npm start
