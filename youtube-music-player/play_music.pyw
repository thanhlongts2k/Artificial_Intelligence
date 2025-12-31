"""
YouTube Music Player - Modern UI with CustomTkinter
Dark theme, smooth animations, user-friendly icons
"""

import os
import sys
import random
import time
import subprocess
import webbrowser
import customtkinter as ctk

# ==================== THEME SETUP ====================
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

# ==================== CẤU HÌNH TÂM TRẠNG & MỤC ĐÍCH ====================
MOODS = {
    "☀️ Vui vẻ": {
        "color": "#FFD93D",
        "hover": "#FFC300",
        "terms": ["nhạc vui nhộn hay nhất", "nhạc remix sôi động", "EDM party việt nam", "nhạc dance việt"]
    },
    "💧 Buồn": {
        "color": "#6C5CE7",
        "hover": "#5B4CC4",
        "terms": ["nhạc buồn hay nhất", "ballad việt nam", "nhạc thất tình", "nhạc tâm trạng buồn"]
    },
    "🍃 Chill": {
        "color": "#00CEC9",
        "hover": "#00B5B0",
        "terms": ["nhạc chill việt nam", "lofi việt nam", "acoustic nhẹ nhàng", "nhạc cafe thư giãn"]
    },
    "⚡ Năng lượng": {
        "color": "#FF6B6B",
        "hover": "#EE5A5A",
        "terms": ["nonstop việt mix", "nhạc bass cực mạnh", "nhạc bay phòng", "vinahouse hay nhất"]
    },
    "💕 Lãng mạn": {
        "color": "#FD79A8",
        "hover": "#E96A95",
        "terms": ["nhạc tình yêu hay nhất", "love songs việt nam", "nhạc đám cưới", "nhạc valentine"]
    },
}

PURPOSES = {
    "🧠 Audio mất não": {
        "color": "#E84393",
        "hover": "#D63384",
        "terms": [
            "Mất Não Audio", 
            "Nhi Đồng Mất Não", 
            "audio mất não hay nhất",
            "truyện audio hài hước",
            "Kho Hài Việt audio",
            "truyện cười audio việt nam",
            "audio giải trí mất não",
            "nhà có hũ kim cương audio"
        ]
    },
    "💼 Làm việc": {
        "color": "#74B9FF",
        "hover": "#5DA7F0",
        "terms": ["nhạc không lời hay nhất", "lofi study vietnam", "nhạc tập trung làm việc", "piano không lời"]
    },
    "🏃 Tập gym": {
        "color": "#E17055",
        "hover": "#D05F45",
        "terms": ["nhạc gym việt nam", "workout music remix", "nhạc chạy bộ", "nhạc tập thể hình"]
    },
    "😴 Thư giãn": {
        "color": "#A29BFE",
        "hover": "#8B83E8",
        "terms": ["nhạc ngủ sâu", "relaxing music việt nam", "nhạc thiền thư giãn", "nhạc ru ngủ"]
    },
    "🎉 Tiệc tùng": {
        "color": "#FDCB6E",
        "hover": "#F0BE5E",
        "terms": ["nhạc quẩy hay nhất", "EDM party việt", "nonstop bar club", "nhạc sàn cực mạnh"]
    },
    "🚗 Lái xe": {
        "color": "#55A3FF",
        "hover": "#4090E8",
        "terms": ["nhạc lái xe đường dài", "nhạc nghe trên xe", "nhạc nghe trên xe đường xa hay nhất", "nhạc du lịch"]
    },
}

COCCOC_PATHS = [
    r"C:\Program Files\CocCoc\Browser\Application\browser.exe",
    r"C:\Program Files (x86)\CocCoc\Browser\Application\browser.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\CocCoc\Browser\Application\browser.exe"),
]

# ==================== HELPER FUNCTIONS ====================
def get_exe_path():
    if getattr(sys, 'frozen', False):
        return sys.executable
    return os.path.abspath(__file__)

def get_desktop_path():
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                           r"Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders") as key:
            return winreg.QueryValueEx(key, "Desktop")[0]
    except:
        return os.path.join(os.path.expanduser("~"), "Desktop")

def shortcut_exists():
    desktop = get_desktop_path()
    return os.path.exists(os.path.join(desktop, "Play Music.lnk"))

def create_shortcut():
    exe_path = get_exe_path()
    desktop = get_desktop_path()
    shortcut_path = os.path.join(desktop, "Play Music.lnk")
    
    ps_script = f'''
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{shortcut_path}")
$Shortcut.TargetPath = "{exe_path}"
$Shortcut.WorkingDirectory = "{os.path.dirname(exe_path)}"
$Shortcut.Description = "YouTube Music Player"
$Shortcut.IconLocation = "shell32.dll,39"
$Shortcut.Save()
'''
    try:
        subprocess.run(["powershell", "-Command", ps_script], 
                      creationflags=subprocess.CREATE_NO_WINDOW, timeout=10)
        return True
    except:
        return False

