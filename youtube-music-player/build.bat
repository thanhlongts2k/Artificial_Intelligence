@echo off
chcp 65001 >nul
echo ========================================
echo    Building PlayMusic.exe...
echo ========================================
echo.

cd /d "%~dp0"
python -m PyInstaller --onefile --noconsole --name "PlayMusic" --clean "play_music.pyw"

echo.
echo ========================================
echo    Cleaning up...
echo ========================================

rmdir /s /q build 2>nul
del /q *.spec 2>nul

echo.
echo ========================================
echo    Done! File: dist\PlayMusic.exe
echo ========================================
pause
