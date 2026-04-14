import os
import sys
import yt_dlp
from flask import Flask, request, jsonify, render_template, send_file, Response
from flask_cors import CORS
import tempfile
import time
import subprocess
import threading
import logging
import webbrowser
import shutil

# Detect Environment
IS_CLOUD = os.environ.get('RENDER') is not None
PORT = int(os.environ.get('PORT', 1626))

# Determine absolute path for PyInstaller or raw Python execution
if getattr(sys, 'frozen', False):
    application_path = sys._MEIPASS
    exe_dir = os.path.dirname(sys.executable)
else:
    application_path = os.path.dirname(os.path.abspath(__file__))
    exe_dir = application_path

template_folder = os.path.join(application_path, 'templates')
static_folder = os.path.join(application_path, 'static')

# Configure logging
if IS_CLOUD:
    # Cloud environment (log to stdout)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
else:
    # Local environment (log to file)
    LOGS_DIR = os.path.join(exe_dir, 'Logs')
    if not os.path.exists(LOGS_DIR):
        os.makedirs(LOGS_DIR)
    logging.basicConfig(
        filename=os.path.join(LOGS_DIR, 'server.log'),
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
CORS(app)

# Temp directory for downloads
TEMP_DOWNLOAD_DIR = os.path.join(tempfile.gettempdir(), 'ytdl_tool')
if not os.path.exists(TEMP_DOWNLOAD_DIR):
    os.makedirs(TEMP_DOWNLOAD_DIR)

# Dynamic FFmpeg path detection using imageio-ffmpeg
import imageio_ffmpeg
FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()

# YouTube Cookies setup (bot-protection bypass)
# Use system temp directory to ensure write access on cloud environments
COOKIE_FILE_PATH = os.path.join(tempfile.gettempdir(), 'ytdl_cookies.txt')
YOUTUBE_COOKIES = os.environ.get('YOUTUBE_COOKIES')
YOUTUBE_POT = os.environ.get('YOUTUBE_POT')  # Proof of Origin Token
YOUTUBE_VISITOR_DATA = os.environ.get('YOUTUBE_VISITOR_DATA') # Visitor Data Token

def init_cookies():
    if YOUTUBE_COOKIES:
        try:
            # Handle potential escaping of newlines in env var
            cookie_content = YOUTUBE_COOKIES.replace('\\n', '\n').strip()
            # Double check for common paste issues
            if "Netscape" not in cookie_content and "\t" not in cookie_content:
                logging.warning("[!] YOUTUBE_COOKIES env var might be malformed (missing tabs)")
            
            with open(COOKIE_FILE_PATH, 'w', encoding='utf-8') as f:
                f.write(cookie_content)
            logging.info(f"[+] Cookie file initialized at {COOKIE_FILE_PATH} (Length: {len(cookie_content)})")
        except Exception as e:
            logging.error(f"[!] Failed to write cookie file: {str(e)}")

init_cookies()

def apply_cookies(opts):
    if YOUTUBE_COOKIES and os.path.exists(COOKIE_FILE_PATH):
        opts['cookiefile'] = COOKIE_FILE_PATH
        # Using a stable User-Agent that works well with TV/Embedded clients
        opts['user_agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        
        # 'tv' and 'web_embedded' are currently the most stable for data-center IPs
        opts['extractor_args'] = {
            'youtube': {
                'player_client': ['tv', 'web_embedded'],
                'player_skip': ['webpage', 'configs']
            }
        }
        
        if YOUTUBE_POT:
            # PO Token support
            opts['extractor_args']['youtube']['po_token'] = [YOUTUBE_POT]
            logging.info("[+] PO Token applied")
            
        if YOUTUBE_VISITOR_DATA:
            # Visitor Data support
            opts['extractor_args']['youtube']['visitor_data'] = [YOUTUBE_VISITOR_DATA]
            logging.info("[+] Visitor Data applied")

        # Bypass tweaks
        opts['nocheckcertificate'] = True
        opts['youtube_include_dash_manifest'] = False
        opts['quiet'] = False 
    return opts

import socket

def get_lan_ip():
    if IS_CLOUD: return "CLOUD"
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

@app.route('/')
def home():
    lan_ip = get_lan_ip()
    return render_template('index.html', host_ip=lan_ip)

@app.route('/api/info')
def get_info():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    ydl_opts = apply_cookies({
        'quiet': False,
        'no_warnings': False,
        'ffmpeg_location': FFMPEG_PATH,
    })
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Now that we have FFmpeg, we can offer common quality presets
            # plus any single-file formats
            formats = []
            seen_res = set()
            
            for f in info.get('formats', []):
                vcodec = f.get('vcodec')
                acodec = f.get('acodec')
                height = f.get('height')
                
                # Video-only formats (will be merged with best audio by yt-dlp + ffmpeg)
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
                            'vcodec': vcodec,
                            'acodec': 'merge',
                            'note': f"{res_label} ({f.get('ext', 'mp4')})",
                            'height': height
                        })
            
            # Sort by height descending
            formats.sort(key=lambda x: x.get('height', 0), reverse=True)
            
            # Remove internal 'height' key before returning
            for f in formats:
                f.pop('height', None)

            return jsonify({
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'description': info.get('description'),
                'duration': info.get('duration'),
                'uploader': info.get('uploader'),
                'formats': formats
            })
    except Exception as e:
        logging.error(f"[!] Info error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug')
def debug_info():
    """Diagnostic route to check cloud environment state"""
    cookie_exists = os.path.exists(COOKIE_FILE_PATH)
    cookie_size = os.path.getsize(COOKIE_FILE_PATH) if cookie_exists else 0
    
    cookie_content = open(COOKIE_FILE_PATH, 'r').read() if cookie_exists else ""
    has_tabs = "\t" in cookie_content
    
    return jsonify({
        'is_cloud': IS_CLOUD,
        'yt_dlp_version': yt_dlp.version.__version__,
        'ffmpeg_path': FFMPEG_PATH,
        'ffmpeg_exists': os.path.exists(FFMPEG_PATH) if FFMPEG_PATH else False,
        'cookie_env_present': YOUTUBE_COOKIES is not None,
        'cookie_file_path': COOKIE_FILE_PATH,
        'cookie_file_exists': cookie_exists,
        'cookie_file_size': cookie_size,
        'cookie_has_tabs': has_tabs,
        'po_token_present': YOUTUBE_POT is not None,
        'visitor_data_present': YOUTUBE_VISITOR_DATA is not None,
        'cookie_first_line': open(COOKIE_FILE_PATH, 'r').readline().strip() if cookie_exists else "N/A",
        'temp_dir': tempfile.gettempdir(),
        'python_version': sys.version
    })

@app.route('/api/download')
def download_video():
    url = request.args.get('url')
    format_id = request.args.get('format_id')
    title = request.args.get('title', 'video')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    safe_filename = "".join([c for c in title if c.isalnum() or c in (' ', '.', '_')]).strip() + ".mp4"
    print(f"[*] Download request: {url} (Format: {format_id})")

    timestamp = int(time.time())
    output_path = os.path.join(TEMP_DOWNLOAD_DIR, f'dl_{timestamp}_%(id)s.%(ext)s')
    
    # Use yt-dlp to download and merge with FFmpeg
    ydl_opts = apply_cookies({
        'format': f'{format_id}+bestaudio[ext=m4a]/best',
        'outtmpl': output_path,
        'merge_output_format': 'mp4',
        'quiet': False,
        'no_warnings': False,
        'ffmpeg_location': FFMPEG_PATH,
        'postprocessors': [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }],
    })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            file_path = ydl.prepare_filename(info)
            
            # yt-dlp may change extension after merge
            if not os.path.exists(file_path):
                base = os.path.splitext(file_path)[0]
                file_path = base + '.mp4'
            
            if os.path.exists(file_path):
                logging.info(f"[+] Download complete: {file_path}")
                
                # Schedule cleanup after 60 seconds
                def cleanup():
                    time.sleep(60)
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            logging.info(f"[*] Cleaned up: {file_path}")
                    except:
                        pass
                threading.Thread(target=cleanup, daemon=True).start()
                
                return send_file(
                    file_path,
                    as_attachment=True,
                    download_name=safe_filename
                )
            else:
                return jsonify({'error': 'File not found after download'}), 404
    except Exception as e:
        logging.error(f"[!] Download error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Cleanup old temp files on startup
    if os.path.exists(TEMP_DOWNLOAD_DIR):
        try:
            for f in os.listdir(TEMP_DOWNLOAD_DIR):
                os.remove(os.path.join(TEMP_DOWNLOAD_DIR, f))
        except:
            pass
            
    if IS_CLOUD:
        logging.info(f"[*] Cloud Server starting at port {PORT}")
    else:
        logging.info(f"[*] Local Server starting at http://0.0.0.0:{PORT} (Available on LAN)")
        
        # Auto-open browser (local machine will still use 127.0.0.1)
        def open_browser():
            time.sleep(1.5) # Wait for server to start
            webbrowser.open(f'http://127.0.0.1:{PORT}')
            
        threading.Thread(target=open_browser, daemon=True).start()
    
    # Run the Flask app listening on all interfaces
    app.run(debug=False, port=PORT, threaded=True, host='0.0.0.0')
