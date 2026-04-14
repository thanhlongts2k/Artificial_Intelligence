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
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'ffmpeg_location': FFMPEG_PATH,
    }
    
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
        return jsonify({'error': str(e)}), 500

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
    ydl_opts = {
        'format': f'{format_id}+bestaudio[ext=m4a]/best',
        'outtmpl': output_path,
        'merge_output_format': 'mp4',
        'quiet': True,
        'no_warnings': True,
        'ffmpeg_location': FFMPEG_PATH,
        'postprocessors': [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }],
    }

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
