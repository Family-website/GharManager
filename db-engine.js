// ============================================================
// 🏦 GharManager Pro — Advanced Data Engine v2.0
// ============================================================
// Features:
//   ✅ IndexedDB (offline-first, replaces localStorage for data)
//   ✅ Firestore Sub-Collections (replaces single-document hack)
//   ✅ Debounced Batch Writes (fast, atomic, grouped)
//   ✅ AES-256-GCM Real Encryption (backup/restore)
//   ✅ Paginated Expense Loading (20 at a time)
//   ✅ Offline Sync Queue (auto-flush when back online)
//   ✅ One-time migration from localStorage + old Firestore doc
// ============================================================

'use strict';

// ============================================================
// 🗄️  SECTION 1 — IndexedDB Setup
// ============================================================

const IDB_NAME    = 'GharManagerDB';
const IDB_VERSION = 2;
const IDB_STORES  = ['expenses','dudh','ration','investments',
                     'loans','subscriptions','recharges',
                     'savingsJars','udhars','giftFunds',
                     'profile','syncQueue'];

let _idb = null; // shared IDB connection

function openIDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);

        req.onupgradeneeded = (e) => {
            const d = e.target.result;
            IDB_STORES.forEach(name => {
                if (d.objectStoreNames.contains(name)) return;

                const isAutoId = (name === 'syncQueue');
                const store = d.createObjectStore(name, {
                    keyPath: 'id',
                    autoIncrement: isAutoId
                });

                // Useful indexes for expenses
                if (name === 'expenses') {
                    store.createIndex('byDate',     'date',     { unique: false });
                    store.createIndex('byCategory', 'category', { unique: false });
                    store.createIndex('byMember',   'member',   { unique: false });
                }
                // Index for sync queue ordering
                if (name === 'syncQueue') {
                    store.createIndex('byTimestamp', 'timestamp', { unique: false });
                }
            });
        };

        req.onsuccess  = (e) => { _idb = e.target.result; resolve(_idb); };
        req.onerror    = (e) => reject(e.target.error);
    });
}

// ============================================================
// 🔧 SECTION 2 — IDB Helper Functions
// ============================================================

function _tx(store, mode = 'readonly') {
    return _idb.transaction(store, mode).objectStore(store);
}

function idbGet(store, key) {
    return new Promise((res, rej) => {
        const r = _tx(store).get(key);
        r.onsuccess = () => res(r.result || null);
        r.onerror   = () => rej(r.error);
    });
}

function idbPut(store, data) {
    return new Promise((res, rej) => {
        const r = _tx(store, 'readwrite').put(data);
        r.onsuccess = () => res(r.result);
        r.onerror   = () => rej(r.error);
    });
}

function idbDelete(store, key) {
    return new Promise((res, rej) => {
        const r = _tx(store, 'readwrite').delete(key);
        r.onsuccess = () => res();
        r.onerror   = () => rej(r.error);
    });
}

function idbClear(store) {
    return new Promise((res, rej) => {
        const r = _tx(store, 'readwrite').clear();
        r.onsuccess = () => res();
        r.onerror   = () => rej(r.error);
    });
}

/** Get ALL records, optionally filtered/sorted in JS */
function idbGetAll(store) {
    return new Promise((res, rej) => {
        const r = _tx(store).getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror   = () => rej(r.error);
    });
}

/** Count records in a store */
function idbCount(store) {
    return new Promise((res, rej) => {
        const r = _tx(store).count();
        r.onsuccess = () => res(r.result);
        r.onerror   = () => rej(r.error);
    });
}

// ============================================================
// 🔐 SECTION 3 — AES-256-GCM Encryption Engine
// ============================================================

