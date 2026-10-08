const CACHE_NAME = 'yt-downloader-pwa-v2.4.2';

const STATIC_ASSETS = [
    '/',
    '/static/style.css',
    '/static/main.js',
    '/static/manifest.json',
    '/static/icons/icon-192.png',
    '/static/icons/icon-512.png',
    '/static/icons/apple-touch-icon.png',
    '/static/icons/favicon.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'
];

// Install: Cache app shell assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Cache addAll warning:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Network-first for APIs, Stale-while-revalidate for static files
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Tuyệt đối không cache các API stream, download và info động
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // Với tài liệu HTML (Navigation request): Network first, fallback cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/'))
        );
        return;
    }

    // Với static assets: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
