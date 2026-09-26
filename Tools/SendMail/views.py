import os
import time
import logging
from datetime import datetime

from django.conf import settings
from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.contrib.auth import authenticate
import knox.auth
from knox.views import LoginView as KnoxLoginView
from rest_framework.views import APIView
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .serializers import SendEmailSerializer

logger = logging.getLogger(__name__)


class HasAPIKeyOrAuthenticated(permissions.BasePermission):
    """
    Quyền truy cập linh hoạt cho SendMail API:
    1. Trả về True nếu Request có Header 'X-API-KEY' (hoặc param 'api_key') trùng với SENDMAIL_API_KEY trong settings/.env.
    2. HOẶC Trả về True nếu Người dùng đã xác thực bằng Token Knox (IsAuthenticated).
    """
    def has_permission(self, request, view):
        # 1. Kiểm tra API Key tĩnh (Dành cho Server-to-Server / System Integration)
        api_key_header = request.META.get('HTTP_X_API_KEY') or request.query_params.get('api_key')
        valid_api_key = getattr(settings, 'SENDMAIL_API_KEY', None)
        
        if valid_api_key and api_key_header and api_key_header == valid_api_key:
            return True
            
        # 2. Kiểm tra Token Knox / User Authentication
        return bool(request.user and request.user.is_authenticated)


