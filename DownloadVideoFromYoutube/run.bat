@echo off
cd /d "%~dp0"
title YouTube Video Downloader
echo ========================================================
echo   YOUTUBE VIDEO DOWNLOADER (Flask App)
echo ========================================================
echo.

if not exist .venv\Scripts\python.exe (
    echo [*] Phat hien chua co moi truong ao, dang tao .venv...
    python -m venv .venv
    echo [*] Dang cai dat thu vien tu requirements.txt...
    .\.venv\Scripts\pip.exe install -r requirements.txt
)

echo [*] Dang khoi chay may chu tai http://localhost:5000 ...
.\.venv\Scripts\python.exe app.py
pause
