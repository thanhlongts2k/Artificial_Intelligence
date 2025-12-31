# 🎵 YouTube Music Player

> Nghe nhạc theo **tâm trạng** và **mục đích** - Tự động tìm và phát video đầu tiên!

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Mobile-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## ✨ Tính năng

| Tính năng | PC | Mobile |
|-----------|:--:|:------:|
| Chọn tâm trạng (Vui, Buồn, Chill...) | ✅ | ✅ |
| Chọn mục đích (Làm việc, Gym, Ngủ...) | ✅ | ✅ |
| Tự động mở video đầu tiên | ✅ | ✅ |
| Cài đặt như app | ✅ | ✅ |
| Dark theme | ✅ | ✅ |

---

## 🎭 Danh sách tùy chọn

### Tâm trạng
- ☀️ **Vui vẻ** - Nhạc remix sôi động
- 💧 **Buồn** - Ballad, nhạc thất tình
- 🍃 **Chill** - Lofi, acoustic nhẹ nhàng
- ⚡ **Năng lượng** - Nonstop, bass cực mạnh
- 💕 **Lãng mạn** - Nhạc tình yêu

### Mục đích
- 🧠 **Audio mất não** - Mất Não Audio, Nhi Đồng Mất Não...
- 💼 **Làm việc** - Nhạc không lời, lofi study
- 🏃 **Tập gym** - Workout music, nhạc chạy bộ
- 😴 **Thư giãn** - Nhạc ngủ, nhạc thiền
- 🎉 **Tiệc tùng** - EDM party, nonstop bar
- 🚗 **Lái xe** - Nhạc đường xa

---

## 💻 Cài đặt cho PC (Windows)

### Cách 1: Download file exe
1. Download `PlayMusic.exe` từ [Releases](../../releases)
2. Chạy file → Tự tạo shortcut trên Desktop
3. Click shortcut để sử dụng

### Cách 2: Build từ source
```bash
cd youtube-music-player
pip install customtkinter pyautogui pyinstaller
build.bat
```

---

## 📱 Cài đặt cho Mobile (PWA)

### Link truy cập:
**👉 [https://thanhlongts2k.github.io/Artificial_Intelligence/youtube-music-player/pwa/](https://thanhlongts2k.github.io/Artificial_Intelligence/youtube-music-player/pwa/)**

### Hướng dẫn cài đặt:

**Android (Chrome):**
1. Mở link trên bằng Chrome
2. Nhấn menu ⋮ → **"Cài đặt ứng dụng"**
3. App xuất hiện trên màn hình chính

**iPhone (Safari):**
1. Mở link trên bằng Safari
2. Nhấn Share □↑ → **"Thêm vào MH chính"**
3. Nhấn **"Thêm"**

---

## 📁 Cấu trúc thư mục

```
youtube-music-player/
├── play_music.pyw      # Source code PC (Python)
├── build.bat           # Script build exe
└── pwa/                # Progressive Web App (Mobile)
    ├── index.html
    ├── style.css
    ├── app.js
    ├── manifest.json
    ├── sw.js
    └── icons/
```

---

## 🛠️ Công nghệ sử dụng

**PC Version:**
- Python 3
- CustomTkinter (Dark theme GUI)
- PyAutoGUI (Auto-click)
- PyInstaller (Build exe)

**Mobile Version:**
- Progressive Web App (PWA)
- Invidious API (YouTube search)
- Service Worker (Offline support)

---

## 📝 License

MIT License - Sử dụng thoải mái!

---

## 👨‍💻 Author

Made with ❤️ by [thanhlongts2k](https://github.com/thanhlongts2k)
