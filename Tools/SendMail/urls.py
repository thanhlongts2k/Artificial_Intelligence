from django.urls import path, include
from knox import views as knox_views
from .views import SendEmailAPIView, LoginAPI

app_name = 'sendmail'

# Các tuyến đường API chính
api_patterns = [
    path('login/', LoginAPI.as_view(), name='login'),
    path('logout/', knox_views.LogoutView.as_view(), name='logout'),
    path('logoutall/', knox_views.LogoutAllView.as_view(), name='logoutall'),
    path('send-email/', SendEmailAPIView.as_view(), name='send-email'),
]

urlpatterns = [
    # 1. Hỗ trợ đầy đủ tiền tố /api/ (Ví dụ: /api/login/, /api/send-email/)
    path('api/', include((api_patterns, 'api'))),
    
    # 2. Hỗ trợ thêm cả đường dẫn trực tiếp phòng trường hợp parent project đã include('...urls') dưới tiền tố /api/
    path('login/', LoginAPI.as_view()),
    path('logout/', knox_views.LogoutView.as_view()),
    path('logoutall/', knox_views.LogoutAllView.as_view()),
    path('send-email/', SendEmailAPIView.as_view()),
]
