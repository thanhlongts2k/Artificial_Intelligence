# 🎬 YouTube Video Downloader (Flask + yt-dlp)

Ứng dụng web tải video và audio chất lượng cao (lên tới 4K) từ YouTube trực tiếp trên trình duyệt, hỗ trợ mạng nội bộ LAN và xuất mã QR.

---

## ✨ Tính năng nổi bật

- **Chất lượng đa dạng**: Tải từ 144p, 360p, 720p HD, 1080p Full HD đến 4K (2160p).
- **Tự động ghép Audio & Video**: Tự động ghép luồng video chất lượng cao với âm thanh tốt nhất qua FFmpeg mà không làm giảm chất lượng.
- **Hỗ trợ mạng LAN & QR Code**: Tự động hiển thị địa chỉ IP mạng nội bộ và mã QR để điện thoại có thể quét và tải video cùng lúc.
- **Cấu hình Proxy nâng cao**: Tùy chọn nhập HTTP Proxy trực tiếp trên giao diện để vượt qua giới hạn địa lý hoặc hạn chế của YouTube.
- **Đóng gói EXE**: Hỗ trợ build thành file chạy `.exe` độc lập bằng PyInstaller.

---

## 🚀 Hướng dẫn khởi chạy

### Cách 1: Chạy nhanh bằng 1-Click (Khuyên dùng trên Windows)
Chỉ cần nhấp đúp chuột vào file:
```
run.bat
```
Script sẽ tự động khởi tạo `.venv`, cài đặt thư viện cần thiết và mở trình duyệt tại `http://localhost:5000`.

### Cách 2: Chạy thủ công từ Terminal
```bash
cd D:\AgentAI\Artificial_Intelligence\DownloadVideoFromYoutube

# Tạo & kích hoạt môi trường ảo
python -m venv .venv
.\.venv\Scripts\Activate.ps1       # PowerShell
# hoặc: .\.venv\Scripts\activate.bat # CMD

# Cài đặt thư viện
pip install -r requirements.txt

# Khởi chạy ứng dụng
python app.py
```
Ứng dụng sẽ chạy tại cổng **5000**: **`http://localhost:5000`** (đồng bộ với liên kết trên trang Dashboard chính).

---

## 🏗️ Đóng gói thành file .exe (Standalone Executable)

Để đóng gói thành file `.exe` duy nhất không cần cài Python:
Nhấp đúp chuột vào file:
```
build.bat
```
File thực thi sau khi hoàn tất sẽ nằm tại thư mục:
```
dist/YouTubeDownloader.exe
```
