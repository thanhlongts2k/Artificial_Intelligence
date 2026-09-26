import json
from rest_framework import serializers

class EmailRecipientField(serializers.Field):
    """
    Field tùy biến kiểm tra và chuẩn hóa to_emails:
    - Hỗ trợ mảng Python List / JSON Array: ["user1@example.com", "user2@example.com"]
    - Hỗ trợ chuỗi phân cách bởi dấu phẩy: "user1@example.com, user2@example.com"
    - Hỗ trợ chuỗi JSON string: '["user1@example.com", "user2@example.com"]'
    """
    def to_internal_value(self, value):
        emails_raw = []

        if isinstance(value, list):
            emails_raw = value
        elif isinstance(value, str):
            value = value.strip()
            if value.startswith('[') and value.endswith(']'):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        emails_raw = parsed
                    else:
                        emails_raw = [e.strip() for e in value.split(',') if e.strip()]
                except json.JSONDecodeError:
                    emails_raw = [e.strip() for e in value.split(',') if e.strip()]
            else:
                emails_raw = [e.strip() for e in value.split(',') if e.strip()]
        else:
            raise serializers.ValidationError("Định dạng email người nhận không hợp lệ (phải là chuỗi hoặc mảng).")

        if not emails_raw:
            raise serializers.ValidationError("Danh sách email người nhận (to_emails) không được để rỗng.")

        email_validator = serializers.EmailField()
        validated_emails = []

        for item in emails_raw:
            clean_email = str(item).strip()
            try:
                email_validator.run_validation(clean_email)
                validated_emails.append(clean_email)
            except serializers.ValidationError:
                raise serializers.ValidationError(f"Địa chỉ email '{clean_email}' không đúng định dạng.")

        return validated_emails

    def to_representation(self, value):
        return value


class SendEmailSerializer(serializers.Serializer):
    """
    Serializer kiểm tra và chuẩn hóa dữ liệu đầu vào cho SendEmailAPIView.
    Hỗ trợ truyền to_emails dạng chuỗi phân cách bởi dấu phẩy hoặc mảng JSON.
    """
    to_emails = EmailRecipientField(
        required=True,
        help_text="Email người nhận. Nhập dạng chuỗi phân cách bởi dấu phẩy (VD: 'user1@example.com, user2@example.com') hoặc mảng JSON."
    )
    subject = serializers.CharField(max_length=255, required=True, help_text="Tiêu đề của email")
    message = serializers.CharField(required=False, allow_blank=True, default="", help_text="Nội dung văn bản thuần (plain text) của email")
    html_message = serializers.CharField(required=False, allow_blank=True, default="", help_text="Nội dung định dạng HTML của email (tùy chọn)")
    is_html = serializers.BooleanField(required=False, default=False, help_text="Đánh dấu nếu gửi email định dạng HTML")
    from_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="", help_text="Tên hiển thị tùy chỉnh cho người gửi")
    from_email = serializers.EmailField(required=False, allow_blank=True, default="", help_text="Địa chỉ email phản hồi (reply-to)")
    file_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="", help_text="Tên tệp đính kèm tùy chỉnh (nếu muốn đổi tên)")
