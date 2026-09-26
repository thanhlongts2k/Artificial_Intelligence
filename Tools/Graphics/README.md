# 🐢 Graphics Tools & Turtle Mini-Games

Bộ sưu tập các ứng dụng đồ họa và mini game tương tác xây dựng bằng thư viện `turtle` trong Python.

---

## 📁 Danh sách công cụ

| File | Tên ứng dụng | Mô tả | Cách chạy |
|------|-------------|-------|-----------|
| `main.py` | **Vẽ hoa đổi màu** | Vẽ họa tiết cánh hoa xoắn ốc đổi màu liên tục (Xanh dương, Đỏ, Xanh lá) | `python main.py` |
| `mini_paint.py` | **Mini Paint** | Bảng vẽ tương tác bằng chuột, có 3 nút chọn màu (Đỏ, Xanh lá, Vàng) và chống vẽ lem thanh công cụ | `python mini_paint.py` |
| `rank_turtle.py` | **Game Đua Rùa** | 4 chú rùa (Đỏ, Xanh, Cam, Tím) thi chạy đua về đích ngẫu nhiên với trọng tài công bố chiến thắng | `python rank_turtle.py` |

---

## 🚀 Hướng dẫn chạy

### Yêu cầu
- Python 3.10+
- Thư viện `turtle` (có sẵn trong bộ cài đặt chuẩn của Python trên Windows, macOS và Linux).

### 1. Vẽ hoa đổi màu (`main.py`)
Chương trình sử dụng Turtle `x` với tốc độ cao nhất (`speed(0)`) và nét vẽ `pensize(2)` để vẽ mô hình hình học xoắn ốc 3 màu.
```bash
cd D:\AgentAI\Artificial_Intelligence\Tools\Graphics
python main.py
```
> Nhấp chuột vào cửa sổ đồ họa để thoát khi vẽ xong.

### 2. Mini Paint (`mini_paint.py`)
Bảng vẽ tương tác thời gian thực:
- **Kéo chuột trái**: Vẽ tự do trên khung canvas.
- **Click chuột trái**: Đặt bút vẽ tại vị trí mới.
- **Click vào các khối màu ở góc trên**: Đổi màu nét vẽ sang Đỏ, Xanh lá hoặc Vàng.
- **Vùng an toàn**: Giới hạn tọa độ vẽ dưới `y < 220` để không vẽ đè lên các nút chọn màu.
```bash
python mini_paint.py
```

### 3. Game Đua Rùa (`rank_turtle.py`)
Mini game giải trí kịch tính:
- Trọng tài kẻ vạch đích tại tọa độ `x = 200`.
- 4 chú rùa xuất phát tại vạch `x = -250` với làn chạy độc lập.
- Mỗi lượt rùa tiến lên khoảng cách ngẫu nhiên từ 1 đến 10 pixel.
- Chú rùa đầu tiên vượt vạch đích sẽ được trọng tài công bố chiến thắng trên màn hình.
```bash
python rank_turtle.py
```
