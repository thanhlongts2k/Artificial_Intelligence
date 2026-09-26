import keyboard
import time
import re
import os
import sys


# ============================================================
#  ColorStyle — Tô màu log terminal giống Django style
#  Cách dùng: style.SUCCESS("Thành công!"), style.WARNING("Cảnh báo!")
# ============================================================
class ColorStyle:
    """
    Lớp tiện ích in log có màu trong terminal (ANSI escape codes).
    Tương tự self.style.SUCCESS / WARNING / ERROR của Django management command.
    Tự động tắt màu nếu stdout không phải terminal (pipe / file).
    """

    # ANSI color codes
    RESET   = "\033[0m"
    COLORS  = {
        "SUCCESS": "\033[92m",       # Xanh lá sáng
        "WARNING": "\033[93m",       # Vàng sáng
        "ERROR":   "\033[91m",       # Đỏ sáng
        "INFO":    "\033[96m",       # Cyan sáng
        "HEADER":  "\033[1;95m",     # Magenta đậm (bold)
        "NOTICE":  "\033[1;97m",     # Trắng đậm (bold)
        "DIM":     "\033[2;37m",     # Xám mờ (dim)
    }

    def __init__(self):
        # Tắt màu khi output không phải terminal (VD: redirect > file.txt)
        self._enabled = hasattr(sys.stdout, "isatty") and sys.stdout.isatty()
        # Trên Windows, bật hỗ trợ ANSI nếu cần
        if self._enabled and sys.platform == "win32":
            self._enable_windows_ansi()

    # --- Public methods giống Django ---
    def SUCCESS(self, text): return self._wrap("SUCCESS", text)
    def WARNING(self, text): return self._wrap("WARNING", text)
    def ERROR(self, text):   return self._wrap("ERROR", text)
    def INFO(self, text):    return self._wrap("INFO", text)
    def HEADER(self, text):  return self._wrap("HEADER", text)
    def NOTICE(self, text):  return self._wrap("NOTICE", text)
    def DIM(self, text):     return self._wrap("DIM", text)

    def slow_print(self, text, level="SUCCESS", delay=0.03):
        """In từng ký tự chậm chậm kiểu typewriter, có màu."""
        colored = self._wrap(level, "")
        reset = self.RESET if self._enabled else ""
        if self._enabled:
            # In mã màu trước, rồi từng ký tự, rồi reset
            color_code = self.COLORS.get(level, "")
            sys.stdout.write(color_code)
            for char in text:
                sys.stdout.write(char)
                sys.stdout.flush()
                time.sleep(delay)
            sys.stdout.write(reset)
            print()  # xuống dòng
        else:
            for char in text:
                sys.stdout.write(char)
                sys.stdout.flush()
                time.sleep(delay)
            print()

    # --- Internal ---
    def _wrap(self, level, text):
        if not self._enabled:
            return str(text)
        color = self.COLORS.get(level, "")
        return f"{color}{text}{self.RESET}"

    @staticmethod
    def _enable_windows_ansi():
        """Bật Virtual Terminal Processing trên Windows 10+ để hỗ trợ ANSI colors."""
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            # STD_OUTPUT_HANDLE = -11
            handle = kernel32.GetStdHandle(-11)
            mode = ctypes.c_ulong()
            kernel32.GetConsoleMode(handle, ctypes.byref(mode))
            # ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
            kernel32.SetConsoleMode(handle, mode.value | 0x0004)
        except Exception:
            pass  # Nếu không bật được thì vẫn chạy bình thường, chỉ không có màu


# Khởi tạo global instance — dùng ở mọi nơi trong file
style = ColorStyle()


def parse_input_text(text):
    """
    Xử lý xuống dòng an toàn:
    Chỉ bắt \br, <br>, <br/>, [br], \n (tránh đè vào từ như library, break)
    """
    pattern = r'\\br|<br\s*/?>|\[br\]|\\n'
    return re.sub(pattern, '\n', text, flags=re.IGNORECASE)

