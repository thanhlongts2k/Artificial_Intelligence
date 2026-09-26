import turtle
import random

# 1. Thiết lập màn hình (Sân đua)
screen = turtle.Screen()
screen.title("Game Đua Rùa Cực Căng")
screen.bgcolor("lightgreen")
screen.setup(width=600, height=400)

# 2. Vẽ vạch đích
referee = turtle.Turtle()
referee.speed(0)
referee.penup()
referee.goto(200, 150) # Di chuyển đến góc trên của vạch đích
referee.pendown()
referee.pensize(5)
referee.right(90)      # Quay mặt xuống dưới
referee.forward(300)   # Kẻ một đường dài 300px làm vạch đích
referee.hideturtle()   # Ẩn con rùa trọng tài này đi

# 3. Tạo các tay đua rùa
colors = ["red", "blue", "orange", "purple"]
y_positions = [100, 40, -20, -80] # Tọa độ Y (chiều dọc) của từng con rùa
all_turtles = []

# Vòng lặp để thiết lập 4 chú rùa
for index in range(4):
    racer = turtle.Turtle(shape="turtle") # Hình dáng con rùa
    racer.color(colors[index])
    racer.penup() # Nhấc bút để không vẽ đường khi di chuyển ra vạch xuất phát
    racer.goto(x=-250, y=y_positions[index]) # Đưa rùa ra vạch xuất phát
    all_turtles.append(racer) # Lưu rùa vào danh sách

# 4. Bắt đầu cuộc đua
is_race_on = True

while is_race_on:
    for racer in all_turtles:
        # Kiểm tra xem rùa đã chạm hoặc vượt qua vạch đích chưa (Tọa độ X >= 200)
        if racer.xcor() >= 200:
            is_race_on = False
            winning_color = racer.pencolor()
            
            # Ghi kết quả lên màn hình
            referee.penup()
            referee.goto(0, 160)
            referee.color(winning_color)
            referee.write(f"Rùa màu {winning_color.upper()} đã chiến thắng!", align="center", font=("Arial", 16, "bold"))
            break # Dừng vòng lặp của các chú rùa
            
        # Nếu chưa ai tới đích, cho rùa tiến lên ngẫu nhiên từ 1 đến 10 pixel
        random_distance = random.randint(1, 10)
        racer.forward(random_distance)

# Giữ màn hình mở cho đến khi người dùng click chuột
screen.exitonclick()