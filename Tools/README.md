# 🛠️ Artificial Intelligence — Tools Directory

Thư mục tổng hợp các công cụ tự động hóa, đồ họa tương tác và dịch vụ backend độc lập phục vụ cho hệ thống.

---

## 📂 Danh mục các Tool

```
Tools/
├── AutoTyping/          # 🤖 Tool tự động gõ tin nhắn & spam bot có đếm số, build .exe
├── Graphics/            # 🐢 Bộ công cụ đồ họa & mini-game tương tác bằng Python Turtle
└── SendMail/            # 📧 Module Django REST API gửi Email SMTP kèm file, Token Knox & API Key
```

---

## 📌 Tóm tắt chi tiết từng Tool

### 1. [AutoTyping](file:///d:/AgentAI/Artificial_Intelligence/Tools/AutoTyping/README.md) — Bot Gõ Tin Nhắn Tự Động (v2.0)
- **Tính năng chính**:
  - Gõ lặp lại N lần với biến đếm `{count}` tăng dần và ký tự xuống dòng `\br`.
  - Gõ theo danh sách từ file `.txt` (mỗi dòng là một tin nhắn), hỗ trợ lặp nhiều vòng.
  - Phím dừng khẩn cấp `ESC` bất kỳ thời điểm nào.
  - Hệ thống log màu theo chuẩn Django style (ColorStyle ANSI).
  - Có file cấu hình PyInstaller để đóng gói thành file `.exe` portable chạy trên Windows.
- **Công nghệ**: Python 3.10+, `keyboard`, `pyinstaller`.
- **Xem chi tiết**: [Tools/AutoTyping/README.md](file:///d:/AgentAI/Artificial_Intelligence/Tools/AutoTyping/README.md)

---

### 2. [Graphics](file:///d:/AgentAI/Artificial_Intelligence/Tools/Graphics/README.md) — Ứng Dụng Đồ Họa & Mini Game Turtle
- **Tính năng chính**:
  - `main.py`: Vẽ họa tiết cánh hoa xoắn ốc 3 màu với bút vẽ tốc độ cao.
  - `mini_paint.py`: Bảng vẽ mini bằng chuột, chọn màu nét vẽ (Đỏ / Xanh / Vàng), chống vẽ tràn vùng nút bấm.
  - `rank_turtle.py`: Game đua rùa 4 màu thi đấu ngẫu nhiên với trọng tài công bố người chiến thắng.
- **Công nghệ**: Python 3.10+, `turtle` (built-in).
- **Xem chi tiết**: [Tools/Graphics/README.md](file:///d:/AgentAI/Artificial_Intelligence/Tools/Graphics/README.md)

---

### 3. [SendMail](file:///d:/AgentAI/Artificial_Intelligence/Tools/SendMail/README.md) — Dịch Vụ Gửi Email REST API
- **Tính năng chính**:
  - API endpoint `POST /api/send-email/` gửi thư qua SMTP (Gmail App Password).
  - Hỗ trợ gửi đồng thời tới nhiều người nhận (dạng mảng JSON hoặc chuỗi ngăn cách dấu phẩy).
  - Hỗ trợ nội dung Plain text và HTML.
  - Hỗ trợ gửi kèm tệp tin đính kèm (`file` / `files`) đọc trực tiếp từ bộ nhớ RAM.
  - Xác thực linh hoạt 2 chế độ: Knox Token (`Authorization: Token ...`) hoặc API Key (`X-API-KEY: ...`).
  - Ghi nhật ký đầy đủ (`email_send.log`) và đo đạc thời gian chi tiết từng bước (`email_timing.log`).
  - Kèm sẵn file mẫu Postman Collection (`SendMail.postman_collection.json`) để test 1-click.
- **Công nghệ**: Python, Django 4.2+, Django REST Framework, django-rest-knox, python-dotenv.
- **Xem chi tiết**: [Tools/SendMail/README.md](file:///d:/AgentAI/Artificial_Intelligence/Tools/SendMail/README.md)