def auto_type():
    print(style.HEADER("\n=== AUTO TYPER / BOT MESSENGER (VER 2.0) ==="))
    
    # 1. Nhập cấu hình gửi (có try-except tránh nhập sai định dạng số)
    try:
        so_lan = int(input(style.INFO("1. Nhập tổng số lần muốn gửi: ")))
        batdau = int(input(style.INFO("2. Số đếm bắt đầu (VD: 1): ")))
    except ValueError:
        print(style.ERROR("❌ Lỗi: Vui lòng chỉ nhập số nguyên!"))
        return

    noi_dung_raw = input(style.INFO("3. Nhập nội dung (Dùng {count} làm số đếm, dùng \\br để xuống dòng):\n> "))
    
    # 2. Cấu hình thời gian
    print(style.HEADER("\n--- CẤU HÌNH THỜI GIAN ---"))
    try:
        delay_prep = int(input(style.INFO("4. Thời gian chờ để click ô chat (giây, khuyên dùng 10): ")) or 10)
        delay_between = float(input(style.INFO("5. Khoảng cách giữa mỗi tin nhắn (giây, khuyên dùng 3 - 5s): ")) or 3.0)
    except ValueError:
        print(style.WARNING("⚠️ Nhập sai định dạng thời gian, tự động dùng giá trị mặc định (10s / 3s)."))
        delay_prep = 10
        delay_between = 3.0

    # Xử lý chuỗi xuống dòng
    noi_dung = parse_input_text(noi_dung_raw)
    lines = noi_dung.split('\n')

    print(style.WARNING(f"\n⚠️ NẾU MUỐN DỪNG KHẨN CẤP: BẤM VÀ GIỮ PHÍM [ESC] ⚠️"))
    print(style.INFO(f"🔄 Bạn có {delay_prep} giây để click chuột vào khung chat..."))
    
    # Đếm ngược thời gian chuẩn bị
    for sec in range(delay_prep, 0, -1):
        if keyboard.is_pressed('esc'):
            print(style.ERROR("\n🛑 Đã hủy trước khi bắt đầu!"))
            return
        print(style.DIM(f"⏳ Còn {sec}s..."), end="\r")
        time.sleep(1)
    print(style.SUCCESS("\n🚀 BẮT ĐẦU GỬI!\n"))

    is_stopped = False
    
    for step in range(so_lan):
        current_count = batdau + step
        
        # Check dừng khẩn cấp trước khi gõ
        if keyboard.is_pressed('esc'):
            print(style.ERROR("\n🛑 Đã nhận lệnh dừng khẩn cấp từ phím ESC!"))
            break

        print(style.INFO(f"📝 [Lần {step + 1}/{so_lan}] Đang gửi tin với {{count}} = {current_count}..."))
        
        for i, line in enumerate(lines):
            line_to_send = line.replace('{count}', str(current_count)).replace('@@count@@', str(current_count))

            keyboard.write(line_to_send, delay=0.03)
            time.sleep(0.05)

            if i < len(lines) - 1:
                keyboard.press_and_release('shift+enter')
                time.sleep(0.08)

        # Bấm Enter gửi cả block tin nhắn
        keyboard.press_and_release('enter')
        print(style.SUCCESS(f"   ✅ Gửi thành công!"))
        
        # Xử lý thời gian chờ giữa các lần gửi
        check_interval = 0.1
        total_steps = int(delay_between / check_interval)
        
        for _ in range(total_steps):
            if keyboard.is_pressed('esc'):
                print(style.ERROR("\n🛑 Đã nhận lệnh dừng khẩn cấp trong lúc chờ!"))
                is_stopped = True
                break
            time.sleep(check_interval)
            
        if is_stopped:
            break

    print(style.SUCCESS("\n🎉 Hoàn thành chương trình!"))

