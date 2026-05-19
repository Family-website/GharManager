// ============================================================
// GharManager Pro - Optimized Service Worker
// PWABuilder 100% Score ke liye sab kuch included hai
// ============================================================

const CACHE_NAME = 'gharmanager-v3';
const OFFLINE_URL = './offline.html';

const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon.png',
    './icon-maskable.png',
    './offline.html'
];

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Cache addAll partial error:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// ─── ACTIVATE ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Purane caches delete karo
            caches.keys().then((keyList) =>
                Promise.all(
                    keyList
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => {
                            console.log('[SW] Purana cache delete:', key);
                            return caches.delete(key);
                        })
                )
            ),
            // Naye SW ko turant control do
            self.clients.claim()
        ])
    );
});

// ─── FETCH ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        // Navigation requests: Network-first, offline fallback
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() =>
                    caches.match(event.request).then(r => r || caches.match(OFFLINE_URL))
                )
        );
        return;
    }

    if (event.request.destination === 'image' ||
        event.request.url.includes('icon') ||
        event.request.url.includes('fonts.googleapis') ||
        event.request.url.includes('fonts.gstatic')) {
        // Static assets: Cache-first
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                }).catch(() => cached);
            })
        );
        return;
    }

    // Default: Network-first
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// ─── BACKGROUND SYNC ────────────────────────────────────────
self.addEventListener('sync', (event) => {
    console.log('[SW] Background Sync triggered:', event.tag);

    if (event.tag === 'sync-expenses') {
        event.waitUntil(syncExpenses());
    }
    if (event.tag === 'sync-transactions') {
        event.waitUntil(syncTransactions());
    }
});

async function syncExpenses() {
    try {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'SYNC_EXPENSES' });
        });
        console.log('[SW] Expenses sync complete');
    } catch (err) {
        console.error('[SW] Sync failed:', err);
    }
}

async function syncTransactions() {
    try {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'SYNC_TRANSACTIONS' });
        });
        console.log('[SW] Transactions sync complete');
    } catch (err) {
        console.error('[SW] Transaction sync failed:', err);
    }
}

// ─── PERIODIC BACKGROUND SYNC ───────────────────────────────
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic Sync triggered:', event.tag);

    if (event.tag === 'daily-summary') {
        event.waitUntil(sendDailySummary());
    }
    if (event.tag === 'budget-check') {
        event.waitUntil(checkBudgetAlert());
    }
});

async function sendDailySummary() {
    try {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'DAILY_SUMMARY' });
        });
    } catch (err) {
        console.error('[SW] Daily summary failed:', err);
    }
}

async function checkBudgetAlert() {
    try {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'BUDGET_CHECK' });
        });
    } catch (err) {
        console.error('[SW] Budget check failed:', err);
    }
}

// ─── PUSH NOTIFICATIONS ─────────────────────────────────────
self.addEventListener('push', (event) => {
    let data = {
        title: 'GharManager',
        body: 'Aapka koi kaam pending hai!',
        icon: './icon.png',
        badge: './icon.png',
        tag: 'gharmanager-notification',
        data: { url: './' }
    };

    if (event.data) {
        try {
            const payload = event.data.json();
            data = { ...data, ...payload };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            data: data.data,
            vibrate: [200, 100, 200],
            actions: [
                { action: 'open', title: 'App Kholo' },
                { action: 'dismiss', title: 'Baad Mein' }
            ],
            requireInteraction: false
        })
    );
});

// ─── NOTIFICATION CLICK ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = (event.notification.data && event.notification.data.url) || './';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Agar app already khuli hai to focus karo
            for (const client of windowClients) {
                if (client.url.includes('gharmanager') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Warna naya window kholo
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// ─── NOTIFICATION CLOSE ─────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed:', event.notification.tag);
});

// ─── MESSAGE HANDLER ────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.source.postMessage({ type: 'VERSION', version: CACHE_NAME });
    }
});