const AES_ENGINE = {
    /**
     * Derive a CryptoKey from a user password using PBKDF2.
     * @param {string} password
     * @param {Uint8Array} salt
     */
    async _deriveKey(password, salt) {
        const enc = new TextEncoder();
        const raw = await crypto.subtle.importKey(
            'raw', enc.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
            raw,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypt any JSON-serializable object.
     * Returns base64 string: [16-byte salt][12-byte IV][ciphertext]
     */
    async encrypt(data, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv   = crypto.getRandomValues(new Uint8Array(12));
        const key  = await this._deriveKey(password, salt);
        const enc  = new TextEncoder();
        const cipher = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(JSON.stringify(data))
        );
        const out = new Uint8Array(16 + 12 + cipher.byteLength);
        out.set(salt, 0);
        out.set(iv,   16);
        out.set(new Uint8Array(cipher), 28);
        // Convert to base64 in chunks to avoid call-stack overflow
        let binary = '';
        out.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
    },

    /**
     * Decrypt a base64 string produced by encrypt().
     */
    async decrypt(b64, password) {
        const binary = atob(b64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const salt      = bytes.slice(0, 16);
        const iv        = bytes.slice(16, 28);
        const cipher    = bytes.slice(28);
        const key       = await this._deriveKey(password, salt);
        const plain     = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
        return JSON.parse(new TextDecoder().decode(plain));
    }
};

// ============================================================
// ⚡ SECTION 4 — Debounced Batch Write Engine
// ============================================================

const BATCH_ENGINE = {
    _queue : [],
    _timer : null,
    DELAY  : 1800,   // ms — waits this long after last change before flushing
    MAX_OPS: 499,    // Firestore batch limit is 500

    /** Queue a single Firestore operation */
    add(op) {
        // De-duplicate: if same collection+id already queued, replace it
        const idx = this._queue.findIndex(
            q => q.collection === op.collection && q.id === op.id
        );
        if (idx !== -1) this._queue[idx] = op;
        else            this._queue.push(op);

        this._schedule();
    },

    _schedule() {
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => this.flush(), this.DELAY);
    },

    /** Immediately flush everything in the queue */
    async flush() {
        if (this._queue.length === 0) return;
        const ops = this._queue.splice(0);   // drain

        // If offline or no user → persist to syncQueue in IDB
        if (typeof isOffline === 'undefined' || isOffline || !currentUser) {
            for (const op of ops) {
                await idbPut('syncQueue', {
                    ...op,
                    id        : `sq_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                    timestamp : Date.now()
                }).catch(() => {});
            }
            _setSyncStatus('📴 Offline — Queued');
            return;
        }

        // Split into Firestore batches of MAX_OPS
        for (let i = 0; i < ops.length; i += this.MAX_OPS) {
            const batch = db.batch();
            ops.slice(i, i + this.MAX_OPS).forEach(op => {
                const ref = db
                    .collection('users').doc(currentUser.uid)
                    .collection(op.collection).doc(op.id);
                if      (op.type === 'set')    batch.set(ref, op.data, { merge: true });
                else if (op.type === 'delete') batch.delete(ref);
                else if (op.type === 'update') batch.update(ref, op.data);
            });
            await batch.commit().catch(async (err) => {
                console.error('Batch commit failed, re-queuing:', err);
                for (const op of ops) {
                    await idbPut('syncQueue', {
                        ...op,
                        id        : `sq_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                        timestamp : Date.now()
                    }).catch(() => {});
                }
                _setSyncStatus('⚠️ Sync Failed — Retrying later');
            });
        }
        _setSyncStatus('☁️ Synced');
    }
};

// ============================================================
// 🏗️ SECTION 5 — GharDB Main API
// ============================================================