def type_from_list():
    print(style.HEADER("\n=== AUTO TYPE THEO DANH SÁCH (FILE .TXT) ==="))
    filepath = input(style.INFO("Nhập đường dẫn file .txt (VD: danh_sach.txt): ")).strip('"\' ')
    
    if not os.path.exists(filepath):
        print(style.ERROR("❌ Lỗi: File không tồn tại! Vui lòng kiểm tra lại đường dẫn."))
        return

    # Đọc file txt, mỗi dòng là 1 tin nhắn
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]

    if not lines:
        print(style.ERROR("❌ File trống, không có nội dung để gửi!"))
        return

    print(style.SUCCESS(f"📋 Tìm thấy {len(lines)} tin nhắn trong file."))
    
    try:
        delay_prep = int(input(style.INFO("Thời gian chờ để click ô chat (giây, mặc định 10): ")) or 10)
        delay_between = float(input(style.INFO("Khoảng cách giữa các tin nhắn (giây, mặc định 3): ")) or 3.0)
        loop_time = int(input(style.INFO(f"🔄 Số lần lặp lại file (Mặc định 1): ")) or 1)
    except ValueError:
        delay_prep, delay_between, loop_time = 10, 3.0, 1

    print(style.WARNING(f"\n⚠️ DỪNG KHẨN CẤP: GIỮ PHÍM [ESC] ⚠️"))
    print(style.INFO(f"🔄 Bạn có {delay_prep} giây để click chuột vào khung chat..."))
    
    # Đếm ngược thời gian chuẩn bị
    for sec in range(delay_prep, 0, -1):
        if keyboard.is_pressed('esc'):
            print(style.ERROR("\n🛑 Đã hủy trước khi bắt đầu!"))
            return
        print(style.DIM(f"⏳ Còn {sec}s..."), end="\r")
        time.sleep(1)
    print(style.SUCCESS("\n🚀 BẮT ĐẦU GỬI!\n"))

    is_stopped = False

    # ĐỔI TÊN BIẾN 'time' THÀNH 'loop_idx' ĐỂ KHÔNG TRÙNG VỚI THƯ VIỆN 'time'
    for loop_idx in range(loop_time):
        if is_stopped:
            break

        print(style.NOTICE(f"\n🔄 Lần lặp thứ {loop_idx + 1}/{loop_time}"))
        for i, message in enumerate(lines, 1):
            if keyboard.is_pressed('esc'):
                print(style.ERROR("\n🛑 Đã nhận lệnh dừng khẩn cấp!"))
                is_stopped = True
                break

            print(style.INFO(f"📝 [{i}/{len(lines)}] Đang gửi: {message[:30]}..."))
            
            # Gõ tin nhắn từ danh sách
            keyboard.write(message, delay=0.03)
            time.sleep(0.05)
            keyboard.press_and_release('enter')
            
            # Delay giữa các tin nhắn
            total_steps = int(delay_between / 0.1)
            for _ in range(total_steps):
                if keyboard.is_pressed('esc'):
                    print(style.ERROR("\n🛑 Đã nhận lệnh dừng khẩn cấp trong lúc chờ!"))
                    is_stopped = True
                    break
                time.sleep(0.1)

            if is_stopped:
                break

    print(style.SUCCESS("\n🎉 Hoàn thành gửi theo danh sách!"))

def main():
    # 1. Đăng ký tất cả các tính năng vào Dictionary
    # Sau này muốn thêm tính năng '2', '3' thì CHỈ CẦN THÊM DÒNG VÀO ĐÂY!
    options = {
        '1': ("Mở chương trình AUTO TYPE", auto_type),
        '2': ("Auto Type theo danh sách (File .txt)", type_from_list),
        # '2': ("Tính năng Auto Click", auto_click),      <-- Ví dụ thêm tính năng mới
        # '3': ("Cấu hình phím tắt", config_hotkey),     <-- Cực kỳ dễ mở rộng
    }

    while True:
        print(style.HEADER("\n" + "=" * 30))
        print(style.NOTICE("Chào mừng bạn trở lại:"))
        print(style.DIM(" '0': Để thoát chương trình"))
        
        # Tự động in ra danh sách lựa chọn từ Dictionary
        for key, (label, _) in options.items():
            print(style.INFO(f" '{key}': {label}"))
        print(style.HEADER("=" * 30))
        
        user_input = input(style.NOTICE("Nhập lựa chọn: ")).strip()
        
        if user_input == '0':
            break
        elif user_input in options:
            # Lấy hàm tương ứng ra và chạy (không cần match-case hay if-else dài dòng)
            _, func = options[user_input]
            func()
        else:
            # Thông báo lỗi tự động linh hoạt theo số lượng option hiện có
            valid_keys = ['0'] + list(options.keys())
            print(style.ERROR(f"❌ Lỗi: Lựa chọn không hợp lệ! Vui lòng chỉ chọn ({', '.join(valid_keys)})"))

    style.slow_print("👋 Đã thoát chương trình! Hẹn gặp lại~", level="SUCCESS", delay=0.04)

if __name__ == "__main__":
    main()