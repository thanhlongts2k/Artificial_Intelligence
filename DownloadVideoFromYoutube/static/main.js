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

    // ===== Background & PiP Media Player Elements & State =====
    let currentVideoData = null;
    let currentStreamUrl = null;
    let currentPlayerMode = 'audio'; // 'audio' | 'video'
    let wakeLock = null;

    const playBgBtn = document.getElementById('playBgBtn');
    const playerSection = document.getElementById('playerSection');
    const bgAudioPlayer = document.getElementById('bgAudioPlayer');
    const bgVideoPlayer = document.getElementById('bgVideoPlayer');
    const videoContainer = document.getElementById('videoContainer');
    const modeAudioBtn = document.getElementById('modeAudioBtn');
    const modeVideoBtn = document.getElementById('modeVideoBtn');
    const closePlayerBtn = document.getElementById('closePlayerBtn');
    const pipBtn = document.getElementById('pipBtn');
    const mainPlayPauseBtn = document.getElementById('mainPlayPauseBtn');
    const playPauseIcon = document.getElementById('playPauseIcon');
    const playerSeek = document.getElementById('playerSeek');
    const playerCurrentTime = document.getElementById('playerCurrentTime');
    const playerDuration = document.getElementById('playerDuration');
    const seekBackBtn = document.getElementById('seekBackBtn');
    const seekForwardBtn = document.getElementById('seekForwardBtn');
    const playerStatusText = document.getElementById('playerStatusText');

    // ===== PWA Install & Service Worker Management =====
    const pwaInstallBtn = document.getElementById('pwaInstallBtn');
    const iosInstallModal = document.getElementById('iosInstallModal');
    const closeIosModal = document.getElementById('closeIosModal');
    let deferredInstallPrompt = null;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (!isStandalone) {
        if (isIos) {
            // Hiển thị nút trên iOS để hướng dẫn Thêm vào Màn hình chính
            pwaInstallBtn.style.display = 'inline-flex';
        }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (!isStandalone) {
            pwaInstallBtn.style.display = 'inline-flex';
        }
    });

    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                const { outcome } = await deferredInstallPrompt.userChoice;
                if (outcome === 'accepted') {
                    pwaInstallBtn.style.display = 'none';
                    showToast('🎉 Đang tiến hành cài đặt ứng dụng...');
                }
                deferredInstallPrompt = null;
            } else if (isIos && iosInstallModal) {
                iosInstallModal.style.display = 'flex';
            } else {
                showToast('💡 Mẹo: Bấm menu 3 chấm trên trình duyệt > chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".');
            }
        });
    }

    if (closeIosModal && iosInstallModal) {
        closeIosModal.addEventListener('click', () => {
            iosInstallModal.style.display = 'none';
        });
        iosInstallModal.addEventListener('click', (e) => {
            if (e.target === iosInstallModal) iosInstallModal.style.display = 'none';
        });
    }

    window.addEventListener('appinstalled', () => {
        if (pwaInstallBtn) pwaInstallBtn.style.display = 'none';
        deferredInstallPrompt = null;
        showToast('🎉 Ứng dụng đã được cài đặt thành công!');
    });

    // Đăng ký Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then((reg) => {
                    console.log('[PWA] Service Worker registered:', reg.scope);
                })
                .catch((err) => {
                    console.warn('[PWA] Service Worker registration failed:', err);
                });
        });
    }

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
        currentVideoData = data;
        currentStreamUrl = originalUrl;
        resetPlayer();

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
        resetPlayer();
    }

    // ===== Player Controller Logic =====
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        const s = Math.floor(seconds);
        const hrs = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function getActivePlayer() {
        return currentPlayerMode === 'video' ? bgVideoPlayer : bgAudioPlayer;
    }

    function updatePlayButtonsState(isPlaying) {
        if (isPlaying) {
            playPauseIcon.textContent = '⏸';
            playBgBtn.classList.add('is-playing');
            playBgBtn.innerHTML = '<span class="play-icon">⏸</span> <span class="play-text">Tạm dừng</span>';
            playerStatusText.textContent = currentPlayerMode === 'video' 
                ? 'Đang phát video. Nhấn "Cửa sổ nổi (PiP)" để xem khi chuyển ứng dụng.'
                : 'Đang phát nền (iOS & Android). Bạn có thể tắt màn hình hoặc chuyển tab.';
        } else {
            playPauseIcon.textContent = '▶';
            playBgBtn.classList.remove('is-playing');
            playBgBtn.innerHTML = '<span class="play-icon">▶</span> <span class="play-text">Phát dưới nền</span>';
            playerStatusText.textContent = 'Đã tạm dừng. Bấm nút Phát để tiếp tục.';
        }
    }

    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) {
                // Ignore wake lock denial
            }
        }
    }

    function releaseWakeLock() {
        if (wakeLock) {
            wakeLock.release().then(() => { wakeLock = null; }).catch(() => {});
        }
    }

    function setupMediaSession() {
        if ('mediaSession' in navigator && currentVideoData) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentVideoData.title,
                artist: currentVideoData.uploader || 'YouTube',
                album: 'YouTube Downloader Stream',
                artwork: [
                    { src: currentVideoData.thumbnail, sizes: '512x512', type: 'image/jpeg' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => {
                const active = getActivePlayer();
                active.play().catch(e => console.error(e));
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                const active = getActivePlayer();
                active.pause();
            });
            navigator.mediaSession.setActionHandler('seekbackward', () => {
                const active = getActivePlayer();
                active.currentTime = Math.max(0, (active.currentTime || 0) - 10);
            });
            navigator.mediaSession.setActionHandler('seekforward', () => {
                const active = getActivePlayer();
                const dur = active.duration || 999999;
                active.currentTime = Math.min(dur, (active.currentTime || 0) + 10);
            });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                const active = getActivePlayer();
                if (details.seekTime !== undefined) {
                    active.currentTime = details.seekTime;
                }
            });
        }
    }

    function startStreamPlayback(mode = 'audio') {
        if (!currentVideoData || !currentStreamUrl) return;

        playerSection.style.display = 'block';
        const proxy = proxyUrlInput.value.trim();
        let streamEndpoint = `/api/stream?url=${encodeURIComponent(currentStreamUrl)}&type=${mode}`;
        if (proxy) streamEndpoint += `&proxy=${encodeURIComponent(proxy)}`;

        const activePlayer = mode === 'video' ? bgVideoPlayer : bgAudioPlayer;
        const inactivePlayer = mode === 'video' ? bgAudioPlayer : bgVideoPlayer;

        inactivePlayer.pause();

        let prevTime = 0;
        if (activePlayer.src && activePlayer.src.includes('/api/stream')) {
            prevTime = activePlayer.currentTime || 0;
        } else if (inactivePlayer.currentTime) {
            prevTime = inactivePlayer.currentTime;
        }

        const fullTargetUrl = window.location.origin + streamEndpoint;
        if (activePlayer.src !== fullTargetUrl) {
            activePlayer.src = streamEndpoint;
            if (prevTime > 0) {
                activePlayer.currentTime = prevTime;
            }
        }

        playerStatusText.textContent = 'Đang đệm âm thanh...';
        activePlayer.play().then(() => {
            updatePlayButtonsState(true);
            setupMediaSession();
            requestWakeLock();
        }).catch(err => {
            console.error('Playback error:', err);
            playerStatusText.textContent = 'Vui lòng chạm nút Phát để cấp quyền phát âm thanh.';
        });
    }

    function togglePlayback() {
        const active = getActivePlayer();
        if (playerSection.style.display === 'none') {
            playerSection.style.display = 'block';
            startStreamPlayback(currentPlayerMode);
            return;
        }

        if (active.paused) {
            if (!active.src) {
                startStreamPlayback(currentPlayerMode);
            } else {
                active.play().then(() => {
                    updatePlayButtonsState(true);
                    setupMediaSession();
                    requestWakeLock();
                }).catch(err => console.error(err));
            }
        } else {
            active.pause();
            updatePlayButtonsState(false);
            releaseWakeLock();
        }
    }

    function switchPlayerMode(newMode) {
        if (currentPlayerMode === newMode) return;
        const oldPlayer = getActivePlayer();
        const currentTime = oldPlayer.currentTime || 0;
        const wasPlaying = !oldPlayer.paused;

        oldPlayer.pause();
        currentPlayerMode = newMode;

        if (newMode === 'video') {
            modeVideoBtn.classList.add('active');
            modeAudioBtn.classList.remove('active');
            videoContainer.style.display = 'block';
        } else {
            modeAudioBtn.classList.add('active');
            modeVideoBtn.classList.remove('active');
            videoContainer.style.display = 'none';
        }

        const newPlayer = getActivePlayer();
        const proxy = proxyUrlInput.value.trim();
        let streamEndpoint = `/api/stream?url=${encodeURIComponent(currentStreamUrl)}&type=${newMode}`;
        if (proxy) streamEndpoint += `&proxy=${encodeURIComponent(proxy)}`;

        newPlayer.src = streamEndpoint;
        newPlayer.currentTime = currentTime;

        if (wasPlaying) {
            newPlayer.play().then(() => {
                updatePlayButtonsState(true);
                setupMediaSession();
            }).catch(e => console.error(e));
        } else {
            updatePlayButtonsState(false);
        }
    }

    function resetPlayer() {
        bgAudioPlayer.pause();
        bgAudioPlayer.src = '';
        bgVideoPlayer.pause();
        bgVideoPlayer.src = '';
        releaseWakeLock();
        playerSection.style.display = 'none';
        updatePlayButtonsState(false);
        playerSeek.value = 0;
        playerCurrentTime.textContent = '00:00';
        playerDuration.textContent = '00:00';
        currentPlayerMode = 'audio';
        modeAudioBtn.classList.add('active');
        modeVideoBtn.classList.remove('active');
        videoContainer.style.display = 'none';
    }

    [bgAudioPlayer, bgVideoPlayer].forEach(player => {
        player.addEventListener('timeupdate', () => {
            if (player !== getActivePlayer()) return;
            const current = player.currentTime || 0;
            const total = player.duration || (currentVideoData ? currentVideoData.duration : 0) || 0;
            playerCurrentTime.textContent = formatTime(current);
            if (total > 0 && !isNaN(total)) {
                playerDuration.textContent = formatTime(total);
                playerSeek.value = (current / total) * 100;
            }
        });

        player.addEventListener('play', () => {
            if (player === getActivePlayer()) updatePlayButtonsState(true);
        });

        player.addEventListener('pause', () => {
            if (player === getActivePlayer()) updatePlayButtonsState(false);
        });

        player.addEventListener('ended', () => {
            if (player === getActivePlayer()) {
                updatePlayButtonsState(false);
                releaseWakeLock();
            }
        });

        player.addEventListener('loadedmetadata', () => {
            if (player === getActivePlayer() && player.duration) {
                playerDuration.textContent = formatTime(player.duration);
            }
        });
    });

    playerSeek.addEventListener('input', () => {
        const active = getActivePlayer();
        const total = active.duration || (currentVideoData ? currentVideoData.duration : 0) || 0;
        if (total > 0) {
            const seekTo = (playerSeek.value / 100) * total;
            playerCurrentTime.textContent = formatTime(seekTo);
        }
    });

    playerSeek.addEventListener('change', () => {
        const active = getActivePlayer();
        const total = active.duration || (currentVideoData ? currentVideoData.duration : 0) || 0;
        if (total > 0) {
            active.currentTime = (playerSeek.value / 100) * total;
        }
    });

    seekBackBtn.addEventListener('click', () => {
        const active = getActivePlayer();
        active.currentTime = Math.max(0, (active.currentTime || 0) - 10);
    });

    seekForwardBtn.addEventListener('click', () => {
        const active = getActivePlayer();
        const dur = active.duration || (currentVideoData ? currentVideoData.duration : 0) || 999999;
        active.currentTime = Math.min(dur, (active.currentTime || 0) + 10);
    });

    mainPlayPauseBtn.addEventListener('click', togglePlayback);
    playBgBtn.addEventListener('click', togglePlayback);

    modeAudioBtn.addEventListener('click', () => switchPlayerMode('audio'));
    modeVideoBtn.addEventListener('click', () => switchPlayerMode('video'));

    closePlayerBtn.addEventListener('click', () => {
        const active = getActivePlayer();
        active.pause();
        updatePlayButtonsState(false);
        releaseWakeLock();
        playerSection.style.display = 'none';
    });

    pipBtn.addEventListener('click', async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled && bgVideoPlayer) {
                await bgVideoPlayer.requestPictureInPicture();
            }
        } catch (err) {
            console.error('PiP Error:', err);
            showToast('Thiết bị hoặc trình duyệt này không hỗ trợ chế độ Cửa sổ nổi PiP.');
        }
    });

    // Allow enter key to trigger search
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            analyzeBtn.click();
        }
    });
});
