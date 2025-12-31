// ==================== Search Terms Data ====================
const CATEGORIES = {
    // Moods
    happy: [
        "nhạc vui nhộn hay nhất",
        "nhạc remix sôi động",
        "EDM party việt nam",
        "nhạc dance việt"
    ],
    sad: [
        "nhạc buồn hay nhất",
        "ballad việt nam",
        "nhạc thất tình",
        "nhạc tâm trạng buồn"
    ],
    chill: [
        "nhạc chill việt nam",
        "lofi việt nam",
        "acoustic nhẹ nhàng",
        "nhạc cafe thư giãn"
    ],
    energy: [
        "nonstop việt mix",
        "nhạc bass cực mạnh",
        "nhạc bay phòng",
        "vinahouse hay nhất"
    ],
    romantic: [
        "nhạc tình yêu hay nhất",
        "love songs việt nam",
        "nhạc đám cưới",
        "nhạc valentine"
    ],

    // Purposes
    brainrot: [
        "Mất Não Audio",
        "Nhi Đồng Mất Não",
        "audio mất não hay nhất",
        "truyện audio hài hước",
        "Kho Hài Việt audio",
        "truyện cười audio việt nam",
        "audio giải trí mất não",
        "nhà có hũ kim cương audio"
    ],
    work: [
        "nhạc không lời hay nhất",
        "lofi study vietnam",
        "nhạc tập trung làm việc",
        "piano không lời"
    ],
    gym: [
        "nhạc gym việt nam",
        "workout music remix",
        "nhạc chạy bộ",
        "nhạc tập thể hình"
    ],
    relax: [
        "nhạc ngủ sâu",
        "relaxing music việt nam",
        "nhạc thiền thư giãn",
        "nhạc ru ngủ"
    ],
    party: [
        "nhạc quẩy hay nhất",
        "EDM party việt",
        "nonstop bar club",
        "nhạc sàn cực mạnh"
    ],
    drive: [
        "nhạc lái xe đường dài",
        "nhạc nghe trên xe",
        "nhạc nghe trên xe đường xa hay nhất",
        "nhạc du lịch"
    ]
};

// Invidious API instances (free, no API key needed)
const INVIDIOUS_INSTANCES = [
    "https://inv.nadeko.net",
    "https://invidious.snopyta.org",
    "https://yewtu.be",
    "https://invidious.nerdvpn.de"
];

// ==================== DOM Elements ====================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const musicBtns = document.querySelectorAll('.music-btn');
const randomBtn = document.getElementById('randomBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.querySelector('.loading-overlay p');

// ==================== Tab Switching ====================
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;

        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === targetTab) {
                panel.classList.add('active');
            }
        });
    });
});

// ==================== Helper Functions ====================
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function showLoading(message = "Đang tìm video...") {
    loadingText.textContent = message;
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// ==================== YouTube Search & Play ====================
async function searchYouTube(query) {
    // Try Invidious API first (no CORS issues, free)
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const response = await fetch(
                `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
                { signal: AbortSignal.timeout(5000) }
            );

            if (response.ok) {
                const results = await response.json();
                if (results && results.length > 0) {
                    // Return first video ID
                    return results[0].videoId;
                }
            }
        } catch (error) {
            console.log(`Instance ${instance} failed, trying next...`);
            continue;
        }
    }

    return null;
}

async function openYouTube(searchTerm) {
    showLoading("Đang tìm video...");

    try {
        // Try to get video ID from API
        const videoId = await searchYouTube(searchTerm);

        if (videoId) {
            showLoading("Đang mở video...");

            // Open YouTube video directly
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

            setTimeout(() => {
                hideLoading();
                window.open(youtubeUrl, '_blank');
            }, 300);
        } else {
            // Fallback: open search page
            showLoading("Đang mở YouTube...");

            const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;

            setTimeout(() => {
                hideLoading();
                window.open(searchUrl, '_blank');
            }, 300);
        }
    } catch (error) {
        console.error("Error:", error);
        hideLoading();

        // Fallback to search page
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
        window.open(searchUrl, '_blank');
    }
}

function playCategory(category) {
    const terms = CATEGORIES[category];
    if (terms && terms.length > 0) {
        const randomTerm = getRandomItem(terms);
        openYouTube(randomTerm);
    }
}

function playRandom() {
    const allTerms = Object.values(CATEGORIES).flat();
    const randomTerm = getRandomItem(allTerms);
    openYouTube(randomTerm);
}

// ==================== Event Listeners ====================
musicBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        playCategory(category);
    });
});

randomBtn.addEventListener('click', playRandom);

// ==================== PWA Install Prompt ====================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    setTimeout(() => {
        showInstallPrompt();
    }, 3000);
});

function showInstallPrompt() {
    if (!document.querySelector('.install-prompt')) {
        const prompt = document.createElement('div');
        prompt.className = 'install-prompt show';
        prompt.innerHTML = `
            <p>📱 Thêm vào màn hình chính?</p>
            <button class="install-btn" onclick="installPWA()">Cài đặt</button>
            <button class="close-prompt" onclick="this.parentElement.remove()">✕</button>
        `;
        document.body.appendChild(prompt);
    }
}

async function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
        document.querySelector('.install-prompt')?.remove();
    }
}

// ==================== Service Worker Registration ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('SW registration failed:', err));
    });
}

// ==================== Prevent Pull-to-Refresh ====================
document.body.addEventListener('touchmove', (e) => {
    if (e.target.closest('.tab-content')) {
        return;
    }
    e.preventDefault();
}, { passive: false });
