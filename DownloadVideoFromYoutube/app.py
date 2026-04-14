import os
import sys
import yt_dlp
import traceback
import tempfile
import time
import threading
import logging
import webbrowser
import socket
import imageio_ffmpeg
from flask import Flask, request, jsonify, render_template, send_file, has_request_context
from flask_cors import CORS

# Detect Environment
IS_CLOUD = os.environ.get('RENDER') is not None
PORT = int(os.environ.get('PORT', 1626))

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

def setup_ydl_opts(opts):
    opts.update({
        'user_agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
        'nocheckcertificate': True,
        'youtube_include_dash_manifest': False,
        'cache_dir': os.path.join(tempfile.gettempdir(), 'ytdl_cache'),
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'web_embedded'],
                'player_skip': ['webpage', 'configs'],
                'use_stable_yt_id': True
            }
        }
    })

    if os.path.exists(COOKIE_FILE_PATH):
        opts['cookiefile'] = COOKIE_FILE_PATH
        if YOUTUBE_POT: opts['extractor_args']['youtube']['po_token'] = [YOUTUBE_POT]
        if YOUTUBE_VISITOR_DATA: opts['extractor_args']['youtube']['visitor_data'] = [YOUTUBE_VISITOR_DATA]

    # Proxy Logic
    proxy = YOUTUBE_PROXY
    if has_request_context():
        p = request.args.get('proxy')
        if p: proxy = p

    if proxy:
        opts['proxy'] = proxy
        logging.info(f"[*] Proxy active: {proxy[:15]}...")

    return opts

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

@app.route('/')
def home():
    return render_template('index.html', host_ip=get_lan_ip())

@app.route('/api/info')
def get_info():
    url = request.args.get('url')
    if not url: return jsonify({'error': 'URL is required'}), 400
    
    ydl_opts = setup_ydl_opts({
        'quiet': True,
        'no_warnings': True,
        'ffmpeg_location': FFMPEG_PATH,
    })
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = []
            seen_res = set()
            
            for f in info.get('formats', []):
                vcodec = f.get('vcodec')
                height = f.get('height')
                if vcodec and vcodec != 'none' and height:
                    res_label = f"{height}p"
                    if res_label not in seen_res:
                        seen_res.add(res_label)
                        formats.append({
                            'format_id': f.get('format_id'),
                            'ext': 'mp4',
                            'resolution': res_label,
                            'filesize': f.get('filesize'),
                            'fps': f.get('fps'),
                            'note': f"{res_label} ({f.get('ext', 'mp4')})",
                            'height': height
                        })
            
            formats.sort(key=lambda x: x.get('height', 0), reverse=True)
            for f in formats: f.pop('height', None)

            return jsonify({
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'uploader': info.get('uploader'),
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

@app.route('/api/download')
def download_video():
    url = request.args.get('url')
    format_id = request.args.get('format_id')
    title = request.args.get('title', 'video')
    
    if not url: return jsonify({'error': 'URL is required'}), 400

    safe_filename = "".join([c for c in title if c.isalnum() or c in (' ', '.', '_')]).strip() + ".mp4"
    output_path = os.path.join(TEMP_DOWNLOAD_DIR, f'dl_{int(time.time())}_%(id)s.%(ext)s')
    
    ydl_opts = setup_ydl_opts({
        'format': f'{format_id}+bestaudio[ext=m4a]/best',
        'outtmpl': output_path,
        'merge_output_format': 'mp4',
        'ffmpeg_location': FFMPEG_PATH,
        'postprocessors': [{'key': 'FFmpegVideoConvertor', 'preferedformat': 'mp4'}],
    })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            file_path = ydl.prepare_filename(info)
            if not os.path.exists(file_path):
                file_path = os.path.splitext(file_path)[0] + '.mp4'
            
            if os.path.exists(file_path):
                def cleanup():
                    time.sleep(60)
                    try: os.remove(file_path)
                    except: pass
                threading.Thread(target=cleanup, daemon=True).start()
                
                return send_file(file_path, as_attachment=True, download_name=safe_filename)
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if os.path.exists(TEMP_DOWNLOAD_DIR):
        try:
            for f in os.listdir(TEMP_DOWNLOAD_DIR): os.remove(os.path.join(TEMP_DOWNLOAD_DIR, f))
        except: pass
            
    if not IS_CLOUD:
        threading.Thread(target=lambda: (time.sleep(1.5), webbrowser.open(f'http://127.0.0.1:{PORT}')), daemon=True).start()
    
    app.run(debug=False, port=PORT, threaded=True, host='0.0.0.0')
