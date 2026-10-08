# 📋 Nhật Ký Thay Đổi (CHANGELOG) — YouTube Downloader

Tất cả các thay đổi quan trọng của dự án **YouTube Downloader (Flask + yt-dlp)** được ghi lại trong tài liệu này theo chuẩn [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ nguyên tắc [Semantic Versioning](https://semver.org/).

---

## [2.3.1] — 2026-10-08

### [Added]
- **Huy hiệu hiển thị phiên bản (Version Badge Footer)**:
  - Bổ sung huy hiệu phiên bản tinh tế `TubeX v2.3.1` kèm đèn tín hiệu xung xanh (pulsing status indicator) ở cuối trang giúp người dùng nhận biết ngay phiên bản hiện tại đã được cập nhật thành công.

### [Fixed]
- **Khắc phục lỗi Tunnel 402 Payment Required & Proxy Failure**:
  - Triển khai cơ chế **Proxy Auto-Fallback Engine**: khi proxy gặp lỗi cạn băng thông (`402 Payment Required`), hết hạn gói cước, lỗi xác thực (`407`) hoặc rớt kết nối (`Tunnel failed / Connection refused`), hệ thống tự động loại bỏ proxy và fallback sang kết nối trực tiếp (Direct Connection).
  - Tích hợp fallback trực tiếp cho API tìm kiếm (`/api/search`), trích xuất thông tin (`/api/info`), luồng phát ngầm (`/api/stream`) và tải tệp (`/api/download`).
  - Tối ưu hóa `extract_info_robust` với cơ chế nhóm phân tầng (Two-group multi-tier): nhận diện lỗi proxy và chuyển ngay sang nhóm Direct Connection trong ~1.7s thay vì thử lại các tier proxy đã chết.

---

## [2.3.0] — 2026-10-08

### [Added]
- **Nút điều chỉnh tốc độ phát thông minh (Playback Speed Control)**:
  - Bổ sung nút chip `[1.0x]` ngay trên thanh điều khiển của trình phát, hỗ trợ xoay vòng các nấc tốc độ: `0.75x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`.
  - Tự động áp dụng đồng bộ cho cả chế độ Xem Video & PiP lẫn Nghe ngầm tắt màn hình (Audio Mode).
  - Tích hợp `localStorage` ghi nhớ tốc độ ưa thích, tự động áp dụng lại khi mở bài mới hoặc tải lại trang PWA.
  - Đồng bộ `playbackRate` lên Media Session API giúp màn hình khóa iOS, Dynamic Island và thanh điều khiển Android hiển thị tốc độ chính xác.
- **Tìm kiếm video trực tiếp từ YouTube (In-App YouTube Search)**:
  - Tích hợp thuật toán phân loại đầu vào thông minh: tự động phân biệt giữa URL YouTube và từ khóa tìm kiếm (ví dụ: *"thời sự 19h"*, *"nhạc lofi"*).
  - Endpoint mới `/api/search` khai thác cơ chế `extract_flat` của `yt-dlp` cho tốc độ phản hồi cực nhanh (~1.2s), không yêu cầu API Key của YouTube.
  - Giao diện lưới kết quả tìm kiếm Dark Glassmorphism trực quan: hiển thị ảnh bìa, badge thời lượng, tiêu đề, tên kênh và số lượt xem.
  - Hỗ trợ 2 nút hành động nhanh trên mỗi thẻ: **`▶ Nghe ngay`** (nạp và phát ngầm tức thì) và **`⬇ Tải về`** (xem danh sách định dạng để lưu video).
  - Hỗ trợ phím `Enter` trên bàn phím di động và máy tính để kích hoạt tìm kiếm nhanh.

### [Changed]
- Nâng cấp phiên bản PWA Service Worker Cache lên `yt-downloader-pwa-v2.3` và cache busting asset `?v=2.3`.

---

## [2.2.0] — 2026-10-07

### [Fixed]
- **Khắc phục lỗi "Sign in to confirm you’re not a bot" trên Render / Cloud**:
  - Chuyển đổi bộ `player_client` từ `['android', 'ios', 'web']` sang cặp client an toàn `['android', 'visionos']`. Loại bỏ hoàn toàn client `web` vốn kích hoạt cơ chế BotGuard của YouTube trên các địa chỉ IP trung tâm dữ liệu (Datacenter IP).
  - Client `visionos` (Apple Vision Pro) giúp khai thác đầy đủ 44 định dạng chất lượng cao (lên tới 1080p, 1440p, 4K, M4A, WebM) với URL trực tiếp mà không bị yêu cầu đăng nhập.
  - Client `android` đảm bảo Format 18 (MP4 360p H.264 + AAC Stereo) luôn luôn sẵn sàng cho trình phát trực tiếp dưới nền.
- **Xây dựng cơ chế phục hồi trích xuất đa tầng (`extract_info_robust`)**:
  - Tự động bắt các ngoại lệ liên quan đến kiểm tra Bot hoặc yêu cầu đăng nhập.
  - Tự động fallback qua các tầng: (1) Cấu hình chuẩn `android + visionos`, (2) Loại bỏ `cookiefile` đề phòng cookie lưu trữ trên Cloud bị hết hạn hoặc bị Google thu hồi, (3) `visionos` độc lập, (4) `android` thuần. Đảm bảo hệ thống tự phục hồi mà không làm gián đoạn người dùng.
- **Sửa lỗi `AbortError` trên trình duyệt di động (iOS Safari & Android Chrome)**:
  - Loại bỏ hoàn toàn lệnh `activePlayer.load()` gọi trước `.play()`, giữ nguyên User Activation Token khi người dùng chạm phát video.
- **Bổ sung cơ chế tua thời gian an toàn (`safeSetCurrentTime`)**:
  - Chặn lỗi `InvalidStateError` khi đổi nguồn phát hoặc tua video lúc `player.readyState < 1`. Lắng nghe sự kiện `loadedmetadata` / `canplay` trước khi gán `currentTime`.
- **Đồng bộ thanh trượt màn hình khóa di động (MediaSession Scrubber)**:
  - Gọi `navigator.mediaSession.setPositionState({ duration, playbackRate, position })` liên tục trong sự kiện `timeupdate`, kích hoạt thanh trượt tua bài trên Màn hình khóa iOS, Dynamic Island và thanh thông báo Android.
- **Đồng bộ MIME Type khi Fallback Audio**:
  - Tự động nhận diện format có video track (như Format 18) để trả về header `Content-Type: video/mp4`, tránh việc iOS AVPlayer báo lỗi `Format error` khi nhận header `audio/mp4`.
- **Cập nhật Cache PWA (Cache Busting)**:
  - Nâng cấp phiên bản Service Worker lên `yt-downloader-pwa-v2` và bổ sung query parameter `?v=2.2` vào các tệp tĩnh `main.js` và `style.css`.

---

## [2.1.0] — 2026-10-06

### [Added]
- **Streaming Proxy với HTTP 206 Partial Content**:
  - Endpoint `/api/stream` hỗ trợ đầy đủ HTTP Range Request từ trình duyệt, cho phép video/audio bắt đầu phát ngay lập tức sau 0.1 giây mà không cần tải hết tệp về máy chủ.
  - Thêm header `Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges` hỗ trợ đa nền tảng.
- **Đệm trước thông tin luồng phát (Pre-caching Stream Info)**:
  - Tự động trích xuất và lưu trước định dạng phát trực tiếp vào `STREAM_CACHE` ngay trong lúc phân tích `/api/info`, loại bỏ hoàn toàn độ trễ 10-15 giây khi người dùng bấm phát.

### [Fixed]
- **Khắc phục lỗi HTTP 403 Forbidden từ googlevideo trên Render**:
  - Định tuyến các yêu cầu đọc luồng phát (`urllib.request`) qua cùng một proxy `YOUTUBE_PROXY` bằng `ProxyHandler`, khớp IP chữ ký được mã hóa trong URL của YouTube.
- **Tương tác chạm trực tiếp vào màn hình Video**:
  - Cho phép chạm trực tiếp vào khung video (`bgVideoPlayer`) để Phát / Tạm dừng trực quan.

---

## [2.0.0] — 2026-10-06

### [Added]
- **Trình phát Video & Nghe nhạc chạy ngầm (Mobile Background Playback)**:
  - Bổ sung nút **"Phát dưới nền"** ngay bên cạnh tên kênh YouTube tại thẻ thông tin video.
  - Hỗ trợ 2 chế độ độc lập:
    - 🎬 **Xem Video & PiP**: Trình phát video chuẩn, hỗ trợ chế độ Cửa sổ nổi Picture-in-Picture khi chuyển ứng dụng.
    - 🎵 **Nghe ngầm (Tắt màn hình)**: Tối ưu cho nghe nhạc/podcast với màn hình khóa trên iOS & Android.
  - Tích hợp **Media Session API**: Hiển thị ảnh bìa (thumbnail), tiêu đề bài hát, tên nghệ sĩ/kênh và các nút điều khiển (Phát, Tạm dừng, Tiến/Lùi 10 giây).
  - Tích hợp **Screen Wake Lock API**: Giữ màn hình luôn sáng khi đang theo dõi video.
- **Ứng dụng Web lũy tiến (Progressive Web App - PWA)**:
  - Bổ sung tệp cấu hình `manifest.json` và bộ biểu tượng chuẩn kích thước (192x192, 512x512, apple-touch-icon, favicon).
  - Tích hợp `sw.js` (Service Worker) hỗ trợ cài đặt ứng dụng (Add to Home Screen) trên cả Android và iOS.
  - Hỗ trợ modal hướng dẫn cài đặt trực quan cho người dùng iPhone/iPad.

---

## [1.2.0] — 2026-10-05

### [Added]
- **Tự động lưu Proxy vào LocalStorage**:
  - Trình duyệt tự động ghi nhớ proxy người dùng đã nhập, tự động kích hoạt cho các lần truy cập sau mà không cần nhập lại.
- **Cơ chế Cookie Token thông báo hoàn tất nén file**:
  - Giao diện tự động đếm giây và lắng nghe cookie `download_token` để chuyển trạng thái nút tải thành "✅ Đã tải xong!" ngay khi file được gửi về trình duyệt.

### [Changed]
- **Tính toán chuẩn dung lượng video**:
  - Bổ sung thuật toán ước tính dung lượng dựa trên bitrate tiêu chuẩn của YouTube kết hợp cộng dồn dung lượng audio tốt nhất cho các video phân giải cao (1080p, 2K, 4K).

---

## [1.1.0] — 2026-09-20

### [Added]
- **Hỗ trợ JavaScript Runtime (EJS Engine)**:
  - Tự động nhận diện Node.js, Deno, Bun hoặc QuickJS trên hệ thống máy chủ để giải quyết các thử thách thuật toán n-challenge của YouTube.
- **Mã QR Mạng Nội Bộ (LAN QR Code)**:
  - Tự động phát hiện địa chỉ IP mạng nội bộ của máy tính chạy server và hiển thị mã QR trực tiếp trên trang chủ để các thiết bị điện thoại cùng mạng Wi-Fi quét và sử dụng.

---

## [1.0.0] — 2026-09-01

### [Added]
- **Phát hành phiên bản đầu tiên của ứng dụng YouTube Downloader**:
  - Giao diện web giao tiếp Flask + Python hiện đại, giao diện tối (Dark Mode), hỗ trợ dán link YouTube nhanh từ clipboard.
  - Hỗ trợ tải các định dạng MP4 từ 144p đến 4K qua FFmpeg.
  - Hỗ trợ tách và tải file âm thanh MP3 (192kbps) và M4A (AAC gốc tải siêu tốc).
  - Kịch bản chạy nhanh 1-Click `run.bat` và đóng gói file chạy độc lập `build.bat` (PyInstaller).
