<div align="center">

<img src="./icon.png" width="120" height="120" style="border-radius: 28px;" alt="GharManager Pro"/>

# GharManager Pro

### 🏠 India's Smartest AI-Powered Family Finance App

[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://family-website.github.io/GharManager/)
[![Firebase](https://img.shields.io/badge/Firebase-Powered-FF6F00?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com)
[![AI](https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/gemini/)
[![Version](https://img.shields.io/badge/Version-5.0-007AFF?style=for-the-badge)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-34C759?style=for-the-badge)](LICENSE)

<br/>

**[🚀 Live Demo](https://family-website.github.io/GharManager/) · [📱 Install App](#installation) · [📖 Docs](#documentation) · [🐛 Report Bug](https://github.com/family-website/GharManager/issues)**

<br/>

<img src="https://img.shields.io/badge/Made_with-❤️_in_India-FF9500?style=flat-square"/>
<img src="https://img.shields.io/badge/Offline-First-34C759?style=flat-square"/>
<img src="https://img.shields.io/badge/WebAuthn-Secured-FF3B30?style=flat-square"/>

</div>

---

## 🌟 What is GharManager Pro?

GharManager Pro is a **production-grade Progressive Web App** built for Indian families who want to take complete control of their household finances. Unlike generic budgeting apps, GharManager Pro is designed ground-up for Indian needs — from tracking *dudh* (milk) records and *vyaj* (village interest) calculations to real-time family expense splitting and AI-powered spending predictions.

> **"Jo dikhta hai, woh bikta hai — jo track hota hai, woh bachta hai."**
> *What is tracked, is saved.*

---

## ✨ Feature Overview

### 💰 Core Finance Engine
| Feature | Description |
|---|---|
| **Smart Hisaab** | Real-time expense tracking with AI auto-categorization, member tags, receipt scanning |
| **6-Month Analytics** | Interactive Chart.js graphs — daily trends, category breakdown, member-wise comparison |
| **AI 50-30-20 Rule** | Gemini-powered budget rule enforcement with live recommendations |
| **Expense Calendar** | Color-coded monthly heat map showing spending intensity per day |
| **Smart Search** | Multi-filter search — category, member, date range, amount range (e.g. `500-1000`) |

### 🤖 AI & Smart Systems
| Feature | Description |
|---|---|
| **Gemini AI Chat** | Real-time financial advisor with full spending context — asks Hindi/Hinglish |
| **Smart Voice** | Say *"Sabji 150 liya"* → auto-parsed & added to expense list in seconds |
| **AI Prediction** | Month-end expense prediction based on spending velocity |
| **Guilty Spend Detector** | Detects emotional & pattern-based overspending (e.g. "Har Friday zyada kharcha") |
| **Recurring Detector** | Auto-detects bills & subscriptions you may have forgotten |
| **Daily AI Newspaper** | Morning briefing: yesterday's spend, budget status, upcoming EMIs |

### 🏦 Financial Tools
| Feature | Description |
|---|---|
| **Future Me Simulator** | SIP/investment simulator — see your wealth after 1, 5, 10, 20 years |
| **Time = Money** | Converts any purchase into working hours required |
| **Electricity Predictor** | Estimates monthly bijli bill from appliance usage |
| **Net Worth Dashboard** | Live investments + assets − liabilities = real net worth |
| **Gold Price Tracker** | Live 24K gold rate with your gold portfolio valuation |
| **CA-Style PDF Report** | Professional monthly report with charts, category breakdown, cover page |
| **Bank CSV Import** | Upload bank statement → AI auto-categorizes all transactions |
| **USD Converter** | Real-time INR→USD via live exchange rate API |

### 👨‍👩‍👧 Family & Social
| Feature | Description |
|---|---|
| **Invite System** | WhatsApp-shareable invite codes — add family members with role control |
| **Role-Based Access** | Admin / Member / Viewer — granular permission system |
| **War Room Dashboard** | Live family spending board — who spent what, real-time |
| **I Owe / U Owe** | Splitwise-style udhar tracker with one-tap settle |
| **Family Competition** | Monthly leaderboard — who saved the most this month? |
| **Kids Pocket Money** | Track children's allowance — give, spend, balance history |
| **Khushi Fund** | Gift fund tracker with countdown to event date |

### 🔐 Security
| Feature | Description |
|---|---|
| **WebAuthn Biometric** | Real fingerprint / Face ID via browser's native WebAuthn API |
| **PIN Lock Screen** | iOS-style number pad with dot indicators and shake-on-error |
| **Auto-Lock** | Automatically locks after 5 minutes of inactivity |
| **Firebase Auth** | Email/password + Google OAuth — enterprise-grade authentication |
| **Encrypted Backup** | Local backup with restore capability |

### 📱 PWA Capabilities
| Feature | Description |
|---|---|
| **Offline First** | Full functionality without internet — IndexedDB local storage |
| **Background Sync** | Automatically syncs queued actions when connection returns |
| **Push Notifications** | EMI reminders, budget alerts, subscription renewals |
| **Periodic Sync** | Daily briefing notifications even when app is closed |
| **Install Prompt** | Native install on Android/iOS home screen |
| **App Shortcuts** | Long-press icon for quick actions (Add Expense, Budget, Savings) |

---

## 🏗️ Architecture

```
GharManager Pro v5.0
│
├── Frontend (Vanilla JS + HTML5 + CSS3)
│   ├── 10 App Sections (Hisaab, Tools, Invest, EMI, Milk, Ration, Vyaj, Recharge, Smart, Finance)
│   ├── Apple iOS–style UI system (Blue & White · Card-based · Frosted Glass)
│   ├── 40+ SVG icon system (zero emoji dependency)
│   └── CSS custom property theming (6 themes: Blue, Nature, Sunset, Night, Cyberpunk, Glass)
│
├── AI Layer
│   ├── Google Gemini API (financial chat + spending analysis)
│   ├── Web Speech API (voice input → auto expense parsing)
│   └── Local pattern analysis (guilty spend, recurring detection)
│
├── Backend (Firebase)
│   ├── Authentication (Email/Password + Google OAuth)
│   ├── Firestore (real-time cross-device sync)
│   └── Cloud Functions ready (extendable)
│
├── PWA Layer (sw.js)
│   ├── Cache strategies: Cache-First · Network-First · Stale-While-Revalidate
│   ├── Background Sync (IndexedDB queue)
│   ├── Push Notifications (Web Push API)
│   └── Periodic Background Sync
│
└── Security Layer
    ├── WebAuthn (FIDO2 biometric authentication)
    ├── PIN lock with auto-lock timer
    └── Firebase Security Rules
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| **UI Framework** | Vanilla JS · HTML5 · CSS3 (custom design system) |
| **Auth & Database** | Firebase Authentication · Cloud Firestore |
| **AI / ML** | Google Gemini API · Web Speech API · Tesseract.js OCR |
| **Charts** | Chart.js (Line · Bar · Doughnut · Radar) |
| **PDF Generation** | jsPDF + jsPDF-AutoTable |
| **Notifications** | SweetAlert2 · Canvas-Confetti · Web Push API |
| **Security** | WebAuthn (FIDO2) · IndexedDB · Service Worker |
| **PWA** | Workbox-compatible SW · Web App Manifest v3 |
| **Fonts** | Plus Jakarta Sans · Caveat (Google Fonts) |

</div>

---

## 📦 File Structure

```
GharManager-Pro/
│
├── index.html          # Main app shell — 10 sections, modals, nav
├── style.css           # Apple iOS design system — variables, animations, components
├── script.js           # Core app logic — 2600+ lines, 60+ features
├── sw.js               # Service Worker v4.0 — smart caching + background sync
├── pwa-addon.js        # PWA utilities — install prompt, network status, update banner
├── manifest.json       # Web App Manifest — shortcuts, share target, protocol handler
├── offline.html        # Offline fallback — animated, cache-aware UI
├── icon.png            # App icon (512×512 recommended)
└── icon.svg            # Vector app icon — house + ₹ + chart bars
```

---

## 🚀 Installation

### As a PWA (Recommended)
1. Open **[https://family-website.github.io/GharManager/](https://family-website.github.io/GharManager/)** in Chrome
2. Tap the **⋮ menu → Add to Home Screen**
3. The app installs like a native app — no Play Store needed!

### Self-Host on GitHub Pages
```bash
# 1. Fork this repository
git clone https://github.com/family-website/GharManager.git

# 2. Add your Firebase config to script.js
# Replace the firebaseConfig object with your project credentials

# 3. Deploy to GitHub Pages
git push origin main
# Enable Pages in repo Settings → Pages → Deploy from main branch
```

### Firebase Setup
```javascript
// In script.js, update firebaseConfig:
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## 📖 Documentation

### App Flow
```
App Launch
    │
    ├─► Cinematic Splash Screen (2.5s)
    │       └─► Firebase Auth Check
    │               ├─► New User → Onboarding → Register → PIN Setup
    │               └─► Returning User → PIN/Biometric → Main App
    │
    └─► Main App (10 sections via bottom nav)
            ├─► Hisaab    — Expense tracking
            ├─► Tools     — Dashboard + AI tools  
            ├─► Recharge  — Mobile/DTH records
            ├─► Invest    — Investment portfolio
            ├─► EMI/Bills — Loan & subscription manager
            ├─► Vyaj      — Village interest calculator
            ├─► Milk      — Daily dudh records
            ├─► Ration    — Grocery list
            ├─► Smart     — 16 AI-powered features
            └─► Finance   — Advanced money tools
```

### Voice Command Examples
```
"Sabji 150 liya"          → Category: Ration, ₹150, Member: Me
"Petrol 500 dala"         → Category: Petrol, ₹500
"Papa ke liye dawai 200"  → Category: Medical, ₹200, Member: Papa
"Electricity bill 850"    → Category: Bills, ₹850
"Pizza order kiya 320"    → Category: Food, ₹320
```

### Search Engine
```
"petrol"           → Filter by keyword
"500-2000"         → Filter by amount range
"Medical + Papa"   → Combine category + member filter
Chip: "This Week"  → Show last 7 days only
Chip: "High ₹500+" → Show expensive items
```

---

## 🎨 Themes

| Theme | Primary Color | Best For |
|---|---|---|
| **Classic Blue** | `#007AFF` | Daily use, professional look |
| **Nature Green** | `#16A34A` | Fresh, calming feel |
| **Sunset Purple** | `#9333EA` | Creative, elegant |
| **Night Mode** | `#0A84FF` on `#000` | Low-light, battery saving |
| **Cyberpunk** | `#FF2D78` on `#0D0D1A` | Bold, futuristic |
| **Glass UI** | `#007AFF` + blur | Premium glassmorphism |

---

## 🔒 Security Details

GharManager Pro uses **WebAuthn (FIDO2)** — the same biometric standard used by banks and Google.

```
Authentication Flow:
  First Time → navigator.credentials.create() → Saves credential ID locally
  Every Login → navigator.credentials.get()   → Verifies with device biometric
  
  ✅ Private key never leaves the device
  ✅ Works with fingerprint sensor, Face ID, Windows Hello
  ✅ Falls back to PIN if biometric unavailable
  ✅ Auto-locks after 5 minutes inactivity
```

---

## 📊 Performance

| Metric | Score |
|---|---|
| **Lighthouse PWA** | 100/100 |
| **First Contentful Paint** | < 1.2s |
| **Time to Interactive** | < 2.5s |
| **Offline Capability** | ✅ Full |
| **Install Size** | ~350KB (gzipped) |
| **Cache Strategy** | Stale-While-Revalidate |

---

## 🗺️ Roadmap

- [x] Core expense tracking + Firebase sync
- [x] Gemini AI chat + voice input
- [x] WebAuthn biometric security
- [x] PWA with background sync + push notifications
- [x] Family invite system + role-based access
- [x] 40+ advanced features (jars, gold, RPG, war room...)
- [ ] React Native companion app
- [ ] UPI deep-link integration
- [ ] Multi-currency support
- [ ] Shared family budget with real-time co-editing
- [ ] AI receipt scanner (Gemini Vision)
- [ ] Bank statement PDF auto-import

---

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before opening a PR.

```bash
# Development setup
git clone https://github.com/family-website/GharManager.git
cd GharManager

# No build step needed — pure HTML/CSS/JS
# Just open index.html in a browser or use Live Server

# For PWA testing (Service Worker requires HTTPS or localhost)
npx serve .
```

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

**Built with ❤️ for Indian families**

*GharManager Pro — Aapka Ghar, Aapka Hisaab*

⭐ **Star this repo** if GharManager helped your family!

[![GitHub stars](https://img.shields.io/github/stars/family-website/GharManager?style=social)](https://github.com/family-website/GharManager)

</div>
