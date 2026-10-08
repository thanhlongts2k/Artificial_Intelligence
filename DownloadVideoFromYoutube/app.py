import os
import sys
import re
import shutil
import yt_dlp
import traceback
import tempfile
import time
import threading
import logging
import webbrowser
import socket
import urllib.request
import urllib.error
import imageio_ffmpeg
from flask import Flask, request, jsonify, render_template, send_file, has_request_context, Response, stream_with_context
from flask_cors import CORS

# Detect Environment
IS_CLOUD = os.environ.get('RENDER') is not None
PORT = int(os.environ.get('PORT', 5000))

# Determine paths
if getattr(sys, 'frozen', False):
    application_path = sys._MEIPASS
    exe_dir = os.path.dirname(sys.executable)
else:
    application_path = os.path.dirname(os.path.abspath(__file__))
    exe_dir = application_path

template_folder = os.path.join(application_path, 'templates')
static_folder = os.path.join(application_path, 'static')

# Logging
if IS_CLOUD:
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
else:
    LOGS_DIR = os.path.join(exe_dir, 'Logs')
    if not os.path.exists(LOGS_DIR): os.makedirs(LOGS_DIR)
    logging.basicConfig(filename=os.path.join(LOGS_DIR, 'server.log'), level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
CORS(app)

# Global Error Handler
@app.errorhandler(Exception)
def handle_exception(e):
    err = traceback.format_exc()
    logging.error(f"SERVER ERROR: {str(e)}\n{err}")
    return jsonify({
        "error": "Internal Server Error",
        "details": str(e),
        "traceback": err if not IS_CLOUD else "Check Render Logs"
    }), 500

# FFmpeg & Temp
TEMP_DOWNLOAD_DIR = os.path.join(tempfile.gettempdir(), 'ytdl_tool')
if not os.path.exists(TEMP_DOWNLOAD_DIR): os.makedirs(TEMP_DOWNLOAD_DIR)
FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()

# Cookies & Proxy variables
COOKIE_FILE_PATH = os.path.join(tempfile.gettempdir(), 'ytdl_cookies.txt')
YOUTUBE_COOKIES = os.environ.get('YOUTUBE_COOKIES')
YOUTUBE_POT = os.environ.get('YOUTUBE_POT')
YOUTUBE_VISITOR_DATA = os.environ.get('YOUTUBE_VISITOR_DATA')
YOUTUBE_PROXY = os.environ.get('YOUTUBE_PROXY')

def init_cookies():
    if YOUTUBE_COOKIES:
        try:
            content = YOUTUBE_COOKIES.replace('\\n', '\n').strip()
            with open(COOKIE_FILE_PATH, 'w', encoding='utf-8') as f:
                f.write(content)
            logging.info(f"[+] Cookies initialized")
        except Exception as e:
            logging.error(f"[-] Cookie error: {e}")

init_cookies()

def clean_youtube_url(url):
    if not url:
        return url
    url = url.strip()
    match = re.search(r'(?:youtube\.com/(?:watch\?.*v=|shorts/)|youtu\.be/)([\w-]{11})', url)
    if match:
        return f"https://www.youtube.com/watch?v={match.group(1)}"
    return url

def setup_ydl_opts(opts):
    base_opts = {
        'nocheckcertificate': True,
        'cache_dir': os.path.join(tempfile.gettempdir(), 'ytdl_cache'),
        'ffmpeg_location': FFMPEG_PATH,
        'noplaylist': True,
        'remote_components': ['ejs:github'],
    }

    # Auto-detect available JavaScript runtime (Node.js, Deno, Bun, QuickJS) for solving YouTube challenges & bot protection
    js_runtimes = {}
    for rt in ['node', 'deno', 'bun', 'quickjs']:
        rt_path = shutil.which(rt)
        if rt_path:
            js_runtimes[rt] = {'path': rt_path}
    if js_runtimes:
        base_opts['js_runtimes'] = js_runtimes

    if os.path.exists(COOKIE_FILE_PATH):
        base_opts['cookiefile'] = COOKIE_FILE_PATH

    # PO Token & Visitor Data nếu được cấu hình
    yt_args = {}
    if YOUTUBE_POT: yt_args['po_token'] = [YOUTUBE_POT]
    if YOUTUBE_VISITOR_DATA: yt_args['visitor_data'] = [YOUTUBE_VISITOR_DATA]

    # Always ensure safe clients (android, visionos) that bypass Web botguard and sign-in errors
    yt_args['player_client'] = ['android', 'visionos']

    if yt_args:
        base_opts.setdefault('extractor_args', {})['youtube'] = yt_args

    # Proxy Logic
    proxy = YOUTUBE_PROXY
    if has_request_context():
        p = request.args.get('proxy')
        if p: proxy = p

    if proxy:
        base_opts['proxy'] = proxy
        logging.info(f"[*] Proxy active: {proxy[:15]}...")

    base_opts.update(opts)
    return base_opts

def extract_info_robust(base_opts, url, download=False):
    """
    Trích xuất info video đa tầng (Multi-tier resilient extraction).
    Tự động thử các bộ client an toàn (android, visionos) và fallback nếu gặp lỗi
    'Sign in to confirm you're not a bot' từ IP Datacenter hoặc Cookie hết hạn.
    """
    attempts = [
        # Tier 1: Cấu hình chuẩn với android + visionos
        base_opts,
        # Tier 2: Loại bỏ cookiefile (tránh cookie bị expire/flagged trên cloud) + android & visionos
        {**{k: v for k, v in base_opts.items() if k != 'cookiefile'}, 'extractor_args': {'youtube': {'player_client': ['android', 'visionos']}}},
        # Tier 3: Pure visionos không cookiefile
        {**{k: v for k, v in base_opts.items() if k != 'cookiefile'}, 'extractor_args': {'youtube': {'player_client': ['visionos']}}},
        # Tier 4: Pure android không cookiefile
        {**{k: v for k, v in base_opts.items() if k != 'cookiefile'}, 'extractor_args': {'youtube': {'player_client': ['android']}}},
    ]
    
    last_err = None
    for i, opts in enumerate(attempts):
        try:
            ydl = yt_dlp.YoutubeDL(opts)
            info = ydl.extract_info(url, download=download)
            return info, ydl
        except Exception as e:
            last_err = e
            err_str = str(e).lower()
            is_recoverable = any(k in err_str for k in ['sign in', 'bot', 'confirm', 'requested format is not available', 'not available', 'login'])
            if not is_recoverable and i == 0:
                raise e
            logging.warning(f"[!] Extraction tier {i+1} failed ({str(e)[:80]}). Retrying next tier...")
    raise last_err

def get_lan_ip():
    if IS_CLOUD: return "CLOUD"
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def format_bytes(bytes_val):
    if not bytes_val or bytes_val <= 0:
        return "N/A"
    if bytes_val >= 1024 * 1024 * 1024:
        return f"{bytes_val / (1024**3):.2f} GB"
    return f"{bytes_val / (1024**2):.1f} MB"

def format_duration(seconds):
    if not seconds:
        return ""
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"

def format_views(count):
    if not count:
        return ""
    try:
        c = int(count)
        if c >= 1_000_000:
            return f"{c / 1_000_000:.1f}M lượt xem"
        if c >= 1_000:
            return f"{c / 1_000:.1f}K lượt xem"
        return f"{c} lượt xem"
    except (ValueError, TypeError):
        return ""

@app.route('/api/search')
def search_videos():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'Vui lòng nhập từ khóa tìm kiếm'}), 400
    
    limit = request.args.get('limit', 10, type=int)
    limit = max(1, min(limit, 20))
    
    ydl_opts = setup_ydl_opts({
        'extract_flat': True,
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
    })
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            search_target = f"ytsearch{limit}:{query}"
            res = ydl.extract_info(search_target, download=False)
            entries = res.get('entries', []) or []
            
            results = []
            for entry in entries:
                if not entry or not entry.get('id'):
                    continue
                video_id = entry.get('id')
                duration = entry.get('duration') or 0
                thumbs = entry.get('thumbnails') or []
                thumb_url = thumbs[-1].get('url') if thumbs else f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                
                results.append({
                    'id': video_id,
                    'title': entry.get('title') or 'Không có tiêu đề',
                    'url': f"https://www.youtube.com/watch?v={video_id}",
                    'uploader': entry.get('uploader') or entry.get('channel') or 'YouTube',
                    'duration': duration,
                    'duration_formatted': format_duration(duration),
                    'thumbnail': thumb_url,
                    'view_count': entry.get('view_count'),
                    'view_count_formatted': format_views(entry.get('view_count')),
                })
            
            return jsonify({
                'query': query,
                'count': len(results),
                'results': results
            })
    except Exception as e:
        logging.error(f'Lỗi tìm kiếm YouTube với từ khóa "{query}": {str(e)}')
        return jsonify({'error': f"Lỗi tìm kiếm: {str(e)}"}), 500

