const CACHE_NAME = 'gharmanager-v3';

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                './',
                './index.html',
                './style.css',
                './cloud.js',
                './auth.js',
                './charts.js',
                './expense.js',
                './ui.js',
                './manifest.json',
                './icon.png'
            ]).catch(err => console.log('Cache error', err));
        })
    );
    self.skipWaiting();
});

// Purane Cache (memory) ko automatically delete karne ka jaadu
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Purana cache delete ho gaya:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
