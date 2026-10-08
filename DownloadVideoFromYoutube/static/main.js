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
    let currentPlayerMode = 'video'; // 'video' | 'audio'
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
    const speedBtn = document.getElementById('speedBtn');
    const speedLabel = document.getElementById('speedLabel');
    const SPEED_STEPS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    let currentPlaybackRate = parseFloat(localStorage.getItem('tubex_playback_rate')) || 1.0;

    // ===== YouTube Search Elements =====
    const searchResultsSection = document.getElementById('searchResultsSection');
    const searchResultsList = document.getElementById('searchResultsList');
    const searchKeywordBadge = document.getElementById('searchKeywordBadge');
    const searchCountBadge = document.getElementById('searchCountBadge');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const loadingText = document.getElementById('loadingText');

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

    // ===== Input Detection & YouTube Search Logic =====
    function isYouTubeUrl(str) {
        if (!str) return false;
        const trimmed = str.trim();
        return /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(trimmed);
    }

    async function handleUrlOrSearchSubmit() {
        const inputVal = videoUrlInput.value.trim();
        if (!inputVal) {
            showError('Vui lòng nhập link YouTube hoặc từ khóa tìm kiếm!');
            return;
        }

        if (isYouTubeUrl(inputVal)) {
            if (searchResultsSection) searchResultsSection.style.display = 'none';
            await fetchVideoInfo(inputVal);
        } else {
            await performSearch(inputVal);
        }
    }

    analyzeBtn.addEventListener('click', handleUrlOrSearchSubmit);

    videoUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleUrlOrSearchSubmit();
        }
    });

    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            if (searchResultsSection) searchResultsSection.style.display = 'none';
        });
    }

    async function fetchVideoInfo(url, autoPlayBg = false) {
        resetUI();
        loading.style.display = 'block';
        if (loadingText) loadingText.textContent = 'Đang phân tích video...';
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

            if (autoPlayBg) {
                setTimeout(() => {
                    startStreamPlayback('video');
                }, 200);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            showError('Lỗi kết nối: Không thể liên lạc với Server. Hãy thử tải lại trang hoặc kiểm tra Log trên Render.');
        } finally {
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    }

    async function performSearch(query) {
        errorMsg.style.display = 'none';
        resultContainer.style.display = 'none';
        loading.style.display = 'block';
        if (loadingText) loadingText.textContent = `Đang tìm kiếm "${query}" trên YouTube...`;
        analyzeBtn.disabled = true;

        try {
            const proxy = proxyUrlInput.value.trim();
            let searchUrl = `/api/search?q=${encodeURIComponent(query)}&limit=20`;
            if (proxy) searchUrl += `&proxy=${encodeURIComponent(proxy)}`;

            const res = await fetch(searchUrl);
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Lỗi tìm kiếm server" }));
                showError(err.error || "Không thể tìm kiếm video");
                return;
            }

            const data = await res.json();
            if (data.error) {
                showError(data.error);
                return;
            }

            if (!data.results || data.results.length === 0) {
                showError(`Không tìm thấy video nào phù hợp với từ khóa "${query}".`);
                return;
            }

            renderSearchResults(data);
        } catch (e) {
            console.error('[Search Error]', e);
            showError('Lỗi kết nối khi tìm kiếm YouTube. Vui lòng thử lại!');
        } finally {
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    }

    function renderSearchResults(data) {
        if (!searchResultsSection || !searchResultsList) return;

        if (searchKeywordBadge) searchKeywordBadge.textContent = `"${data.query}"`;
        if (searchCountBadge) searchCountBadge.textContent = `${data.count} video`;
        searchResultsList.innerHTML = '';

        data.results.forEach(video => {
            const card = document.createElement('div');
            card.className = 'search-card';

            card.innerHTML = `
                <div class="search-card-thumb-wrap">
                    <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" loading="lazy">
                    ${video.duration_formatted ? `<span class="search-card-duration">${video.duration_formatted}</span>` : ''}
                </div>
                <div class="search-card-body">
                    <h4 class="search-card-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title)}</h4>
                    <div class="search-card-meta">
                        <span class="search-card-uploader">${escapeHtml(video.uploader)}</span>
                        ${video.view_count_formatted ? `<span class="search-card-views">👁️ ${video.view_count_formatted}</span>` : ''}
                    </div>
                    <div class="search-card-actions">
                        <button class="btn-card-action btn-card-play" type="button" title="Phát ngay video này">
                            ▶ Nghe ngay
                        </button>
                        <button class="btn-card-action btn-card-download" type="button" title="Xem chi tiết các định dạng tải">
                            ⬇ Tải về
                        </button>
                    </div>
                </div>
            `;

            // Sự kiện nút Play ngay
            const playBtn = card.querySelector('.btn-card-play');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    videoUrlInput.value = video.url;
                    searchResultsSection.style.display = 'none';
                    fetchVideoInfo(video.url, true);
                });
            }

            // Sự kiện nút Download
            const dlBtn = card.querySelector('.btn-card-download');
            if (dlBtn) {
                dlBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    videoUrlInput.value = video.url;
                    searchResultsSection.style.display = 'none';
                    fetchVideoInfo(video.url, false);
                });
            }

            // Nhấp vào thân thẻ để nghe ngay
            card.addEventListener('click', () => {
                videoUrlInput.value = video.url;
                searchResultsSection.style.display = 'none';
                fetchVideoInfo(video.url, true);
            });

            searchResultsList.appendChild(card);
        });

        searchResultsSection.style.display = 'block';
        searchResultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

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
        if (searchResultsSection) searchResultsSection.style.display = 'none';
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
                safeSetCurrentTime(active, Math.max(0, (active.currentTime || 0) - 10));
            });
            navigator.mediaSession.setActionHandler('seekforward', () => {
                const active = getActivePlayer();
                const dur = active.duration || 999999;
                safeSetCurrentTime(active, Math.min(dur, (active.currentTime || 0) + 10));
            });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                const active = getActivePlayer();
                if (details.seekTime !== undefined) {
                    safeSetCurrentTime(active, details.seekTime);
                }
            });
            try {
                navigator.mediaSession.setActionHandler('stop', () => {
                    const active = getActivePlayer();
                    active.pause();
                    safeSetCurrentTime(active, 0);
                    updatePlayButtonsState(false);
                });
            } catch (e) {
                console.warn('[MediaSession Stop Action]', e);
            }
        }
    }

    function safeSetCurrentTime(player, targetTime) {
        if (!targetTime || targetTime <= 0 || isNaN(targetTime)) return;
        if (player.readyState >= 1) {
            try {
                player.currentTime = targetTime;
            } catch (e) {
                console.warn('[Seek Error]', e);
            }
        } else {
            const onReady = () => {
                try {
                    player.currentTime = targetTime;
                } catch (e) {
                    console.warn('[Seek on Ready failed]', e);
                }
                player.removeEventListener('loadedmetadata', onReady);
                player.removeEventListener('canplay', onReady);
            };
            player.addEventListener('loadedmetadata', onReady, { once: true });
            player.addEventListener('canplay', onReady, { once: true });
        }
    }

    function startStreamPlayback(mode = 'video') {
        if (!currentVideoData || !currentStreamUrl) return;

        playerSection.style.display = 'block';
        currentPlayerMode = mode;
        if (mode === 'video') {
            modeVideoBtn.classList.add('active');
            modeAudioBtn.classList.remove('active');
            videoContainer.style.display = 'block';
            bgVideoPlayer.setAttribute('playsinline', '');
            bgVideoPlayer.setAttribute('webkit-playsinline', '');
        } else {
            modeAudioBtn.classList.add('active');
            modeVideoBtn.classList.remove('active');
            videoContainer.style.display = 'none';
        }

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
            // KHÔNG gọi activePlayer.load() để tránh AbortError trên Safari iOS và Chrome Mobile
            if (prevTime > 0) {
                safeSetCurrentTime(activePlayer, prevTime);
            }
        }

        playerStatusText.textContent = mode === 'video' ? '⏳ Đang tải đệm luồng phát...' : '⏳ Đang đệm âm thanh...';
        const playPromise = activePlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                activePlayer.playbackRate = currentPlaybackRate;
                updatePlayButtonsState(true);
                setupMediaSession();
                requestWakeLock();
            }).catch(err => {
                console.warn('Playback error or user gesture needed:', err);
                updatePlayButtonsState(false);
                playerStatusText.textContent = '👆 Chạm nút [▶] bên dưới để cho phép phát trên trình duyệt.';
            });
        }
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
            bgVideoPlayer.setAttribute('playsinline', '');
            bgVideoPlayer.setAttribute('webkit-playsinline', '');
        } else {
            modeAudioBtn.classList.add('active');
            modeVideoBtn.classList.remove('active');
            videoContainer.style.display = 'none';
        }

        const newPlayer = getActivePlayer();
        const proxy = proxyUrlInput.value.trim();
        let streamEndpoint = `/api/stream?url=${encodeURIComponent(currentStreamUrl)}&type=${newMode}`;
        if (proxy) streamEndpoint += `&proxy=${encodeURIComponent(proxy)}`;

        const fullTargetUrl = window.location.origin + streamEndpoint;
        if (newPlayer.src !== fullTargetUrl) {
            newPlayer.src = streamEndpoint;
        }
        if (currentTime > 0) {
            safeSetCurrentTime(newPlayer, currentTime);
        }

        if (wasPlaying) {
            const p = newPlayer.play();
            if (p !== undefined) {
                p.then(() => {
                    updatePlayButtonsState(true);
                    setupMediaSession();
                }).catch(e => {
                    console.warn(e);
                    updatePlayButtonsState(false);
                });
            }
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
        currentPlayerMode = 'video';
        modeVideoBtn.classList.add('active');
        modeAudioBtn.classList.remove('active');
        videoContainer.style.display = 'block';
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

                // Đồng bộ thanh tiến trình khóa màn hình (iOS Lock Screen & Android Notification)
                if ('mediaSession' in navigator && typeof navigator.mediaSession.setPositionState === 'function') {
                    try {
                        navigator.mediaSession.setPositionState({
                            duration: total,
                            playbackRate: player.playbackRate || 1.0,
                            position: Math.min(current, total)
                        });
                    } catch (e) {
                        console.warn('[MediaSession positionState failed]', e);
                    }
                }
            }
        });

        player.addEventListener('play', () => {
            player.playbackRate = currentPlaybackRate;
            if (player === getActivePlayer()) updatePlayButtonsState(true);
        });

        player.addEventListener('pause', () => {
            if (player === getActivePlayer()) updatePlayButtonsState(false);
        });

        player.addEventListener('waiting', () => {
            if (player === getActivePlayer()) {
                playerStatusText.textContent = '⏳ Đang đệm luồng phát...';
            }
        });

        player.addEventListener('playing', () => {
            if (player === getActivePlayer()) {
                updatePlayButtonsState(true);
            }
        });

        player.addEventListener('error', () => {
            if (player === getActivePlayer()) {
                console.error('[Media Error]', player.error);
                playerStatusText.textContent = '❌ Lỗi luồng phát. Hãy thử chạm lại nút Phát để tải lại.';
                updatePlayButtonsState(false);
            }
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
            safeSetCurrentTime(active, (playerSeek.value / 100) * total);
        }
    });

    seekBackBtn.addEventListener('click', () => {
        const active = getActivePlayer();
        safeSetCurrentTime(active, Math.max(0, (active.currentTime || 0) - 10));
    });

    seekForwardBtn.addEventListener('click', () => {
        const active = getActivePlayer();
        const dur = active.duration || (currentVideoData ? currentVideoData.duration : 0) || 999999;
        safeSetCurrentTime(active, Math.min(dur, (active.currentTime || 0) + 10));
    });

    bgVideoPlayer.addEventListener('click', () => {
        togglePlayback();
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

    // ===== Playback Speed Controls =====
    function applyPlaybackRate(rate) {
        currentPlaybackRate = rate;
        localStorage.setItem('tubex_playback_rate', rate);
        if (speedLabel) speedLabel.textContent = rate + 'x';
        if (bgVideoPlayer) bgVideoPlayer.playbackRate = rate;
        if (bgAudioPlayer) bgAudioPlayer.playbackRate = rate;
    }

    if (speedBtn) {
        speedBtn.addEventListener('click', () => {
            const currentIndex = SPEED_STEPS.indexOf(currentPlaybackRate);
            const nextIndex = (currentIndex >= 0 && currentIndex < SPEED_STEPS.length - 1) ? currentIndex + 1 : 0;
            const nextRate = SPEED_STEPS[nextIndex];
            applyPlaybackRate(nextRate);
            showToast(`⚡ Tốc độ phát: ${nextRate}x`);
        });
    }

    // Khởi tạo tốc độ phát ban đầu
    applyPlaybackRate(currentPlaybackRate);
});