const GharDB = {

    // ── UNIQUE ID GENERATOR ────────────────────────────────
    _uid(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    },

    // ── EXPENSES (with pagination support) ─────────────────

    async addExpense(expense) {
        const id     = expense.id || this._uid('exp');
        const record = { ...expense, id, createdAt: Date.now(), updatedAt: Date.now() };
        await idbPut('expenses', record);
        BATCH_ENGINE.add({ type: 'set', collection: 'expenses', id, data: record });
        return record;
    },

    async deleteExpense(id) {
        await idbDelete('expenses', id);
        BATCH_ENGINE.add({ type: 'delete', collection: 'expenses', id });
    },

    /**
     * Paginated expense fetch.
     * @param {object} opts  page, pageSize, category, member, dateFrom, dateTo, keyword
     * @returns {{ data, total, hasMore, page }}
     */
    async getExpenses({ page = 0, pageSize = 20, category, member,
                        dateFrom, dateTo, keyword } = {}) {
        let all = await idbGetAll('expenses');

        // Apply filters
        if (category) all = all.filter(e => e.category === category);
        if (member)   all = all.filter(e => e.member   === member);
        if (dateFrom) all = all.filter(e => e.date >= dateFrom);
        if (dateTo)   all = all.filter(e => e.date <= dateTo);
        if (keyword)  all = all.filter(e =>
            (e.description || '').toLowerCase().includes(keyword.toLowerCase()) ||
            (e.category    || '').toLowerCase().includes(keyword.toLowerCase())
        );

        // Sort newest-first
        all.sort((a, b) => {
            const d = (b.date || '').localeCompare(a.date || '');
            return d !== 0 ? d : (b.createdAt || 0) - (a.createdAt || 0);
        });

        const start = page * pageSize;
        return {
            data    : all.slice(start, start + pageSize),
            total   : all.length,
            hasMore : start + pageSize < all.length,
            page
        };
    },

    // ── GENERIC CRUD (dudh, ration, loans, etc.) ───────────

    async addRecord(collection, data) {
        const prefix = collection.slice(0, 3);
        const id     = data.id || this._uid(prefix);
        const record = { ...data, id, createdAt: Date.now(), updatedAt: Date.now() };
        await idbPut(collection, record);
        BATCH_ENGINE.add({ type: 'set', collection, id, data: record });
        return record;
    },

    async updateRecord(collection, id, updates) {
        const existing = await idbGet(collection, id);
        if (!existing) return null;
        const updated = { ...existing, ...updates, updatedAt: Date.now() };
        await idbPut(collection, updated);
        BATCH_ENGINE.add({ type: 'update', collection, id, data: { ...updates, updatedAt: updated.updatedAt } });
        return updated;
    },

    async deleteRecord(collection, id) {
        await idbDelete(collection, id);
        BATCH_ENGINE.add({ type: 'delete', collection, id });
    },

    async getAll(collection) {
        return idbGetAll(collection);
    },

    // ── PROFILE ────────────────────────────────────────────

    async saveProfile(data) {
        const record = { id: 'profile', ...data, updatedAt: Date.now() };
        await idbPut('profile', record);
        BATCH_ENGINE.add({ type: 'set', collection: 'profile', id: 'profile', data: record });
    },

    async getProfile() {
        return idbGet('profile', 'profile');
    },

    // ── SYNC FROM CLOUD (sub-collections) ──────────────────

    async syncFromCloud(uid) {
        if (typeof isOffline !== 'undefined' && isOffline) return;

        const COLLECTIONS = [
            'expenses','dudh','ration','investments','loans',
            'subscriptions','recharges','savingsJars','udhars','giftFunds'
        ];

        for (const col of COLLECTIONS) {
            try {
                const snap = await db
                    .collection('users').doc(uid)
                    .collection(col).get();
                if (snap.empty) continue;
                for (const doc of snap.docs) {
                    await idbPut(col, { ...doc.data(), id: doc.id });
                }
            } catch (e) {
                console.warn(`syncFromCloud [${col}]:`, e.message);
            }
        }

        // Profile sub-collection
        try {
            const pSnap = await db
                .collection('users').doc(uid)
                .collection('profile').doc('profile').get();
            if (pSnap.exists) {
                await idbPut('profile', { ...pSnap.data(), id: 'profile' });
            }
        } catch (e) {
            console.warn('syncFromCloud [profile]:', e.message);
        }
    },

    // ── PROCESS OFFLINE SYNC QUEUE ────────────────────────

    async processSyncQueue() {
        if (typeof isOffline !== 'undefined' && isOffline) return;
        if (!currentUser) return;

        const queue = await idbGetAll('syncQueue');
        if (queue.length === 0) return;

        console.log(`🔄 Processing ${queue.length} queued operation(s)…`);
        for (const op of queue) {
            BATCH_ENGINE._queue.push(op);
            await idbDelete('syncQueue', op.id).catch(() => {});
        }
        await BATCH_ENGINE.flush();
    },

    // ── MIGRATE OLD DATA (runs once) ─────────────────────

    async migrateFromLocalStorage() {
        if (localStorage.getItem('ghardb_migration_v2') === 'done') return;

        console.log('🔄 Migrating localStorage → IndexedDB…');

        const stamp = (item, prefix, i) => {
            if (!item.id) item.id = `${prefix}_legacy_${i}_${Date.now()}`;
            if (!item.createdAt) item.createdAt = Date.now();
            if (!item.updatedAt) item.updatedAt = Date.now();
            return item;
        };

        const migrate = async (lsKey, store, prefix) => {
            const arr = JSON.parse(localStorage.getItem(lsKey) || '[]');
            for (let i = 0; i < arr.length; i++) {
                await idbPut(store, stamp(arr[i], prefix, i)).catch(() => {});
            }
        };

        await migrate('familyExpenses',  'expenses',      'exp');
        await migrate('dudhRecords',     'dudh',          'dud');
        await migrate('rationItems',     'ration',        'rat');
        await migrate('investments',     'investments',   'inv');
        await migrate('loans',           'loans',         'lon');
        await migrate('subscriptions',   'subscriptions', 'sub');
        await migrate('rechargeRecords', 'recharges',     'rec');
        await migrate('savingsJars',     'savingsJars',   'jar');
        await migrate('udhars',          'udhars',        'udh');
        await migrate('giftFunds',       'giftFunds',     'gif');

        // Migrate profile from appDataCache
        const c = JSON.parse(localStorage.getItem('appDataCache') || '{}');
        await idbPut('profile', {
            id            : 'profile',
            budget        : c.budget        || 20000,
            income        : c.income        || 0,
            xp            : c.xp            || 0,
            challengeDays : c.challengeDays || 0,
            dailyStreak   : c.dailyStreak   || 0,
            lastLoginDate : c.lastLoginDate || '',
            displayName   : c.displayName   || '',
            dreamGoal     : c.dreamGoal     || { name: 'No Goal', target: 0 },
            updatedAt     : Date.now()
        }).catch(() => {});

        localStorage.setItem('ghardb_migration_v2', 'done');
        console.log('✅ Migration complete');
    },

    // ── MIGRATE OLD FIRESTORE DOC → SUB-COLLECTIONS ──────

    async migrateFirestoreDoc(uid) {
        if (localStorage.getItem('ghardb_firestore_migration_v2') === 'done') return;
        if (typeof isOffline !== 'undefined' && isOffline) return;

        try {
            const oldDoc = await db.collection('familyData').doc(uid).get();
            if (!oldDoc.exists) {
                localStorage.setItem('ghardb_firestore_migration_v2', 'done');
                return;
            }

            const d = oldDoc.data();
            const toMigrate = [
                ['expenses',      d.expenses      || []],
                ['dudh',          d.dudh          || []],
                ['ration',        d.ration        || []],
                ['investments',   d.investments   || []],
                ['loans',         d.loans         || []],
                ['subscriptions', d.subscriptions || []],
                ['recharges',     d.recharges     || []],
            ];

            const userRef = db.collection('users').doc(uid);
            for (const [col, arr] of toMigrate) {
                const batch = db.batch();
                arr.forEach((item, i) => {
                    const id  = item.id || `${col.slice(0,3)}_legacy_${i}`;
                    batch.set(userRef.collection(col).doc(id), { ...item, id });
                });
                if (arr.length) await batch.commit().catch(() => {});
            }

            // Profile
            await userRef.collection('profile').doc('profile').set({
                budget        : d.budget        || 20000,
                income        : d.income        || 0,
                xp            : d.xp            || 0,
                challengeDays : d.challengeDays || 0,
                dailyStreak   : d.dailyStreak   || 0,
                lastLoginDate : d.lastLoginDate || '',
                displayName   : d.displayName   || '',
                dreamGoal     : d.dreamGoal     || { name: 'No Goal', target: 0 }
            }, { merge: true }).catch(() => {});

            localStorage.setItem('ghardb_firestore_migration_v2', 'done');
            console.log('✅ Firestore doc migration done');
        } catch (e) {
            console.warn('Firestore migration failed (non-critical):', e.message);
        }
    },

    // ── LOAD ALL DATA INTO MEMORY ARRAYS ─────────────────

    async loadAllIntoMemory() {
        familyExpenses = await idbGetAll('expenses');
        dudhRecords    = await idbGetAll('dudh');
        rationItems    = await idbGetAll('ration');
        investments    = await idbGetAll('investments');
        activeLoans    = await idbGetAll('loans');
        activeSubs     = await idbGetAll('subscriptions');
        rechargeRecords= await idbGetAll('recharges');
        savingsJars    = await idbGetAll('savingsJars');
        udhars         = await idbGetAll('udhars');
        giftFunds      = await idbGetAll('giftFunds');

        const profile  = await idbGet('profile', 'profile');
        if (profile) {
            budgetLimit       = profile.budget        || 20000;
            monthlyIncome     = profile.income        || 0;
            userXP            = profile.xp            || 0;
            challengeDays     = profile.challengeDays || 0;
            dailyStreak       = profile.dailyStreak   || 0;
            lastLoginDate     = profile.lastLoginDate || '';
            customDisplayName = profile.displayName   || '';
            dreamGoal         = profile.dreamGoal     || { name: 'No Goal', target: 0 };
        }

        // Sort expenses newest-first (UI expects this order)
        familyExpenses.sort((a, b) =>
            (b.date || '').localeCompare(a.date || '') ||
            (b.createdAt || 0) - (a.createdAt || 0)
        );
    },

    // ── AES BACKUP / RESTORE ──────────────────────────────

    async exportEncrypted(password) {
        const backup = {
            version       : 2,
            exportedAt    : new Date().toISOString(),
            profile       : await idbGet('profile', 'profile'),
            expenses      : await idbGetAll('expenses'),
            dudh          : await idbGetAll('dudh'),
            ration        : await idbGetAll('ration'),
            investments   : await idbGetAll('investments'),
            loans         : await idbGetAll('loans'),
            subscriptions : await idbGetAll('subscriptions'),
            recharges     : await idbGetAll('recharges'),
            savingsJars   : await idbGetAll('savingsJars'),
            udhars        : await idbGetAll('udhars'),
            giftFunds     : await idbGetAll('giftFunds'),
        };

        const encrypted = await AES_ENGINE.encrypt(backup, password);
        const blob      = new Blob([encrypted], { type: 'text/plain' });
        const url       = URL.createObjectURL(blob);
        const a         = document.createElement('a');
        a.href          = url;
        a.download      = `GharManager_Backup_${new Date().toISOString().split('T')[0]}.gmb`;
        a.click();
        URL.revokeObjectURL(url);
    },

    async importEncrypted(file, password) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = await AES_ENGINE.decrypt(e.target.result.trim(), password);
                    if (!data.version || !data.expenses) {
                        return reject(new Error('Invalid or corrupted backup file'));
                    }

                    const COLS = ['expenses','dudh','ration','investments','loans',
                                  'subscriptions','recharges','savingsJars','udhars','giftFunds'];
                    for (const col of COLS) {
                        await idbClear(col);
                        for (const item of (data[col] || [])) {
                            await idbPut(col, item).catch(() => {});
                        }
                    }
                    if (data.profile) {
                        await idbPut('profile', data.profile).catch(() => {});
                    }

                    await this.loadAllIntoMemory();
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    }
};

