# 🤖 AutoTyper / Bot Messenger v2.0

> **Công cụ tự động gõ & gửi tin nhắn hàng loạt** — hỗ trợ gửi lặp lại với biến đếm hoặc gửi theo danh sách từ file `.txt`. Tương thích với mọi ứng dụng chat (Messenger, Zalo, Telegram, Discord,...).

---

## 📋 Mục Lục

- [🎯 Mục Tiêu Chương Trình](#-mục-tiêu-chương-trình)
- [✨ Tính Năng](#-tính-năng)
- [⚙️ Yêu Cầu Hệ Thống](#️-yêu-cầu-hệ-thống)
- [🚀 Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
- [📖 Hướng Dẫn Sử Dụng](#-hướng-dẫn-sử-dụng)
- [🏗️ Build File .exe](#️-build-file-exe)
- [⚠️ Lưu Ý Quan Trọng](#️-lưu-ý-quan-trọng)
- [📁 Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)

---

## 🎯 Mục Tiêu Chương Trình

| # | Mục tiêu | Mô tả |
|---|----------|-------|
| 1 | **Tự động gõ tin nhắn lặp lại** | Gửi N lần tin nhắn với biến `{count}` tự tăng dần (VD: "Tin nhắn số 1", "Tin nhắn số 2",...) |
| 2 | **Gửi theo danh sách từ file** | Đọc file `.txt`, mỗi dòng là 1 tin nhắn — gửi lần lượt, hỗ trợ lặp nhiều vòng |
| 3 | **Dừng khẩn cấp** | Nhấn giữ phím `ESC` bất cứ lúc nào để dừng ngay lập tức |
| 4 | **Log có màu sắc** | Sử dụng ANSI colors hiển thị log rõ ràng: xanh (thành công), đỏ (lỗi), vàng (cảnh báo),... |
| 5 | **Đóng gói portable** | Build thành file `.exe` duy nhất bằng PyInstaller, chạy trên mọi máy Windows không cần Python |

---

## ✨ Tính Năng

### 🔹 Chế độ 1 — Auto Type (Gõ lặp lại)
- Nhập nội dung tin nhắn 1 lần, chương trình gõ tự động N lần
- Hỗ trợ biến `{count}` — tự thay thế bằng số đếm tăng dần
- Hỗ trợ xuống dòng: `\br`, `<br>`, `<br/>`, `[br]`, `\n`
- Tùy chỉnh: số lần gửi, số đếm bắt đầu, thời gian chờ giữa mỗi tin

### 🔹 Chế độ 2 — Auto Type theo Danh Sách (File .txt)
- Đọc file `.txt` — mỗi dòng là 1 tin nhắn riêng biệt
- Gửi lần lượt từng tin nhắn trong file
- Hỗ trợ lặp lại file nhiều lần (loop)
- Tùy chỉnh: thời gian chờ, khoảng cách giữa tin, số vòng lặp

### 🔹 Tính năng chung
- 🎨 **Log có màu** — Phân biệt trạng thái bằng màu sắc (SUCCESS/WARNING/ERROR/INFO)
- ⌨️ **Dừng khẩn cấp bằng ESC** — Nhấn giữ phím ESC để dừng bất cứ lúc nào
- ⏳ **Đếm ngược trước khi gửi** — Có thời gian để click vào ô chat
- 🖨️ **Hiệu ứng typewriter** — Tin nhắn thoát hiện ra chậm chậm từng ký tự

---

## ⚙️ Yêu Cầu Hệ Thống

| Yêu cầu | Chi tiết |
|----------|----------|
| **OS** | Windows 10 / 11 |
| **Python** | 3.10+ (khuyên dùng 3.12+) |
| **Thư viện** | `keyboard` (bắt buộc), `pyinstaller` (chỉ khi build .exe) |

---

## 🚀 Hướng Dẫn Cài Đặt

### Bước 1 — Clone / Tải về

```bash
cd D:\AgentAI\Artificial_Intelligence\Tools\AutoTyping
```

### Bước 2 — Tạo môi trường ảo (khuyên dùng)

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1       # PowerShell
# hoặc
.\.venv\Scripts\activate.bat       # CMD
```

### Bước 3 — Cài đặt thư viện

```bash
pip install -r requirements.txt
```

### Bước 4 — Chạy chương trình

```bash
python auto_type.py
```

> **💡 Lưu ý:** Thư viện `keyboard` cần quyền **Administrator** trên một số hệ thống. Nếu gặp lỗi quyền, hãy chạy terminal với quyền Admin.

---

## 📖 Hướng Dẫn Sử Dụng

### 🟢 Chạy chương trình

```
==============================
Chào mừng bạn trở lại:
 '0': Để thoát chương trình
 '1': Mở chương trình AUTO TYPE
 '2': Auto Type theo danh sách (File .txt)
==============================
Nhập lựa chọn: _
```

---

### 📝 Chế độ 1 — Auto Type (Gõ lặp lại)

**Các bước thực hiện:**

1. Chọn `1` tại menu chính
2. Nhập **tổng số lần gửi** (VD: `100`)
3. Nhập **số đếm bắt đầu** (VD: `1`)
4. Nhập **nội dung tin nhắn** — có thể dùng:
   - `{count}` → tự thay bằng số đếm (1, 2, 3,...)
   - `\br` hoặc `<br>` → xuống dòng trong tin nhắn
5. Nhập **thời gian chờ** trước khi bắt đầu (mặc định 10 giây)
6. Nhập **khoảng cách** giữa mỗi tin nhắn (mặc định 3 giây)
7. **Click chuột vào ô chat** trong thời gian đếm ngược
8. Chương trình tự động gõ và gửi!

**Ví dụ nội dung:**
```
Tin nhắn thứ {count} \br Đây là dòng thứ 2
```
→ Kết quả gửi (lần 1):
```
Tin nhắn thứ 1
Đây là dòng thứ 2
```

---

### 📋 Chế độ 2 — Auto Type theo Danh Sách

**Chuẩn bị file `.txt`:**
```
Xin chào mọi người!
Hôm nay thời tiết đẹp quá
Chúc mọi người ngày mới vui vẻ
Hẹn gặp lại ❤️
```
> Mỗi dòng trong file = 1 tin nhắn riêng biệt.

**Các bước thực hiện:**

1. Chọn `2` tại menu chính
2. Nhập **đường dẫn file .txt** (VD: `danh_sach.txt` hoặc `D:\data\messages.txt`)
3. Nhập **thời gian chờ** trước khi bắt đầu
4. Nhập **khoảng cách** giữa mỗi tin nhắn
5. Nhập **số lần lặp lại** file (mặc định 1)
6. **Click chuột vào ô chat** trong thời gian đếm ngược
7. Chương trình tự động gửi từng tin nhắn trong file!

---

### 🛑 Dừng Khẩn Cấp

> Nhấn **giữ phím ESC** bất cứ lúc nào để dừng chương trình ngay lập tức.

Chương trình kiểm tra phím ESC tại 3 thời điểm:
- Trong lúc đếm ngược chờ
- Trước khi gõ mỗi tin nhắn
- Trong lúc chờ giữa các tin nhắn

---

## 🏗️ Build File .exe

Đóng gói thành file `.exe` portable (không cần cài Python):

```bash
# Kích hoạt venv
.\.venv\Scripts\Activate.ps1

# Build
pyinstaller --onefile auto_type.py
```

File `.exe` sẽ nằm tại:
```
dist/auto_type.exe
```

> **⚠️ Lưu ý khi build lại:** Phải tắt hết `auto_type.exe` đang chạy trước khi build, nếu không sẽ gặp lỗi `PermissionError`. Dùng lệnh sau để tắt:
> ```bash
> taskkill /F /IM auto_type.exe
> ```

---

## ⚠️ Lưu Ý Quan Trọng

| # | Lưu ý |
|---|-------|
| 1 | **Chạy với quyền Admin** nếu gặp lỗi quyền với thư viện `keyboard` |
| 2 | **Click vào ô chat trước** khi hết thời gian đếm ngược — chương trình sẽ gõ tại vị trí con trỏ hiện tại |
| 3 | **Không di chuyển chuột** trong lúc chương trình đang gõ |
| 4 | **Delay hợp lý** — Đặt khoảng cách 3-5 giây giữa mỗi tin nhắn để tránh bị ứng dụng chat phát hiện spam |
| 5 | **Dùng có trách nhiệm** — Công cụ này chỉ phục vụ mục đích học tập và tự động hóa cá nhân |

---

## 📁 Cấu Trúc Thư Mục

```
AutoTyping/
├── auto_type.py          # 🔹 File chính — toàn bộ logic chương trình
├── requirements.txt      # 📦 Danh sách thư viện cần cài
├── README.md             # 📖 Tài liệu hướng dẫn (file này)
├── .venv/                # 🐍 Môi trường ảo Python (tự tạo)
├── build/                # 🏗️ Thư mục tạm khi build (tự tạo)
├── dist/                 # 📦 Chứa file auto_type.exe sau khi build
│   └── auto_type.exe
└── auto_type.spec        # ⚙️ Config PyInstaller (tự tạo)
```

---

## 🎨 Hệ Thống Màu Log

Chương trình sử dụng class `ColorStyle` với ANSI escape codes, tương tự Django management command:

| Method | Màu | Dùng cho |
|--------|-----|----------|
| `style.SUCCESS(text)` | 🟢 Xanh lá sáng | Thành công, hoàn tất |
| `style.WARNING(text)` | 🟡 Vàng sáng | Cảnh báo |
| `style.ERROR(text)` | 🔴 Đỏ sáng | Lỗi, dừng khẩn cấp |
| `style.INFO(text)` | 🔵 Cyan sáng | Thông tin, tiến trình |
| `style.HEADER(text)` | 🟣 Magenta đậm | Tiêu đề, phân cách |
| `style.NOTICE(text)` | ⚪ Trắng đậm | Thông báo chung |
| `style.DIM(text)` | 🩶 Xám mờ | Đếm ngược, phụ |
| `style.slow_print(text)` | 🐢 Typewriter | In chậm từng ký tự |

---

<p align="center">
  <b>Made with ❤️ by LongLouis</b><br>
  <i>AutoTyper v2.0 — Tự động hóa mọi thứ!</i>
</p>
