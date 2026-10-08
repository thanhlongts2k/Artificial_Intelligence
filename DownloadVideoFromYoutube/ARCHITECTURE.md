# ARCHITECTURE.md — Kiến Trúc Hệ Thống (TubeX Web PWA)

## 📌 1. Tổng Quan Hệ Thống (System Overview)
**TubeX Web PWA** là ứng dụng web lũy tiến (Progressive Web App) kết hợp backend REST API (Flask + yt-dlp) phục vụ nhu cầu trích xuất thông tin, tìm kiếm, tải video/audio YouTube chất lượng cao (144p - 4K, MP3 CBR 192k) và hỗ trợ nghe nhạc ngầm khi tắt màn hình trên di động (iOS & Android).

---

## 🏗️ 2. Kiến Trúc Phân Tầng (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│               CLIENT LAYER (Progressive Web App)                │
│   - HTML5 / CSS3 Dark Glassmorphism                             │
│   - Service Worker (sw.js - Cache v2.4.1, Offline App Shell)   │
│   - Web MediaSession API (Lock Screen, Dynamic Island, Scrubber)│
│   - Screen WakeLock API & Picture-in-Picture (PiP)              │
│   - LocalStorage Caching (Playback speed, Proxy config)         │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP / REST APIs
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SERVER LAYER (Python Flask)                    │
│   - App Controller (app.py)                                     │
│   - Endpoints:                                                  │
│     * GET /                  : Render App Shell & Local IP      │
│     * GET /api/search        : Tìm kiếm YouTube (extract_flat)  │
│     * GET /api/info          : Phân tích chi tiết Video Stream  │
│     * GET /api/stream        : Proxy streaming HTTP 206 Partial │
│     * GET /api/download      : Ghép luồng & Tải file (FFmpeg)   │
│   - Multi-tier Fallback Engine (extract_info_robust)            │
│   - In-Memory Stream Cache (STREAM_CACHE)                       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE & MEDIA ENGINE                   │
│   - yt-dlp (Core Extractor với android + visionos clients)      │
│   - FFmpeg (Audio/Video Muxing, Transcoding)                    │
│   - Node.js / Deno / Bun runtime (YouTube EJS Challenge Solver) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ 3. Các Bất Biến Hệ Thống (System Invariants)

1. **Bypass BotGuard & Datacenter Ban & Proxy Resilience:**
   - Bộ `player_client` ưu tiên kết hợp `['android', 'visionos', 'tv_embedded', 'android_creator']`. Tuyệt đối không dùng client `web` độc lập trên môi trường máy chủ đám mây (Render, VPS).
   - Cơ chế Multi-tier Fallback Engine tự động phục hồi khi gặp sự cố hạn chế IP Datacenter, yêu cầu xác minh bot hoặc Cookie hết hạn.
   - **Tự động khôi phục kết nối (Proxy Auto-Fallback):** Khi Proxy gặp sự cố cạn băng thông (`402 Payment Required`), lỗi xác thực (`407`), hoặc chết kết nối (`Tunnel failed / Connection refused`), hệ thống tự động loại bỏ proxy và fallback sang kết nối trực tiếp (Direct Connection) cho cả tìm kiếm (`/api/search`), trích xuất (`/api/info`), streaming (`/api/stream`), và tải file (`/api/download`).
2. **Không Cache API Động:**
   - Service Worker (`sw.js`) tuyệt đối không lưu cache các route bắt đầu bằng `/api/` để đảm bảo kết quả tìm kiếm và luồng phát luôn tươi mới.
3. **Safe Area & Responsive:**
   - Viewport luôn kích hoạt `viewport-fit=cover` và CSS `body` sử dụng `max(..., env(safe-area-inset-*))` để giao diện tràn viền chuẩn xác trên iPhone có tai thỏ / Dynamic Island.
4. **Phát Ngầm Độc Lập:**
   - Trình phát hỗ trợ 2 chế độ độc lập: `video` (kèm PiP) và `audio` (tối ưu tiết kiệm pin, nghe khi tắt màn hình).
   - Tốc độ phát (`playbackRate`) được đồng bộ liên tục qua `mediaSession.setPositionState`.

---

## 📡 4. Hợp Đồng API (API Contracts)

### A. GET `/api/search`
- **Mục đích:** Tìm kiếm danh sách video YouTube siêu tốc.
- **Query Params:**
  - `q` (string, bắt buộc): Từ khóa tìm kiếm.
  - `limit` (int, tùy chọn, mặc định 20): Số lượng kết quả (1 - 30).
- **Response Format:**
  ```json
  {
    "query": "thoi su 19h",
    "count": 10,
    "results": [
      {
        "id": "RZ9dLNOtcVs",
        "title": "Thời sự 19h hôm nay",
        "url": "https://www.youtube.com/watch?v=RZ9dLNOtcVs",
        "uploader": "VTV24",
        "duration": 1886,
        "duration_formatted": "31:26",
        "thumbnail": "https://i.ytimg.com/vi/RZ9dLNOtcVs/hqdefault.jpg",
        "view_count": 72711,
        "view_count_formatted": "72.7K lượt xem"
      }
    ]
  }
  ```

### B. GET `/api/info`
- **Mục đích:** Lấy metadata chi tiết và danh sách định dạng có thể tải.
- **Query Params:** `url` (string, bắt buộc).

### C. GET `/api/stream`
- **Mục đích:** Cung cấp luồng phát trực tiếp hỗ trợ HTTP 206 Partial Content (tua nhanh tức thì).
- **Query Params:** `url` (string), `type` (`video` | `audio`).

### D. GET `/api/download`
- **Mục đích:** Tải file về máy, tự động ghép audio/video qua FFmpeg.
