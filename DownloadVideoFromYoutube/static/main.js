document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const videoUrlInput = document.getElementById('videoUrl');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('errorMsg');
    const resultContainer = document.getElementById('resultContainer');
    const formatList = document.getElementById('formatList');
    const toggleSettings = document.getElementById('toggleSettings');
    const settingsPanel = document.getElementById('settingsPanel');
    const proxyUrlInput = document.getElementById('proxyUrl');

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

    // Xử lý ẩn/hiện Cài đặt nâng cao
    toggleSettings.addEventListener('click', () => {
        settingsPanel.classList.toggle('active');
        toggleSettings.classList.toggle('active');
    });

    // Load proxy từ localStorage nếu có
    const savedProxy = localStorage.getItem('yt_downloader_proxy');
    if (savedProxy) {
        proxyUrlInput.value = savedProxy;
        // Tự động mở panel nếu đã có proxy lưu sẵn
        settingsPanel.classList.add('active');
        toggleSettings.classList.add('active');
    }

    // Lưu proxy vào localStorage khi người dùng nhập
    proxyUrlInput.addEventListener('input', () => {
        localStorage.setItem('yt_downloader_proxy', proxyUrlInput.value.trim());
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
            const proxy = proxyUrlInput.value.trim();
            let apiUrl = `/api/info?url=${encodeURIComponent(url)}`;
            if (proxy) apiUrl += `&proxy=${encodeURIComponent(proxy)}`;

            const response = await fetch(apiUrl);
            
            // Nếu server trả về lỗi 500 hoặc 4xx
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
                showError("Lỗi hệ thống: " + (errorData.error || "Không xác định"));
                return;
            }

            const data = await response.json();

            if (data.error) {
                showError("Lỗi từ YouTube: " + data.error);
                return;
            }

            displayVideoInfo(data, url);
        } catch (error) {
            console.error("Fetch error:", error);
            showError('Lỗi kết nối: Không thể liên lạc với Server. Hãy thử tải lại trang hoặc kiểm tra Log trên Render.');
        } finally {
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    });

    function displayVideoInfo(data, originalUrl) {
        document.getElementById('videoTitle').textContent = data.title;
        
        let metaParts = [];
        if (data.uploader) metaParts.push(data.uploader);
        if (data.duration_formatted) metaParts.push(`⏱️ ${data.duration_formatted}`);
        if (data.view_count) metaParts.push(`👁️ ${Number(data.view_count).toLocaleString()} lượt xem`);
        document.getElementById('videoUploader').textContent = metaParts.join(' • ');
        
        document.getElementById('thumbImg').src = data.thumbnail;

        formatList.innerHTML = '';

        const validFormats = data.formats || [];

        if (validFormats.length === 0) {
            formatList.innerHTML = '<p style="color: #ff9800; padding: 10px; background: rgba(255,152,0,0.1); border-radius: 8px;">Không tìm thấy định dạng tải phù hợp.</p>';
        }

        validFormats.forEach(f => {
            const item = document.createElement('div');
            const isAudio = f.type === 'audio';
            item.className = isAudio ? 'format-item format-item-audio' : 'format-item';

            let sizeDisplay = f.filesize_formatted;
            if (!sizeDisplay || sizeDisplay === 'N/A') {
                if (f.filesize && f.filesize > 0) {
                    sizeDisplay = (f.filesize / (1024 * 1024)).toFixed(1) + ' MB';
                } else {
                    sizeDisplay = 'Tối ưu stream';
                }
            }
            const approxPrefix = (f.is_approx && sizeDisplay !== 'Tối ưu stream') ? '~' : '';
            const safeTitle = encodeURIComponent(data.title || 'video');
            const icon = isAudio ? '🎵' : '🎬';
            const qualityBadge = f.quality_badge ? `<span class="badge-quality">${f.quality_badge}</span>` : '';
            const fpsBadge = (f.fps && f.fps > 30) ? `<span class="badge-fps">${f.fps}fps</span>` : '';
            const sizeBadge = `<span class="size-pill">📦 ${approxPrefix}${sizeDisplay}</span>`;

            item.innerHTML = `
                <div class="format-meta">
                    <div class="format-title-row">
                        <span class="format-icon">${icon}</span>
                        <span class="res-tag">${f.res_label || f.resolution}</span>
                        ${qualityBadge}
                        ${fpsBadge}
                    </div>
                    <div class="format-details-row">
                        ${sizeBadge}
                        <span class="ext-pill">${f.ext.toUpperCase()}</span>
                        <span class="note-pill">${isAudio ? 'Tách riêng file nhạc' : 'Hình ảnh & Âm thanh'}</span>
                    </div>
                </div>
                <button class="btn-primary ${isAudio ? (f.ext === 'm4a' ? 'btn-m4a' : 'btn-audio') : ''}" onclick="downloadVideo(event, '${originalUrl}', '${f.format_id}', '${safeTitle}', '${f.ext}', '${f.type}')">
                    ${isAudio ? (f.ext === 'm4a' ? '⚡ Tải M4A' : '🎵 Tải MP3') : 'Tải về'}
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
            alert(msg);
            return;
        }
        toastMsg.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }

    window.downloadVideo = (event, url, formatId, title, ext, type) => {
        const btn = event ? (event.currentTarget || event.target) : null;
        let originalHTML = '';
        const token = 'dl_' + Date.now();
        let seconds = 0;

        if (btn) {
            originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="btn-spinner"></span> Đang xử lý...';
            btn.disabled = true;
            btn.classList.add('btn-loading');
        }
        
        const proxy = proxyUrlInput.value.trim();
        let downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format_id=${formatId}&title=${title || 'video'}&ext=${ext || 'mp4'}&type=${type || 'video'}&token=${token}`;
        if (proxy) downloadUrl += `&proxy=${encodeURIComponent(proxy)}`;

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Đếm giây & Lắng nghe Cookie Token khi server hoàn tất nén/gửi file
        const checkInterval = setInterval(() => {
            seconds++;
            if (btn && btn.classList.contains('btn-loading')) {
                if (seconds >= 2) {
                    btn.innerHTML = `<span class="btn-spinner"></span> Đang tạo file (${seconds}s)...`;
                }
            }

            // Kiểm tra Cookie từ response của server
            const cookieList = document.cookie.split(';');
            let isSuccess = false;
            let isError = false;

            for (let c of cookieList) {
                const item = c.trim();
                if (item.startsWith(`download_token=${token}`)) {
                    isSuccess = true;
                    document.cookie = `download_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    break;
                } else if (item.startsWith(`download_token=error_${token}`)) {
                    isError = true;
                    document.cookie = `download_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    break;
                }
            }

            if (isSuccess) {
                clearInterval(checkInterval);
                if (a.parentNode) document.body.removeChild(a);
                if (btn) {
                    btn.innerHTML = '✅ Đã tải xong!';
                    btn.classList.remove('btn-loading');
                    btn.classList.add('btn-success');
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                        btn.classList.remove('btn-success');
                    }, 4000);
                }
            } else if (isError) {
                clearInterval(checkInterval);
                if (a.parentNode) document.body.removeChild(a);
                if (btn) {
                    btn.innerHTML = '❌ Lỗi tải!';
                    btn.classList.remove('btn-loading');
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                    }, 4000);
                }
                showError("Không thể hoàn tất tải file từ YouTube. Vui lòng thử lại!");
            } else if (seconds >= 600) { // Timeout an toàn 10 phút
                clearInterval(checkInterval);
                if (a.parentNode) document.body.removeChild(a);
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    btn.classList.remove('btn-loading');
                }
            }
        }, 1000);
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
