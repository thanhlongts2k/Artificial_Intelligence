import turtle

screen = turtle.Screen()
screen.title("Mini Paint bằng Turtle")

but_ve = turtle.Turtle()
but_ve.speed(-1)     # Tốc độ phản hồi nhanh nhất
but_ve.shape("circle") # Đổi đầu bút thành hình tròn
but_ve.pensize(5)      # Nét vẽ to hơn chút

# Hàm để rùa đi theo tọa độ của chuột (khi giữ và kéo chuột)
def keo_chuot(x, y):
    # CHỈ CHO PHÉP VẼ KHI CHUỘT NẰM DƯỚI KHU VỰC NÚT BẤM (y < 220)
    if y < 220:
        but_ve.ondrag(None) # Tạm vô hiệu hóa để tránh giật lag
        but_ve.goto(x, y)
        but_ve.ondrag(keo_chuot) # Bật lại
    else:
        # Nếu cố tình kéo chuột lên khu vực nút, nhấc bút lên để không nhả mực
        but_ve.penup()
        but_ve.goto(x, y)
        but_ve.pendown()

# --- TÍCH HỢP VÍ DỤ 2: Hàm nhấp chuột để đặt bút ---
def nhap_chuot_dat_but(x, y):
    # Tránh việc rùa nhảy vào khu vực chứa các nút bấm (có y = 250)
    if y < 220: 
        but_ve.penup()   # Nhấc bút
        but_ve.goto(x, y) # Dịch chuyển
        but_ve.pendown() # Hạ bút

# Gắn sự kiện kéo chuột
but_ve.ondrag(keo_chuot)
# Gắn sự kiện click chuột lên màn hình để teleport bút vẽ
screen.onscreenclick(nhap_chuot_dat_but, 1)

# --- CẬP NHẬT CLASS NUTBAM ---
class NutBam:
    def __init__(self, mau, vi_tri):
        self.mau = mau
        self.vi_tri = vi_tri
        self.nut = turtle.Turtle() # Tạo con rùa (nút) và lưu vào thuộc tính của class

    def khoi_tao(self):
        self.nut.shape("square")
        self.nut.color(self.mau)
        self.nut.penup()
        self.nut.goto(self.vi_tri)
        
        # Gắn sự kiện click trực tiếp vào con rùa của class này
        self.nut.onclick(self.doi_mau)

    # Hàm đổi màu dùng chung cho mọi nút
    def doi_mau(self, x, y):
        but_ve.color(self.mau) # Lấy màu của chính nút đó gán cho bút vẽ

# --- TẠO CÁC NÚT MÀU ---
nut_do = NutBam("red", (-250, 250))
nut_do.khoi_tao()

nut_xanh = NutBam("green", (-200, 250))
nut_xanh.khoi_tao()

nut_vang = NutBam("yellow", (-150, 250))
nut_vang.khoi_tao()

screen.mainloop()