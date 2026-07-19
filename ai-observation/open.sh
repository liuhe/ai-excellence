#!/usr/bin/env bash
# 一键打开 AI 观察 Viewer：装配 → 起 http server → 打开浏览器
# 用法：从 target 项目根目录执行 ./ai-observation/open.sh [port]
#      或指定 target：./ai-observation/open.sh [port] --target /path/to/other/project
# 默认 port 8765；Ctrl-C 停止服务

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8765}"
shift || true

# target 项目根：优先 --target，其次 $CLAUDE_PROJECT_DIR，最后 pwd
TARGET_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
if [ "${1:-}" = "--target" ] && [ -n "${2:-}" ]; then
  TARGET_ROOT="$(cd "$2" && pwd)"
fi

echo "[target] $TARGET_ROOT"
echo "[1/3] 装配观察数据..."
/usr/bin/python3 "$SCRIPT_DIR/assemble.py" --target "$TARGET_ROOT"

echo "[2/3] 启动 HTTP server (port $PORT)..."
# 从 target 项目根起 server（这样 viewer 能同时访问 .aie/observations/ 和 ai-observation/viewer/）
cd "$TARGET_ROOT"
/usr/bin/python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/aie-viewer.log 2>&1 &
SERVER_PID=$!
trap 'echo "[stop] killing server $SERVER_PID"; kill $SERVER_PID 2>/dev/null || true' EXIT INT TERM

sleep 0.5

URL="http://127.0.0.1:$PORT/ai-observation/viewer/index.html"
echo "[3/3] 打开浏览器: $URL"
open "$URL"

echo ""
echo "服务运行中，Ctrl-C 停止。日志: /tmp/aie-viewer.log"
wait $SERVER_PID
