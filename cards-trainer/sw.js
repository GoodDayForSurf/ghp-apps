const CACHE = 'cards-trainer-shell-v1';
const SHELL = './index.html';

self.addEventListener('install', (event) => {
    event.waitUntil(
        fetch(SHELL).then((response) => {
            if (!response.ok) throw new Error('Failed to cache app shell');
            return caches.open(CACHE).then((cache) => cache.put(SHELL, response));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isShell = event.request.mode === 'navigate'
        || url.pathname.endsWith('/index.html')
        || url.pathname.endsWith('/');

    if (!isShell) return;

    event.respondWith(
        fetch(event.request).then((response) => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
            }
            return response;
        }).catch(async () => {
            const cached = await caches.match(SHELL);
            if (cached) return cached;
            throw new Error('App is not available offline yet');
        })
    );
});