class LoginAPI(KnoxLoginView):
    """
    POST /api/login/
    API Đăng nhập tài khoản hệ thống Django User & cấp Token xác thực Knox (Stateless, không dính CSRF Cookie).
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, format=None):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Sai tài khoản hoặc mật khẩu'}, status=status.HTTP_400_BAD_REQUEST)

        request.user = user
        return super().post(request, format=None)


class SendEmailAPIView(APIView):
    """
    POST /api/send-email/
    API hỗ trợ gửi email từ Frontend với tùy chọn tệp đính kèm (hỗ trợ cả Plain Text và HTML).
    Cho phép xác thực bằng Token Knox HOẶC Header 'X-API-KEY'.
    """
    authentication_classes = [knox.auth.TokenAuthentication]
    permission_classes = [HasAPIKeyOrAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, *args, **kwargs):
        start_time = time.time()
        timing_steps = []
        
        def add_timing(step_name):
            elapsed = time.time() - start_time
            timing_steps.append(f"[{datetime.now().strftime('%H:%M:%S.%f')}] {step_name} (elapsed: {elapsed:.3f}s)")
            
        add_timing("1. Bắt đầu nhận request gửi email")
        
        # Giá trị mặc định phòng trường hợp validation thất bại không bị NameError ở block finally
        subject = "N/A"
        message = "N/A"
        to_emails = []
        from_email = "N/A"
        requested_from = "None"
        attachment_name = "None"
        status_str = "SUCCESS"
        
        serializer = SendEmailSerializer(data=request.data)
        if not serializer.is_valid():
            status_str = f"VALIDATION_FAILED: {serializer.errors}"
            add_timing("Dữ liệu request không hợp lệ (Validation Failed)")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        add_timing("2. Kiểm tra/Validate dữ liệu xong")
        
        validated_data = serializer.validated_data
        to_emails = validated_data['to_emails']
        subject = validated_data['subject']
        message = validated_data.get('message', '')
        html_message = validated_data.get('html_message', '')
        is_html = validated_data.get('is_html', False)
        
        # Lấy from_name và from_email từ request
        requested_name = validated_data.get('from_name')
        requested_from = validated_data.get('from_email')
        
        # Email SMTP gốc sử dụng để phát tin
        smtp_user = getattr(settings, 'EMAIL_HOST_USER', None) or getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'noreply@example.com'
        
        # Xác định Tên Alias hiển thị (Display Name): Ưu tiên requested_name -> EMAIL_DISPLAY_NAME -> Tên mặc định
        default_display_name = getattr(settings, 'EMAIL_DISPLAY_NAME', 'System Email Notification Service')
        display_name = requested_name.strip() if (requested_name and requested_name.strip()) else default_display_name
        
        # Định dạng chuẩn RFC 5322: "Tên Hiển Thị (Alias)" <diachi_smtp@gmail.com>
        from_email = f'"{display_name}" <{smtp_user}>'
        
        # Đọc danh sách file đính kèm (Hỗ trợ 1 file hoặc nhiều file)
        uploaded_files = request.FILES.getlist('file') or request.FILES.getlist('files')
        custom_file_name = validated_data.get('file_name')
        
        if uploaded_files:
            file_names = [custom_file_name if (custom_file_name and i == 0) else f.name for i, f in enumerate(uploaded_files)]
            attachment_name = ', '.join(file_names)
        else:
            attachment_name = 'None'
        
        error_msg = ""
        
        try:
            add_timing("3. Bắt đầu khởi tạo đối tượng Email Message")
            
            # Khởi tạo Email (Hỗ trợ HTML nếu có html_message hoặc is_html=True)
            if html_message or is_html:
                body_content = message if message else html_message
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=body_content,
                    from_email=from_email,
                    to=to_emails,
                    reply_to=[requested_from] if requested_from else None
                )
                if html_message:
                    email.attach_alternative(html_message, "text/html")
                elif is_html:
                    email.content_subtype = "html"
            else:
                email = EmailMessage(
                    subject=subject,
                    body=message,
                    from_email=from_email,
                    to=to_emails,
                    reply_to=[requested_from] if requested_from else None
                )
            
            if uploaded_files:
                for idx, ufile in enumerate(uploaded_files):
                    att_name = custom_file_name if (custom_file_name and idx == 0) else ufile.name
                    add_timing(f"4.{idx+1}. Đọc file đính kèm '{att_name}' ({ufile.size} bytes)")
                    file_content = ufile.read()
                    email.attach(att_name, file_content, ufile.content_type)
                    add_timing(f"5.{idx+1}. Đính kèm file '{att_name}' thành công")
                
            add_timing("6. Bắt đầu thực thi lệnh email.send() gửi qua máy chủ SMTP")
            email.send(fail_silently=False)
            add_timing("7. Máy chủ SMTP xác nhận gửi thư thành công")
            
            return Response({
                "status": "success",
                "message": "Gửi email thành công."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            status_str = f"ERROR: {str(e)}"
            error_msg = str(e)
            add_timing(f"Lỗi gửi email: {str(e)}")
            logger.error(f"Lỗi khi gửi email: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": f"Không thể gửi email: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        finally:
            total_elapsed = time.time() - start_time
            base_dir = getattr(settings, 'BASE_DIR', os.getcwd())
            
            # Ghi nhật ký vào file email_send.log ở thư mục gốc
            try:
                log_file_path = os.path.join(base_dir, 'email_send.log')
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                to_str = ', '.join(to_emails) if isinstance(to_emails, list) else str(to_emails)
                
                log_entry = (
                    f"[{timestamp}]\n"
                    f"From: {from_email} (Requested: {requested_from or 'None'})\n"
                    f"To: {to_str}\n"
                    f"Subject: {subject}\n"
                    f"Message: {message or html_message}\n"
                    f"Files: {attachment_name}\n"
                    f"Status: {status_str}\n"
                    f"{'-'*50}\n"
                )
                with open(log_file_path, 'a', encoding='utf-8') as f:
                    f.write(log_entry)
            except Exception as log_err:
                logger.error(f"Lỗi ghi log file email_send.log: {str(log_err)}")
                
            # Ghi nhật ký chi tiết thời gian xử lý (Timing) vào file email_timing.log ở thư mục gốc
            try:
                timing_file_path = os.path.join(base_dir, 'email_timing.log')
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                timing_entry = (
                    f"==================================================\n"
                    f"THỜI GIAN GỬI EMAIL: {timestamp}\n"
                    f"Chủ đề: {subject}\n"
                    f"File đính kèm: {attachment_name}\n"
                    f"Tổng thời gian xử lý: {total_elapsed:.3f}s\n"
                    f"Trạng thái cuối cùng: {status_str}\n"
                    f"Nhật ký chi tiết các bước thực hiện:\n"
                    + "\n".join(timing_steps) + "\n"
                    f"==================================================\n\n"
                )
                with open(timing_file_path, 'a', encoding='utf-8') as f:
                    f.write(timing_entry)
            except Exception as log_err:
                logger.error(f"Lỗi ghi log file email_timing.log: {str(log_err)}")