@app.route('/')
def home():
    return render_template('index.html', host_ip=get_lan_ip())

@app.route('/manifest.json')
def serve_manifest():
    return send_file(os.path.join(static_folder, 'manifest.json'), mimetype='application/manifest+json')

@app.route('/sw.js')
def serve_sw():
    response = send_file(os.path.join(static_folder, 'sw.js'), mimetype='application/javascript')
    response.headers['Service-Worker-Allowed'] = '/'
    response.headers['Cache-Control'] = 'no-cache'
    return response

@app.route('/api/info')
def get_info():
    url = request.args.get('url')
    if not url: return jsonify({'error': 'URL is required'}), 400
    url = clean_youtube_url(url)
    
    ydl_opts = setup_ydl_opts({
        'quiet': True,
        'no_warnings': True,
        'ffmpeg_location': FFMPEG_PATH,
    })
    
    try:
        info, _ = extract_info_robust(ydl_opts, url, download=False)
        duration = info.get('duration') or 0
        
        # Bảng bitrate ước tính mặc định (kbps) theo chuẩn nén YouTube
        TYPICAL_BITRATES = {
            2160: 20000,
            1440: 10000,
            1080: 3200,
            720: 1500,
            480: 800,
            360: 450,
            240: 250,
            144: 120,
        }

        # 1. Tìm audio stream tốt nhất để cộng dồn dung lượng video
        best_audio_size = 0
        best_audio_id = None
        for f in info.get('formats', []):
            if f.get('vcodec') == 'none' and f.get('acodec') != 'none':
                abr = f.get('abr') or f.get('tbr') or 0
                size = f.get('filesize') or f.get('filesize_approx')
                if not size and abr and duration:
                    size = int((abr * 1000 / 8) * duration)
                if size and size > best_audio_size:
                    best_audio_size = size
                    best_audio_id = f.get('format_id')
        
        if not best_audio_size and duration:
            best_audio_size = int((128 * 1000 / 8) * duration)

        def get_standard_res(width, height, format_note=''):
            w = width or 0
            h = height or 0
            if format_note and 'p' in format_note:
                m = re.search(r'(\d+)p', format_note)
                if m:
                    val = int(m.group(1))
                    if val in [2160, 1440, 1080, 720, 480, 360, 240, 144]:
                        return val
            if w >= 3800 or h >= 2100: return 2160
            if w >= 2500 or h >= 1400: return 1440
            if w >= 1900 or h >= 950: return 1080
            if w >= 1200 or h >= 650: return 720
            if w >= 800 or h >= 400: return 480
            if w >= 600 or h >= 300: return 360
            if w >= 400 or h >= 200: return 240
            return h

        # 2. Gom nhóm video format theo standard resolution
        res_map = {}
        for f in info.get('formats', []):
            vcodec = f.get('vcodec')
            height = f.get('height')
            width = f.get('width')
            format_note = f.get('format_note') or ''
            if not vcodec or vcodec == 'none' or not height:
                continue

            std_res = get_standard_res(width, height, format_note)

            raw_size = f.get('filesize') or f.get('filesize_approx')
            vbr = f.get('vbr') or f.get('tbr') or 0
            is_approx = False
            if not raw_size and duration:
                eff_br = vbr or TYPICAL_BITRATES.get(std_res, 1000)
                raw_size = int((eff_br * 1000 / 8) * duration)
                is_approx = True

            is_video_only = (f.get('acodec') == 'none')
            final_size = (raw_size + best_audio_size) if (raw_size and is_video_only) else raw_size

            # Điểm ưu tiên: mp4, codec avc1, có size rõ ràng
            score = 0
            if f.get('ext') == 'mp4': score += 10
            if str(vcodec).startswith('avc'): score += 15
            if f.get('filesize'): score += 20
            elif f.get('filesize_approx'): score += 10
            elif raw_size: score += 5

            current = res_map.get(std_res)
            if not current or score > current['score']:
                badge = ""
                if std_res >= 2160: badge = "4K Ultra HD"
                elif std_res >= 1440: badge = "2K QHD"
                elif std_res >= 1080: badge = "Full HD"
                elif std_res >= 720: badge = "HD"

                res_map[std_res] = {
                    'format_id': f.get('format_id'),
                    'ext': 'mp4',
                    'resolution': f"{std_res}p",
                    'res_label': f"{std_res}p",
                    'quality_badge': badge,
                    'filesize': final_size,
                    'filesize_formatted': format_bytes(final_size),
                    'is_approx': is_approx,
                    'fps': f.get('fps'),
                    'height': std_res,
                    'type': 'video',
                    'score': score
                }

        formats = sorted(res_map.values(), key=lambda x: x['height'], reverse=True)
        for f in formats: f.pop('score', None)

        # 3. Thêm tùy chọn Tải Âm thanh (Audio MP3 & M4A)
        if best_audio_id:
            # Tính toán chuẩn dung lượng file MP3 192kbps sau khi FFmpeg transcode
            mp3_size = int((192 * 1000 / 8) * duration) if duration else int(best_audio_size * 1.38)
            formats.append({
                'format_id': best_audio_id,
                'ext': 'mp3',
                'resolution': 'Audio (MP3)',
                'res_label': 'Chỉ Âm thanh (Audio MP3 - 192kbps)',
                'quality_badge': 'HQ MP3',
                'filesize': mp3_size,
                'filesize_formatted': format_bytes(mp3_size),
                'is_approx': False,
                'fps': None,
                'height': 0,
                'type': 'audio'
            })
            # Tùy chọn M4A (Âm thanh AAC gốc từ YouTube, tải siêu tốc không cần nén lại)
            formats.append({
                'format_id': best_audio_id,
                'ext': 'm4a',
                'resolution': 'Audio (M4A)',
                'res_label': 'Âm thanh Gốc YouTube (M4A - Tải Siêu Nhanh)',
                'quality_badge': 'Fast M4A',
                'filesize': best_audio_size,
                'filesize_formatted': format_bytes(best_audio_size),
                'is_approx': False,
                'fps': None,
                'height': -1,
                'type': 'audio'
            })

        # Pre-cache stream info for immediate zero-delay playback
        active_proxy = request.args.get('proxy') or YOUTUBE_PROXY
        for stype in ['audio', 'video']:
            fmt = select_best_stream_format(info, stype)
            if fmt and fmt.get('url'):
                if stype == 'audio':
                    ctype = 'video/mp4' if fmt.get('vcodec') != 'none' else ('audio/webm' if fmt.get('ext') == 'webm' else 'audio/mp4')
                else:
                    ctype = 'video/webm' if fmt.get('ext') == 'webm' else 'video/mp4'
                set_cached_stream_info(f"{url}_{stype}_{active_proxy or ''}", {
                    'url': fmt['url'],
                    'http_headers': fmt.get('http_headers', {}),
                    'ext': fmt.get('ext', 'mp4'),
                    'content_type': ctype
                })

        return jsonify({
            'title': info.get('title'),
            'thumbnail': info.get('thumbnail'),
            'uploader': info.get('uploader'),
            'duration': duration,
            'duration_formatted': format_duration(duration),
            'view_count': info.get('view_count'),
            'formats': formats
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug')
def debug_info():
    cookie_exists = os.path.exists(COOKIE_FILE_PATH)
    return jsonify({
        'is_cloud': IS_CLOUD,
        'yt_dlp_version': yt_dlp.version.__version__,
        'ffmpeg_exists': os.path.exists(FFMPEG_PATH) if FFMPEG_PATH else False,
        'cookie_file_exists': cookie_exists,
        'proxy_present': YOUTUBE_PROXY is not None,
        'python_version': sys.version
    })

# Stream Cache to prevent re-extracting stream URL on rapid seek/Range requests
STREAM_CACHE = {}
STREAM_CACHE_TTL = 900  # 15 minutes

def get_cached_stream_info(cache_key):
    entry = STREAM_CACHE.get(cache_key)
    if entry and time.time() - entry['timestamp'] < STREAM_CACHE_TTL:
        return entry['data']
    return None

def set_cached_stream_info(cache_key, data):
    now = time.time()
    for k in list(STREAM_CACHE.keys()):
        if now - STREAM_CACHE[k]['timestamp'] > STREAM_CACHE_TTL:
            STREAM_CACHE.pop(k, None)
    STREAM_CACHE[cache_key] = {'data': data, 'timestamp': now}

def select_best_stream_format(info, stream_type='video'):
    formats = info.get('formats', [])
    selected_format = None
    
    if stream_type == 'audio':
        # 1. Format m4a có audio codec (AAC chuẩn iOS & Android)
        selected_format = next(
            (f for f in formats if (f.get('ext') == 'm4a' or 'mp4a' in str(f.get('acodec', ''))) and f.get('vcodec') == 'none' and f.get('url')),
            None
        )
        # 2. Format audio bất kỳ có URL (WebM/Opus)
        if not selected_format:
            selected_format = next(
                (f for f in formats if f.get('acodec') != 'none' and f.get('vcodec') == 'none' and f.get('url')),
                None
            )
        # 3. Fallback: Progressive MP4 (format 18 chứa AAC audio rất nhẹ)
        if not selected_format:
            selected_format = next(
                (f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none' and f.get('url')),
                None
            )
    else:
        # stream_type == 'video'
        # 1. Progressive MP4 (có cả vcodec và acodec, vd format 18, 22)
        selected_format = next(
            (f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none' and f.get('ext') == 'mp4' and f.get('url')),
            None
        )
        # 2. Format có cả vcodec và acodec bất kỳ
        if not selected_format:
            selected_format = next(
                (f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none' and f.get('url')),
                None
            )
        # 3. Format video mp4 bất kỳ có URL
        if not selected_format:
            selected_format = next(
                (f for f in formats if f.get('vcodec') != 'none' and f.get('ext') == 'mp4' and f.get('url')),
                None
            )
        # 4. Format video bất kỳ có URL
        if not selected_format:
            selected_format = next(
                (f for f in formats if f.get('vcodec') != 'none' and f.get('url')),
                None
            )
            
    return selected_format

@app.route('/api/stream')
def stream_media():
    """
    Streaming proxy hỗ trợ phát video/audio trực tiếp trên trình duyệt,
    xử lý đầy đủ HTTP Range (206 Partial Content), định tuyến chuẩn qua Proxy
    để bypass 403 Forbidden và chạy mượt mà dưới nền di động.
    """
    url = request.args.get('url')
    stream_type = request.args.get('type', 'video')  # Mặc định là video
    active_proxy = request.args.get('proxy') or YOUTUBE_PROXY
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    url = clean_youtube_url(url)
    
    cache_key = f"{url}_{stream_type}_{active_proxy or ''}"
    stream_info = get_cached_stream_info(cache_key)
    
    if not stream_info:
        ydl_opts = setup_ydl_opts({
            'quiet': True,
            'no_warnings': True,
            'ffmpeg_location': FFMPEG_PATH,
        })
        if active_proxy:
            ydl_opts['proxy'] = active_proxy

        try:
            info, _ = extract_info_robust(ydl_opts, url, download=False)
            selected_format = select_best_stream_format(info, stream_type)
            
            if not selected_format or not selected_format.get('url'):
                # Fallback chéo nếu kiểu yêu cầu không tìm thấy
                fallback_type = 'audio' if stream_type == 'video' else 'video'
                selected_format = select_best_stream_format(info, fallback_type)

            if not selected_format or not selected_format.get('url'):
                return jsonify({'error': 'Không tìm thấy stream trực tiếp phù hợp'}), 404

            if stream_type == 'audio':
                content_type = 'video/mp4' if selected_format.get('vcodec') != 'none' else ('audio/webm' if selected_format.get('ext') == 'webm' else 'audio/mp4')
            else:
                content_type = 'video/webm' if selected_format.get('ext') == 'webm' else 'video/mp4'

            stream_info = {
                'url': selected_format['url'],
                'http_headers': selected_format.get('http_headers', {}),
                'ext': selected_format.get('ext', 'mp4'),
                'content_type': content_type
            }
            set_cached_stream_info(cache_key, stream_info)
        except Exception as e:
            return jsonify({'error': f"Lỗi trích xuất stream: {str(e)}"}), 500

    stream_target_url = stream_info['url']
    http_headers = stream_info.get('http_headers', {}).copy()
    if 'User-Agent' not in http_headers and 'user-agent' not in http_headers:
        http_headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    
    # Chuyển tiếp Range header từ client (Safari/Chrome yêu cầu Range để seek)
    range_header = request.headers.get('Range')
    if range_header:
        http_headers['Range'] = range_header

    try:
        req = urllib.request.Request(stream_target_url, headers=http_headers)
        
        # BẮT BUỘC: Khi server có cấu hình YOUTUBE_PROXY, request upstream stream
        # PHẢI định tuyến qua cùng proxy đó để khớp IP signature của googlevideo, tránh lỗi 403 Forbidden
        if active_proxy:
            proxy_handler = urllib.request.ProxyHandler({
                'http': active_proxy,
                'https': active_proxy
            })
            opener = urllib.request.build_opener(proxy_handler)
        else:
            opener = urllib.request.build_opener()

        upstream_resp = opener.open(req, timeout=25)
        status_code = upstream_resp.status
        
        response_headers = {
            'Content-Type': stream_info['content_type'],
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
        }
        if upstream_resp.headers.get('Content-Range'):
            response_headers['Content-Range'] = upstream_resp.headers.get('Content-Range')
        if upstream_resp.headers.get('Content-Length'):
            response_headers['Content-Length'] = upstream_resp.headers.get('Content-Length')

        def generate_chunks():
            try:
                while True:
                    chunk = upstream_resp.read(64 * 1024)  # 64KB chunks
                    if not chunk:
                        break
                    yield chunk
            except (GeneratorExit, socket.error, Exception):
                pass
            finally:
                try:
                    upstream_resp.close()
                except Exception:
                    pass

        return Response(stream_with_context(generate_chunks()), status=status_code, headers=response_headers)
    except urllib.error.HTTPError as he:
        STREAM_CACHE.pop(cache_key, None)
        return jsonify({'error': f"Upstream stream error: {he.code}"}), he.code
    except Exception as e:
        STREAM_CACHE.pop(cache_key, None)
        return jsonify({'error': f"Lỗi kết nối stream: {str(e)}"}), 500

@app.route('/api/download')
def download_video():
    url = request.args.get('url')
    format_id = request.args.get('format_id')
    title = request.args.get('title', 'video')
    format_type = request.args.get('type', 'video')
    ext = request.args.get('ext', 'mp4')
    download_token = request.args.get('token')
    
    if not url: return jsonify({'error': 'URL is required'}), 400
    url = clean_youtube_url(url)

    clean_title = "".join([c for c in title if c.isalnum() or c in (' ', '.', '_', '-')]).strip()
    if not clean_title: clean_title = 'video'

    output_path = os.path.join(TEMP_DOWNLOAD_DIR, f'dl_{int(time.time())}_%(id)s.%(ext)s')

    if format_type == 'audio' and ext == 'm4a':
        safe_filename = f"{clean_title}.m4a"
        ydl_opts = setup_ydl_opts({
            'format': 'bestaudio[ext=m4a]/bestaudio',
            'outtmpl': output_path,
            'ffmpeg_location': FFMPEG_PATH,
        })
    elif format_type == 'audio' or ext == 'mp3':
        safe_filename = f"{clean_title}.mp3"
        ydl_opts = setup_ydl_opts({
            'format': 'bestaudio/best',
            'outtmpl': output_path,
            'ffmpeg_location': FFMPEG_PATH,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        })
    else:
        safe_filename = f"{clean_title}.mp4"
        ydl_opts = setup_ydl_opts({
            'format': f'{format_id}+bestaudio[ext=m4a]/bestaudio/{format_id}/best',
            'outtmpl': output_path,
            'merge_output_format': 'mp4',
            'ffmpeg_location': FFMPEG_PATH,
        })

    try:
        info, ydl = extract_info_robust(ydl_opts, url, download=True)
        file_path = ydl.prepare_filename(info)
        if format_type == 'audio':
            target_ext = '.m4a' if ext == 'm4a' else '.mp3'
        else:
            target_ext = '.mp4'
        
        if not os.path.exists(file_path):
            file_path = os.path.splitext(file_path)[0] + target_ext
        
        if os.path.exists(file_path):
            def cleanup():
                time.sleep(60)
                try: os.remove(file_path)
                except: pass
            threading.Thread(target=cleanup, daemon=True).start()
            
            response = send_file(file_path, as_attachment=True, download_name=safe_filename)
            if download_token:
                response.set_cookie('download_token', download_token, path='/', max_age=120)
            return response
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        response = jsonify({'error': str(e)})
        response.status_code = 500
        if download_token:
            response.set_cookie('download_token', f'error_{download_token}', path='/', max_age=120)
        return response

if __name__ == '__main__':
    if os.path.exists(TEMP_DOWNLOAD_DIR):
        try:
            for f in os.listdir(TEMP_DOWNLOAD_DIR): os.remove(os.path.join(TEMP_DOWNLOAD_DIR, f))
        except: pass
            
    if not IS_CLOUD:
        threading.Thread(target=lambda: (time.sleep(1.5), webbrowser.open(f'http://127.0.0.1:{PORT}')), daemon=True).start()
    
    app.run(debug=False, port=PORT, threaded=True, host='0.0.0.0')
