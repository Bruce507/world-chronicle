#!/bin/bash
cd "$(dirname "$0")" || exit 1
PORT=8000
if command -v python3 >/dev/null 2>&1; then PY=python3; else PY=python; fi
if ! command -v "$PY" >/dev/null 2>&1; then
  echo "未找到 Python。请先安装 Python 3：https://www.python.org/downloads/"
  read -r -p "按回车退出…" _
  exit 1
fi
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo ""
echo "寰宇时序 · World Chronicle"
echo "本机打开:  http://localhost:$PORT"
if [ -n "$IP" ]; then echo "家人（同一 Wi-Fi）:  http://$IP:$PORT"; fi
echo "按 Control + C 停止。"
echo ""
"$PY" -m http.server "$PORT" --bind 0.0.0.0 &
PID=$!
trap 'kill $PID 2>/dev/null' EXIT INT TERM
sleep 1
open "http://localhost:$PORT" 2>/dev/null || true
wait $PID
