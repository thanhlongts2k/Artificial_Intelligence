import os
import subprocess
import sys
import json

PYTHON_PATH = r"D:\Program Files\Python313\python.exe"

def get_tokens():
    print("[*] Đang 'ép' YouTube nhả mã PO Token (Vui lòng ĐÓNG CHROME trước khi chạy để chắc chắn)...")
    
    # Lệnh này sẽ dùng Cookies từ Chrome để tạo uy tín, giúp sinh mã PO Token xịn
    cmd = [
        PYTHON_PATH, "-m", "yt_dlp", 
        "--cookies-from-browser", "chrome",
        "--print", "%(pp)s", # In ra thông số internal
        "--print", "po_token",
        "--print", "visitor_data",
        "-v", # Bật verbose để xem lỗi nếu có
        "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
    ]
    
    try:
        # Chạy và lấy kết quả
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = result.stdout + result.stderr
        
        # Tìm mã PO Token trong đống log (nếu --print bị NA)
        print("\n" + "="*50)
        found = False
        
        # Tách dòng để tìm mã
        lines = output.strip().split('\n')
        for line in lines:
            if len(line) > 50 and not line.startswith("["): # Mã PO Token thường rất dài > 100 ký tự
                if not found:
                    print("✅ ĐÃ TÌM THẤY MÃ XỊN!")
                    print(f"Mã của bạn đây: \n\n{line}\n")
                    print("="*50)
                    print("[!] Hãy copy dãy chữ dài ngoằng ở trên dán vào YOUTUBE_POT trên Render.")
                    found = True
        
        if not found:
            print("[-] Vẫn chưa lấy được mã. Có lẽ bạn cần 'Log out' rồi 'Log in' lại YouTube trên Chrome rồi thử lại.")
            
    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == "__main__":
    get_tokens()
    input("\nNhấn Enter để thoát...")
