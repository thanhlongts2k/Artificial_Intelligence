document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const videoUrlInput = document.getElementById('videoUrl');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('errorMsg');
    const resultContainer = document.getElementById('resultContainer');
    const formatList = document.getElementById('formatList');

    // Khởi tạo Mã QR (Tự động lấy URL hiện tại của trang web)
    const currentUrl = window.location.origin;
    new QRCode(document.getElementById("qrcode"), {
        text: currentUrl,
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    // Xử lý nút Dán
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            videoUrlInput.value = text;
        } catch (err) {
            showError("Không thể tự động dán do bảo mật trình duyệt trên mạng LAN. Bạn vui lòng tự nhấn giữ ô nhập liệu và chọn Dán (Paste).");
        }
    });

    analyzeBtn.addEventListener('click', async () => {
        const url = videoUrlInput.value.trim();
        if (!url) {
            showError('Vui lòng nhập link YouTube!');
            return;
        }

        resetUI();
        loading.style.display = 'block';
        analyzeBtn.disabled = true;

        try {
            const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (data.error) {
                showError("Lỗi: " + data.error);
                return;
            }

            displayVideoInfo(data, url);
        } catch (error) {
            showError('Đã xảy ra lỗi khi kết nối với máy chủ. Hãy đảm bảo app.py đang chạy.');
        } finally {
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    });

    function displayVideoInfo(data, originalUrl) {
        document.getElementById('videoTitle').textContent = data.title;
        document.getElementById('videoUploader').textContent = data.uploader;
        document.getElementById('thumbImg').src = data.thumbnail;

        formatList.innerHTML = '';

        const validFormats = data.formats || [];

        if (validFormats.length === 0) {
            formatList.innerHTML = '<p style="color: #ff9800; padding: 10px; background: rgba(255,152,0,0.1); border-radius: 8px;">Không tìm thấy định dạng tải trực tiếp (MP4 combo v+a). Bạn có thể cần cài FFmpeg để tải các định dạng chất lượng cao hơn.</p>';
        }

        validFormats.forEach(f => {
            const item = document.createElement('div');
            item.className = 'format-item';

            const sizeMb = f.filesize ? (f.filesize / (1024 * 1024)).toFixed(1) + ' MB' : 'N/A';
            const res = f.resolution || 'Unknown';
            const safeTitle = encodeURIComponent(data.title || 'video');
            item.innerHTML = `
                <div class="format-meta">
                    <span class="res-tag">${res}</span>
                    <span class="ext-tag">${f.ext.toUpperCase()} • ${sizeMb} • ${f.note || 'Video'}</span>
                </div>
                <button class="btn-primary" onclick="downloadVideo(event, '${originalUrl}', '${f.format_id}', '${safeTitle}', '${f.ext}')">
                    Tải về
                </button>
            `;
            formatList.appendChild(item);
        });

        resultContainer.style.display = 'block';
        // Smooth scroll to results
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function showToast(msg, duration = 8000) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMsg');
        if (!toast || !toastMsg) {
            console.error('Toast elements not found');
            alert(msg); // Fallback to alert if toast fails
            return;
        }
        toastMsg.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }

    window.downloadVideo = (event, url, formatId, title, ext) => {
        const btn = event ? (event.currentTarget || event.target) : null;
        let originalHTML = '';

        if (btn) {
            originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="btn-spinner"></span> Đang tải...';
            btn.disabled = true;
            btn.classList.add('btn-loading');
        }

        const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format_id=${formatId}&title=${title || 'video'}&ext=${ext || 'mp4'}`;

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Re-enable after some time (server needs time to process)
        setTimeout(() => {
            if (a.parentNode) document.body.removeChild(a);
            if (btn) {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                btn.classList.remove('btn-loading');
            }
        }, 30000);
    };

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    function resetUI() {
        errorMsg.style.display = 'none';
        resultContainer.style.display = 'none';
    }

    // Allow enter key to trigger search
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            analyzeBtn.click();
        }
    });
});