def show_message(title, message, icon=0x40):
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, message, title, icon)
    except:
        print(message)

def find_coccoc():
    for path in COCCOC_PATHS:
        if os.path.exists(path):
            return path
    return None

def play_music(search_terms):
    """Mở YouTube và phát nhạc"""
    try:
        import pyautogui
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyautogui", "-q"],
                              creationflags=subprocess.CREATE_NO_WINDOW)
        import pyautogui

    search_term = random.choice(search_terms)
    search_url = f"https://www.youtube.com/results?search_query={search_term.replace(' ', '+')}"
    
    coccoc_path = find_coccoc()
    
    if coccoc_path:
        subprocess.Popen([coccoc_path, "--start-maximized", search_url])
        time.sleep(5)
        pyautogui.press('escape')
        time.sleep(0.5)
        screen_width, screen_height = pyautogui.size()
        click_x = int(screen_width * 0.25)
        click_y = int(screen_height * 0.32)
        pyautogui.click(click_x, click_y)
    else:
        webbrowser.open(search_url)

# ==================== MODERN GUI ====================
class MusicPlayerApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # Window config
        self.title("YouTube Music Player")
        self.geometry("520x520")
        self.resizable(False, False)
        
        # Center window
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 520) // 2
        y = (self.winfo_screenheight() - 480) // 2
        self.geometry(f"+{x}+{y}")
        
        # Header
        header_frame = ctk.CTkFrame(self, fg_color="transparent")
        header_frame.pack(fill="x", padx=20, pady=(20, 10))
        
        title_label = ctk.CTkLabel(header_frame, text="🎵 Hôm nay bạn muốn nghe gì?",
                                   font=ctk.CTkFont(size=22, weight="bold"))
        title_label.pack()
        
        subtitle_label = ctk.CTkLabel(header_frame, text="Chọn tâm trạng hoặc mục đích của bạn",
                                      font=ctk.CTkFont(size=13), text_color="gray")
        subtitle_label.pack(pady=(5, 0))
        
        # Tabview
        self.tabview = ctk.CTkTabview(self, width=480, height=340, segmented_button_fg_color="#2B2B2B",
                                        segmented_button_selected_color="#404040",
                                        segmented_button_unselected_color="#1A1A1A")
        self.tabview.pack(padx=20, pady=10, fill="both", expand=True)
        self.tabview._segmented_button.configure(font=ctk.CTkFont(size=14, weight="bold"))
        
        # Create tabs
        self.tabview.add("🎭 Tâm trạng")
        self.tabview.add("🎯 Mục đích")
        
        # Mood buttons
        self.create_buttons(self.tabview.tab("🎭 Tâm trạng"), MOODS)
        
        # Purpose buttons
        self.create_buttons(self.tabview.tab("🎯 Mục đích"), PURPOSES)
        
        # Random button
        random_frame = ctk.CTkFrame(self, fg_color="transparent")
        random_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        random_btn = ctk.CTkButton(
            random_frame, 
            text="🎲 NGẪU NHIÊN", 
            font=ctk.CTkFont(size=20, weight="bold"),
            fg_color="#E84393",
            hover_color="#D63384",
            height=65,
            corner_radius=15,
            command=self.play_random
        )
        random_btn.pack(fill="x", ipady=5)
    
    def create_buttons(self, parent, options):
        # Grid frame
        grid_frame = ctk.CTkFrame(parent, fg_color="transparent")
        grid_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        for i, (name, data) in enumerate(options.items()):
            row = i // 2
            col = i % 2
            
            btn = ctk.CTkButton(
                grid_frame,
                text=name,
                font=ctk.CTkFont(size=14, weight="bold"),
                fg_color=data["color"],
                hover_color=data["hover"],
                text_color="white",
                width=200,
                height=70,
                corner_radius=15,
                command=lambda t=data["terms"]: self.on_select(t)
            )
            btn.grid(row=row, column=col, padx=10, pady=10, sticky="ew")
        
        # Configure grid weights
        grid_frame.grid_columnconfigure(0, weight=1)
        grid_frame.grid_columnconfigure(1, weight=1)
    
    def on_select(self, terms):
        self.destroy()
        play_music(terms)
    
    def play_random(self):
        all_terms = []
        for data in MOODS.values():
            all_terms.extend(data["terms"])
        for data in PURPOSES.values():
            all_terms.extend(data["terms"])
        self.destroy()
        play_music(all_terms)

# ==================== MAIN ====================
def main():
    if not shortcut_exists():
        if create_shortcut():
            show_message(
                "YouTube Music Player", 
                "✅ Đã tạo shortcut 'Play Music' trên Desktop!\n\nClick vào shortcut để mở ứng dụng.",
                0x40
            )
        else:
            show_message("Lỗi", "❌ Không thể tạo shortcut.", 0x10)
    else:
        app = MusicPlayerApp()
        app.mainloop()

if __name__ == "__main__":
    main()