// ============================================================
// 📄 SECTION 6 — Pagination Manager (for Expense list)
// ============================================================

const PAGINATION = {
    currentPage : 0,
    pageSize    : 20,
    hasMore     : true,
    isLoading   : false,
    filters     : {},

    /** Reset pagination (call when filters change or section opens) */
    reset(filters = {}) {
        this.currentPage = 0;
        this.hasMore     = true;
        this.isLoading   = false;
        this.filters     = filters;
    },

    /** Load next page — returns { data, total, hasMore, page } or null */
    async loadNextPage() {
        if (this.isLoading || !this.hasMore) return null;
        this.isLoading = true;
        try {
            const result = await GharDB.getExpenses({
                page    : this.currentPage,
                pageSize: this.pageSize,
                ...this.filters
            });
            this.hasMore     = result.hasMore;
            this.currentPage++;
            return result;
        } finally {
            this.isLoading = false;
        }
    }
};

// ============================================================
// 🔔 SECTION 7 — Sync Status Helper
// ============================================================

function _setSyncStatus(msg) {
    const el = document.getElementById('sync-status');
    if (!el) return;
    el.innerText = msg;
    if      (msg.includes('Synced'))  el.style.color = '#10b981';
    else if (msg.includes('Failed'))  el.style.color = '#ef4444';
    else if (msg.includes('Queued'))  el.style.color = '#f59e0b';
    else if (msg.includes('Offline')) el.style.color = '#f59e0b';
    else                              el.style.color = '#94a3b8';
    if (msg.includes('Synced')) setTimeout(() => { el.style.color = '#94a3b8'; }, 3000);
}

