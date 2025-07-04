#!/bin/bash

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
  echo "请以 root 权限运行此脚本 (使用 sudo)"
  exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
  echo "npm 未安装，正在安装..."
  apt-get update
  apt-get install -y nodejs npm
else
  echo "npm 已安装，版本: $(npm --version)"
fi

# 检查 screen 是否安装
if ! command -v screen &> /dev/null; then
  echo "screen 未安装，正在安装..."
  apt-get install -y screen
else
  echo "screen 已安装，版本: $(screen --version | head -n 1)"
fi

# 检查 git 是否安装
if ! command -v git &> /dev/null; then
  echo "git 未安装，正在安装..."
  apt-get install -y git
else
  echo "git 已安装，版本: $(git --version)"
fi

# 拉取 GitHub 仓库
REPO_URL="https://github.com/sdohuajia/FaroSwap.git"
REPO_DIR="FaroSwap"

echo "正在拉取仓库 $REPO_URL ..."
if [ -d "$REPO_DIR" ]; then
  echo "目录 $REPO_DIR 已存在，正在更新..."
  cd "$REPO_DIR" || exit
  git pull origin main
else
  git clone "$REPO_URL"
  cd "$REPO_DIR" || exit
fi

# 执行 npm install
echo "正在执行 npm install ..."
npm install

# 提示用户输入 proxy 信息
echo "请输入 proxy 地址 (例如 http://proxy.example.com:8080 或留空):"
read -r PROXY

# 将 proxy 信息写入 proxy.txt
if [ -n "$PROXY" ]; then
  echo "$PROXY" > proxy.txt
  echo "proxy 已写入 proxy.txt: $PROXY"
else
  echo "" > proxy.txt
  echo "未提供 proxy，proxy.txt 已创建为空文件"
fi

# 提示用户输入私钥
echo "请输入私钥 (例如 0x123... 或留空):"
read -r PRIVATE_KEY

# 将私钥写入 accounts.txt
if [ -n "$PRIVATE_KEY" ]; then
  echo "$PRIVATE_KEY" > accounts.txt
  echo "私钥已写入 accounts.txt"
else
  echo "" > accounts.txt
  echo "未提供私钥，accounts.txt 已创建为空文件"
fi

# 设置日志文件路径
LOG_FILE="faroswap.log"

# 检查并终止已存在的 Faroswap screen 会话
if screen -list | grep -q "Faroswap"; then
  echo "检测到已存在的 Faroswap screen 会话，正在终止..."
  screen -S Faroswap -X quit
fi

# 在 screen 会话中运行 npm start，并将输出重定向到日志文件
echo "正在启动 screen 会话 'Faroswap' 并运行 npm start，日志将保存到 $LOG_FILE ..."
screen -dmS Faroswap bash -c "npm start >> $LOG_FILE 2>&1"

# 创建清理日志的脚本
CLEANUP_SCRIPT="cleanup_logs.sh"
cat << EOF > $CLEANUP_SCRIPT
#!/bin/bash
# 清理前一天的日志
find $(pwd) -name "faroswap.log" -mtime +1 -exec rm -f {} \;
EOF

# 赋予清理脚本执行权限
chmod +x $CLEANUP_SCRIPT

# 设置 crontab 任务，每 2 天运行一次清理脚本
CRON_JOB="0 0 */2 * * $(pwd)/$CLEANUP_SCRIPT"
(crontab -l 2>/dev/null | grep -v "$CLEANUP_SCRIPT"; echo "$CRON_JOB") | crontab -
echo "已设置每 2 天清理前一天日志的 crontab 任务"

echo "所有操作完成！"
echo "可以使用 'screen -r Faroswap' 查看运行中的会话，或查看 $LOG_FILE 检查日志。"
