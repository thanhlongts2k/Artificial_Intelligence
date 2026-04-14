@echo off
echo [*] Dang dung tien trinh YouTubeDownloader neu dang chay...
taskkill /F /IM YouTubeDownloader.exe /T 2>nul

echo [*] Dang don dep thu muc cu...
rmdir /s /q build
rmdir /s /q dist
del /q YouTubeDownloader.spec

echo [*] Bat dau qua trinh dong goi (Build EXE)...
"D:\Program Files\Python313\python.exe" -m PyInstaller --name "YouTubeDownloader" --noconsole --onefile --add-data "templates;templates" --add-data "static;static" app.py

echo [*] Da dong goi xong! File nam trong thu muc dist\YouTubeDownloader.exe
pause
