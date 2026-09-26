@echo off
cd /d "%~dp0"
echo [*] Dang dung tien trinh YouTubeDownloader neu dang chay...
taskkill /F /IM YouTubeDownloader.exe /T 2>nul

echo [*] Dang don dep thu muc cu...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist YouTubeDownloader.spec del /q YouTubeDownloader.spec

echo [*] Kiem tra moi truong Python...
if exist .venv\Scripts\python.exe (
    set "PY_CMD=.\.venv\Scripts\python.exe"
) else (
    set "PY_CMD=python"
)

echo [*] Bat dau qua trinh dong goi (Build EXE)...
%PY_CMD% -m PyInstaller --name "YouTubeDownloader" --noconsole --onefile --add-data "templates;templates" --add-data "static;static" app.py

echo [*] Da dong goi xong! File nam trong thu muc dist\YouTubeDownloader.exe
pause
