@echo off
cd /d "%~dp0"
set PORT=8000
echo.
echo 寰宇时序 - World Chronicle
echo 本机打开:  http://localhost:%PORT%
echo 家人（同一 Wi-Fi）: 用 ipconfig 查看 IPv4 地址，访问 http://该地址:%PORT%
echo 按 Ctrl+C 停止。
echo.
start "" cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%"
py -m http.server %PORT% 2>nul
if errorlevel 1 python -m http.server %PORT%
pause
