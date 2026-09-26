import turtle

scr = turtle.Screen()
scr.title("Vẽ hình bằng rùa")

x = turtle.Turtle()
x.pensize(2)
x.speed(0)
for steps in range(100):
    for c in ('blue', 'red', 'green'):
        x.color(c)
        x.forward(steps)
        x.right(30)

turtle.exitonclick()