// ============================================================
// 🚀 SECTION 8 — Bootstrap: initGharDB()
// ============================================================

/**
 * Call once on app startup (before loadCloudData).
 * Opens IDB, runs migrations, loads data into memory.
 */
async function initGharDB() {
    try {
        await openIDB();
        await GharDB.migrateFromLocalStorage();
        await GharDB.loadAllIntoMemory();
        console.log('✅ GharDB ready');
        return true;
    } catch (e) {
        console.error('GharDB init failed — falling back to localStorage:', e);
        return false;
    }
}

// ============================================================
// 🔁 SECTION 9 — Replacement Functions for script.js
// ============================================================

/**
 * REPLACES saveToCloud() in script.js
 * Now: saves to IDB immediately + queues Firestore batch write.
 */
async function saveToCloud() {
    // 1. Persist entire in-memory arrays to IDB
    const saves = [
        ...familyExpenses .map(e => idbPut('expenses',      e)),
        ...dudhRecords    .map(e => idbPut('dudh',          e)),
        ...rationItems    .map(e => idbPut('ration',        e)),
        ...investments    .map(e => idbPut('investments',   e)),
        ...activeLoans    .map(e => idbPut('loans',         e)),
        ...activeSubs     .map(e => idbPut('subscriptions', e)),
        ...rechargeRecords.map(e => idbPut('recharges',     e)),
    ];
    await Promise.allSettled(saves);

    // 2. Save profile
    await GharDB.saveProfile({
        budget        : budgetLimit,
        income        : monthlyIncome,
        xp            : userXP,
        challengeDays : challengeDays,
        dailyStreak   : dailyStreak,
        lastLoginDate : lastLoginDate,
        displayName   : customDisplayName,
        dreamGoal     : dreamGoal,
        todoItems     : typeof todoItems !== 'undefined' ? todoItems : []
    });

    // 3. Keep localStorage appDataCache as a lightweight fallback
    localStorage.setItem('appDataCache', JSON.stringify({
        budget        : budgetLimit,
        income        : monthlyIncome,
        xp            : userXP,
        challengeDays : challengeDays,
        dailyStreak   : dailyStreak,
        lastLoginDate : lastLoginDate,
        displayName   : customDisplayName,
        dreamGoal     : dreamGoal
    }));

    if (!currentUser) return;
    if (typeof isOffline !== 'undefined' && isOffline) {
        _setSyncStatus('📴 Offline — Queued');
        return;
    }

    // 4. Queue all records for Firestore batch write
    const queue = (arr, col) =>
        arr.forEach(item =>
            BATCH_ENGINE.add({ type: 'set', collection: col, id: item.id, data: item })
        );

    queue(familyExpenses,  'expenses');
    queue(dudhRecords,     'dudh');
    queue(rationItems,     'ration');
    queue(investments,     'investments');
    queue(activeLoans,     'loans');
    queue(activeSubs,      'subscriptions');
    queue(rechargeRecords, 'recharges');
}

