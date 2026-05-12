// Install Event
self.addEventListener('install', (e) => {
    console.log('[Service Worker] GharManager App Install');
});

// Fetch Event - Ye lagana sabse zaroori hai tabhi "Install" ka popup aayega!
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => {
            console.log("Network request failed");
        })
    );
});
