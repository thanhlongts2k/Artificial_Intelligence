"""
Django Settings mẫu dành riêng cho Module SendMail (Artificial_Intelligence/Tools/SendMail).
Có thể nạp trực tiếp hoặc import các biến cấu hình Email vào settings.py chính của dự án.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Thư mục gốc dự án (Artificial_Intelligence)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Tự động nạp file .env từ thư mục SendMail hoặc BASE_DIR
sendmail_dir = Path(__file__).resolve().parent
env_path = sendmail_dir / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)
else:
    load_dotenv(override=True)

# Key bảo mật cho API Key Authentication (gửi email trực tiếp bằng Header X-API-KEY)
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-sendmail-tool-key-change-me-in-production')
SENDMAIL_API_KEY = os.getenv('SENDMAIL_API_KEY', 'sendmail-secret-api-key-2026')

DEBUG = True

ALLOWED_HOSTS = ['*']

# Định tuyến URL chính khi chạy độc lập
ROOT_URLCONF = 'Tools.SendMail.urls'

# Danh sách ứng dụng cài đặt
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party packages
    'rest_framework',
    'knox',
    
    # Custom Apps
    'Tools.SendMail',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Cấu hình Cơ sở dữ liệu SQLite mặc định khi chạy độc lập
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': sendmail_dir / 'db.sqlite3',
    }
}

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

STATIC_URL = '/static/'

# Cấu hình Django REST Framework (Stateless API Authentication)
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'knox.auth.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# ==============================================================================
# CẤU HÌNH GỬI EMAIL (SMTP CONFIGURATION)
# ==============================================================================
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 't')

# Tài khoản email dùng gửi tin (VD: Gmail & Mật khẩu ứng dụng / App Password)
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'your_email@gmail.com')

# Xử lý mật khẩu ứng dụng Gmail (Loại bỏ khoảng trắng nếu người dùng copy từ Google UI: "xxxx xxxx xxxx xxxx")
raw_password = os.getenv('EMAIL_HOST_PASSWORD', 'your_app_password')
EMAIL_HOST_PASSWORD = raw_password.replace(' ', '') if raw_password else raw_password

DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

# Tên Alias hiển thị người gửi mặc định (VD: "System Email Notification Service")
EMAIL_DISPLAY_NAME = os.getenv('EMAIL_DISPLAY_NAME', 'System Email Notification Service')

# ==============================================================================
# CẤU HÌNH LOGGING
# ==============================================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'email_system.log'),
            'formatter': 'verbose',
            'encoding': 'utf-8',
        },
    },
    'loggers': {
        'Tools.SendMail': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