/**
 * REPLACES loadCloudData() in script.js
 * Now: loads from IDB first (instant), then syncs cloud in bg.
 */
function loadCloudData(uid) {
    // Immediately update UI from what's already in memory (loaded by initGharDB)
    if (typeof updateHisabUI    === 'function') updateHisabUI();
    if (typeof updateDudhUI     === 'function') updateDudhUI();
    if (typeof updateRationUI   === 'function') updateRationUI();
    if (typeof updateInvestUI   === 'function') updateInvestUI();
    if (typeof updateLoanUI     === 'function') updateLoanUI();
    if (typeof updateSubsUI     === 'function') updateSubsUI();
    if (typeof updateRechargeUI === 'function') updateRechargeUI();
    if (typeof updateGreetingName=== 'function') updateGreetingName();
    if (typeof updateChallengeUI === 'function') updateChallengeUI();
    if (typeof checkStreak       === 'function') checkStreak();
    if (typeof updateToDoUI      === 'function') updateToDoUI();
    if (typeof checkRole         === 'function') checkRole(customDisplayName || (currentUser ? currentUser.email : ''));

    // Background: migrate old Firestore doc + sync sub-collections
    if (typeof isOffline === 'undefined' || !isOffline) {
        GharDB.migrateFirestoreDoc(uid)
            .then(() => GharDB.syncFromCloud(uid))
            .then(() => GharDB.loadAllIntoMemory())
            .then(() => {
                if (typeof updateHisabUI    === 'function') updateHisabUI();
                if (typeof updateDudhUI     === 'function') updateDudhUI();
                if (typeof updateRationUI   === 'function') updateRationUI();
                if (typeof updateGreetingName === 'function') updateGreetingName();
                _setSyncStatus('☁️ Synced');
            })
            .catch(e => console.warn('Cloud sync error (non-critical):', e.message));
    }
}

/**
 * REPLACES syncOldLocalData() in script.js
 * Now: processes any pending offline queue.
 */
async function syncOldLocalData() {
    await GharDB.processSyncQueue();
}

/**
 * REPLACES backupData() in script.js
 * Now: AES-256-GCM encrypted backup with user-set password.
 */
async function backupData() {
    const result = await Swal.fire({
        title              : '🔐 Backup Password Set Karein',
        html               : `
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
                Yeh password backup file ko encrypt karega.<br>
                <strong>Ise yaad rakhein — bina iske restore nahi hoga!</strong>
            </p>
            <input id="bp1" type="password" placeholder="Password" class="swal2-input">
            <input id="bp2" type="password" placeholder="Password confirm karein" class="swal2-input">`,
        confirmButtonText  : '📥 Download Backup',
        confirmButtonColor : '#2563eb',
        showCancelButton   : true,
        background         : 'var(--paper-bg)',
        color              : 'var(--text-main)',
        preConfirm         : () => {
            const p1 = document.getElementById('bp1').value;
            const p2 = document.getElementById('bp2').value;
            if (p1.length < 6)  { Swal.showValidationMessage('Password kam se kam 6 characters ka hona chahiye'); return false; }
            if (p1 !== p2)      { Swal.showValidationMessage('Passwords match nahi ho rahe!'); return false; }
            return p1;
        }
    });

    if (!result.isConfirmed) return;

    try {
        await GharDB.exportEncrypted(result.value);
        playSound('success');
        Swal.fire({
            toast             : true,
            position          : 'top',
            icon              : 'success',
            title             : '✅ Encrypted Backup Download Ho Gayi!',
            timer             : 3000,
            showConfirmButton : false
        });
    } catch (e) {
        Swal.fire('Error', 'Backup nahi ho paayi: ' + e.message, 'error');
    }
}

/**
 * REPLACES restoreData() in script.js
 * Now: AES-256-GCM decryption with user password.
 */
async function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset file input
    event.target.value = '';

    const result = await Swal.fire({
        title              : '🔐 Restore Password Daalein',
        input              : 'password',
        inputPlaceholder   : 'Backup password',
        confirmButtonText  : '📤 Restore Karein',
        confirmButtonColor : '#10b981',
        showCancelButton   : true,
        background         : 'var(--paper-bg)',
        color              : 'var(--text-main)',
        inputValidator     : (v) => { if (!v) return 'Password daalein!'; }
    });

    if (!result.isConfirmed) return;

    try {
        await GharDB.importEncrypted(file, result.value);
        // Push everything back to Firestore
        await saveToCloud();
        await BATCH_ENGINE.flush();

        playSound('success');
        Swal.fire('✅ Restore Ho Gaya!',
            `Data wapas aa gaya hai!\n${familyExpenses.length} expenses, ` +
            `${dudhRecords.length} dudh records.`, 'success');

        // Refresh all UI
        if (typeof updateHisabUI    === 'function') updateHisabUI();
        if (typeof updateDudhUI     === 'function') updateDudhUI();
        if (typeof updateRationUI   === 'function') updateRationUI();
        if (typeof updateInvestUI   === 'function') updateInvestUI();
        if (typeof updateLoanUI     === 'function') updateLoanUI();
        if (typeof updateSubsUI     === 'function') updateSubsUI();
        if (typeof updateRechargeUI === 'function') updateRechargeUI();
        if (typeof updateGreetingName === 'function') updateGreetingName();

    } catch (e) {
        Swal.fire('❌ Error',
            e.message.includes('decrypt') || e.message.includes('operation')
                ? 'Password galat hai ya file corrupt hai!'
                : e.message,
            'error');
    }
}
