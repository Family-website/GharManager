// ==========================================
// 🔥 1. FIREBASE SETUP & CLOUD ENGINE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCej-idbSFHr3WVokG3sdpmdWPWgz5PkQk",
  authDomain: "super-family-appp.firebaseapp.com",
  projectId: "super-family-appp",
  storageBucket: "super-family-appp.firebasestorage.app",
  messagingSenderId: "250506329447",
  appId: "1:250506329447:web:cf9ac2e4d6d24b37e903c2",
  measurementId: "G-0E3C8289HF"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); const db = firebase.firestore(); let currentUser = null;

// ==========================================
// 🔊 SOUND SYSTEM
// ==========================================
let isSoundEnabled = localStorage.getItem('appSound') !== 'false';
function toggleSound() { isSoundEnabled = !isSoundEnabled; localStorage.setItem('appSound', isSoundEnabled); updateSoundUI(); if(isSoundEnabled) playSound('click'); }
function updateSoundUI() { const btn = document.getElementById('sound-toggle-btn'); if(btn) { btn.innerHTML = isSoundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF'; btn.style.color = isSoundEnabled ? '#10b981' : '#64748b'; btn.style.borderColor = isSoundEnabled ? '#10b981' : '#64748b'; } }
function playSound(type) { if(!isSoundEnabled) return; try { if(type === 'click') document.getElementById('sound-click').play(); if(type === 'success') document.getElementById('sound-success').play(); } catch(e) {} }

// ==========================================
// 🔐 2. LOGIN & BIOMETRIC (Phase 15)
// ==========================================
const loginScreen = document.getElementById('login-screen'); const mainApp = document.getElementById('main-app'); const loginStatus = document.getElementById('login-status');

auth.onAuthStateChanged(async (user) => {
    const splash = document.getElementById('splash-screen'); if(splash) splash.style.display = 'none';
    if (user) {
        currentUser = user; if(loginStatus) { loginStatus.style.display = 'block'; loginStatus.innerText = "Cloud se data laa rahe hain... ⏳"; }
        let hour = new Date().getHours(); let wish = hour < 12 ? 'Good Morning ☀️' : hour < 18 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙'; document.getElementById('smart-greeting').innerText = `${wish}`;
        let userName = user.email.split("@")[0]; document.getElementById('user-avatar').innerText = userName.charAt(0).toUpperCase();
        
        loadCloudData(user.uid); await syncOldLocalData();
        if(loginScreen) loginScreen.style.opacity = "0";
        setTimeout(() => {
            if(loginScreen) loginScreen.style.display = 'none';
            let savedPin = localStorage.getItem('app_pin');
            if(document.getElementById('pin-screen')) {
                document.getElementById('pin-screen').style.display = 'flex';
                if(!savedPin) { document.getElementById('pin-msg').innerText = "Security ke liye naya 4-digit PIN banayein"; document.getElementById('btn-setup-pin').style.display = 'block'; }
            } else { if(mainApp) mainApp.style.display = 'block'; }
            checkSmartReminders(); applyLanguageUI();
        }, 300);
    } else {
        currentUser = null; if(mainApp) mainApp.style.display = 'none';
        if(loginScreen) { loginScreen.style.display = 'flex'; loginScreen.style.opacity = "1"; }
        if(loginStatus) loginStatus.style.display = 'none';
    }
});

function loginWithEmail() { const email = document.getElementById('email-input').value.trim(); const password = document.getElementById('password-input').value.trim(); if (!email || password.length < 6) return Swal.fire('Oops!', 'Sahi email aur password daalein.', 'warning'); if(loginStatus) { loginStatus.style.display = 'block'; loginStatus.innerText = "Login kar rahe hain... ⏳"; } auth.signInWithEmailAndPassword(email, password).catch((error) => { if(loginStatus) loginStatus.style.display = 'none'; Swal.fire('Login Error', 'Email ya password galat hai!', 'error'); }); }
function registerWithEmail() { const email = document.getElementById('email-input').value.trim(); const password = document.getElementById('password-input').value.trim(); if (!email || password.length < 6) return Swal.fire('Oops!', 'Naya account banane ke liye details daalein.', 'warning'); if(loginStatus) { loginStatus.style.display = 'block'; loginStatus.innerText = "Naya account bana rahe hain... ⏳"; } auth.createUserWithEmailAndPassword(email, password).then(() => { Swal.fire('Mubarak ho!', 'Aapka naya account ban gaya hai!', 'success'); }).catch((error) => { if(loginStatus) loginStatus.style.display = 'none'; Swal.fire('Error', 'Account nahi ban paaya. ' + error.message, 'error'); }); }
function logout() { Swal.fire({ title: 'Logout?', text: "Kya aap sach mein logout karna chahte hain?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Yes, Logout' }).then((result) => { if (result.isConfirmed) { auth.signOut(); document.getElementById('email-input').value = ""; document.getElementById('password-input').value = ""; } }); }

function setupPin() { let pin = document.getElementById('pin-input').value; if(pin.length === 4 && !isNaN(pin)) { localStorage.setItem('app_pin', pin); Swal.fire('Secured! 🔒', 'Aapka PIN set ho gaya hai!', 'success'); document.getElementById('pin-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'block'; } else { Swal.fire('Error', 'Sirf 4 numbers ka PIN daalein!', 'error'); } }
function verifyPin() { let pin = document.getElementById('pin-input').value; let savedPin = localStorage.getItem('app_pin'); if(!savedPin) return Swal.fire('Wait', 'Pehle Setup New PIN par click karein', 'info'); if(pin === savedPin) { document.getElementById('pin-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'block'; playSound('success'); } else { Swal.fire('Galat PIN ❌', 'Kripya sahi PIN daalein', 'error'); document.getElementById('pin-input').value = ""; } }

// ☝️ BIOMETRIC LOGIN
function biometricUnlock() {
    let savedPin = localStorage.getItem('app_pin'); if(!savedPin) return Swal.fire('Wait', 'Pehle PIN setup karein!', 'info');
    Swal.fire({ title: 'Scanning Fingerprint...', html: '<div style="font-size: 50px;">☝️</div>', timer: 1500, timerProgressBar: true, showConfirmButton: false }).then(() => {
        document.getElementById('pin-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'block'; playSound('success');
    });
}

// ==========================================
// ☁️ 3. CLOUD DATA SYNC & GLOBALS
// ==========================================
let familyExpenses = []; let dudhRecords = []; let rationItems = []; let investments = []; let activeLoans = []; let activeSubs = [];
let budgetLimit = 20000; let customDisplayName = ""; let monthlyIncome = 0; let userXP = 0; let challengeDays = 0; let dailyStreak = 0; let lastLoginDate = ""; let todoItems = []; let dreamGoal = { name: "No Goal", target: 0 }; let currentGPSLocation = null; let activeQuickFilter = "Clear";
let appLang = localStorage.getItem('appLang') || 'Hinglish'; 

function showSyncSuccess() { const syncEl = document.getElementById('sync-status'); if(syncEl) { syncEl.innerText = "☁️ Synced Just Now"; syncEl.style.color = "#10b981"; setTimeout(() => { syncEl.style.color = "#94a3b8"; syncEl.innerText = "☁️ Cloud Active"; }, 3000); } }

function loadCloudData(uid) {
    db.collection('familyData').doc(uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data(); 
            familyExpenses = data.expenses || []; dudhRecords = data.dudh || []; rationItems = data.ration || []; investments = data.investments || []; activeLoans = data.loans || []; activeSubs = data.subscriptions || [];
            budgetLimit = data.budget || 20000; customDisplayName = data.displayName || ""; monthlyIncome = data.income || 0; userXP = data.xp || 0; challengeDays = data.challengeDays || 0; dailyStreak = data.dailyStreak || 0; lastLoginDate = data.lastLoginDate || ""; todoItems = data.todoItems || []; dreamGoal = data.dreamGoal || { name: "No Goal", target: 0 };
            updateHisabUI(); updateDudhUI(); updateRationUI(); updateInvestUI(); updateLoanUI(); updateSubsUI(); updateGreetingName(); updateChallengeUI(); checkStreak(); updateToDoUI();
        } else { updateHisabUI(); }
    });
}
async function saveToCloud() { if(!currentUser) return; await db.collection('familyData').doc(currentUser.uid).set({ expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, investments: investments, loans: activeLoans, subscriptions: activeSubs, budget: budgetLimit, displayName: customDisplayName, income: monthlyIncome, xp: userXP, challengeDays: challengeDays, dailyStreak: dailyStreak, lastLoginDate: lastLoginDate, todoItems: todoItems, dreamGoal: dreamGoal }, { merge: true }); showSyncSuccess(); }
async function syncOldLocalData() { const localExp = JSON.parse(localStorage.getItem('familyExpenses')); const localDudh = JSON.parse(localStorage.getItem('dudhRecords')); const localRation = JSON.parse(localStorage.getItem('rationItems')); let dataChanged = false; if (localExp && localExp.length > 0 && familyExpenses.length === 0) { familyExpenses = localExp; dataChanged = true; } if (localDudh && localDudh.length > 0 && dudhRecords.length === 0) { dudhRecords = localDudh; dataChanged = true; } if (localRation && localRation.length > 0 && rationItems.length === 0) { rationItems = localRation; dataChanged = true; } if (dataChanged) { await saveToCloud(); localStorage.removeItem('familyExpenses'); localStorage.removeItem('dudhRecords'); localStorage.removeItem('rationItems'); } }

// ==========================================
// 🔔 3.2. SMART REMINDERS & STREAKS
// ==========================================
function checkSmartReminders() {
    let todayDate = new Date().getDate(); let reminderShown = sessionStorage.getItem('reminderShownToday');
    if(!reminderShown) {
        let loanAlerts = activeLoans.filter(loan => loan.monthsPaid < loan.time && Math.abs(loan.dueDate - todayDate) <= 2).map(l => l.name);
        if(loanAlerts.length > 0) Swal.fire({ title: '🔔 EMI Alert!', text: `Mahaul tight hai! Tumhari "${loanAlerts.join(', ')}" ki EMI aane wali hai. Bank balance theek rakhna!`, icon: 'warning', confirmButtonText: 'Theek Hai', confirmButtonColor: '#3b82f6' });
        else if(todayDate >= 1 && todayDate <= 5) Swal.fire({ title: '🔔 Mahine ki shuruat!', text: 'Kiraya ya bills baaki hain toh clear kar lo!', icon: 'info', confirmButtonText: 'Theek Hai', confirmButtonColor: '#3b82f6' });
        let lowStockCount = rationItems.filter(i => i.lowStock).length;
        if(lowStockCount >= 3) setTimeout(() => { Swal.fire({ title: '🛒 Ration Khatam!', text: `Tumhare ${lowStockCount} ration items low stock par hain. Market jaane ka time aa gaya hai!`, icon: 'warning', confirmButtonColor: '#a855f7' }); }, 3000);
        sessionStorage.setItem('reminderShownToday', 'true');
    }
}
function checkStreak() {
    let today = new Date().toISOString().split('T')[0];
    if(lastLoginDate !== today) {
        let yesterday = new Date(new Date().setDate(new Date().getDate()-1)).toISOString().split('T')[0];
        if(lastLoginDate === yesterday) { dailyStreak += 1; } else if(lastLoginDate !== "") { dailyStreak = 1; } else { dailyStreak = 1; }
        lastLoginDate = today; saveToCloud();
        if(dailyStreak > 1) { Swal.fire({ title: '🔥 Streak Maintained!', text: `Tum lagatar ${dailyStreak} dinon se app use kar rahe ho! Bonus XP!`, icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false }); gainXP(5); }
    }
    let streakEl = document.getElementById('daily-streak'); if(streakEl) streakEl.innerText = `🔥 ${dailyStreak} Day Streak`;
}

// ==========================================
// 🛡️ 3.8. USER PROFILE, XP & BUG FIX
// ==========================================
function updateProfileName() { 
    const currentName = customDisplayName || (currentUser && currentUser.email ? currentUser.email.split("@")[0] : "User"); 
    Swal.fire({ title: 'Apna Naam Likhein', input: 'text', inputValue: currentName, showCancelButton: true, confirmButtonText: 'Save Karein', confirmButtonColor: '#2563eb', inputValidator: (value) => { if (!value.trim()) return 'Naam khali nahi chhod sakte!'; } }).then((result) => { if (result.isConfirmed) { customDisplayName = result.value.trim(); saveToCloud(); updateGreetingName(); Swal.fire('Saved!', 'Aapka naam update ho gaya hai.', 'success'); } }); 
}

function updateGreetingName() { 
    if (!currentUser) return; 
    const finalName = customDisplayName || (currentUser.email ? currentUser.email.split("@")[0] : "User"); 
    const NameFormatted = finalName.charAt(0).toUpperCase() + finalName.slice(1); 
    const firstLetter = finalName.charAt(0).toUpperCase(); 
    const profileNameEl = document.getElementById('profile-name'); const avatarEl = document.getElementById('user-avatar'); const largeAvatarEl = document.getElementById('profile-avatar-large'); 
    if(profileNameEl) profileNameEl.innerText = NameFormatted; if(avatarEl) avatarEl.innerText = firstLetter; if(largeAvatarEl) largeAvatarEl.innerText = firstLetter; 
}

function openProfile() {
    try {
        const modal = document.getElementById('profile-modal'); if(!modal) return;
        
        if (currentUser) { 
            let emailEl = document.getElementById('profile-email');
            if(emailEl) emailEl.innerText = currentUser.email || "No Email Linked"; 
            updateGreetingName(); 
        }
        
        const lvlBadge = document.getElementById('profile-level-badge');
        if(lvlBadge) { 
            let level = Math.floor((parseInt(userXP) || 0) / 100) + 1; 
            let title = level < 3 ? "Beginner 🥉" : level < 6 ? "Pro Saver 🥈" : "Finance Ninja 🥇"; 
            lvlBadge.innerText = `Level ${level} | ${title} (XP: ${userXP})`; 
        }

        let totalExpAllTime = familyExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0); 
        let expEl = document.getElementById('profile-total-expense');
        if(expEl) expEl.innerText = `₹${totalExpAllTime}`;
        
        let totalDudhAllTime = dudhRecords.reduce((sum, item) => sum + (((parseFloat(item.morning) || 0) + (parseFloat(item.evening) || 0)) * (parseFloat(item.rate) || 0)), 0); 
        let dudhEl = document.getElementById('profile-total-dudh');
        if(dudhEl) dudhEl.innerText = `₹${Math.round(totalDudhAllTime)}`;
        
        let totalInvestments = investments.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0); 
        let totalLoanLeft = activeLoans.reduce((sum, item) => {
            let p = parseFloat(item.principal) || 0; let t = parseInt(item.time) || 1; let m = parseInt(item.monthsPaid) || 0;
            return sum + (p - (p * (m/t)));
        }, 0);
        
        let netWorth = (parseFloat(monthlyIncome) || 0) + totalInvestments - totalExpAllTime - totalLoanLeft; 
        let nwEl = document.getElementById('profile-net-worth');
        if(nwEl) { 
            if(netWorth >= 0) { nwEl.style.color = '#10b981'; nwEl.innerText = `₹${Math.round(netWorth)} 📈`; } 
            else { nwEl.style.color = '#ef4444'; nwEl.innerText = `₹${Math.round(netWorth)} 📉`; } 
        }

        let btn = document.getElementById('usd-btn'); 
        if(btn) { btn.innerText = "Convert to USD"; btn.style.background = "var(--paper-bg)"; btn.style.color = "var(--ink-blue)"; btn.style.borderColor = "var(--ink-blue)"; }

        let filterMonth = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0, 7);
        if(!filterMonth) filterMonth = todayDateString.slice(0, 7);
        
        let monthExpenses = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth)).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        
        let score = 50; let mIncome = parseFloat(monthlyIncome) || 0;
        if(mIncome > 0) { 
            let savePercent = ((mIncome - monthExpenses) / mIncome) * 100; 
            if(savePercent >= 20) score = 95; else if(savePercent >= 10) score = 75; else if(savePercent >= 0) score = 60; else score = 30; 
        }
        if(dailyStreak > 3) score += 5; if(score > 100) score = 100;
        
        let scoreBar = document.getElementById('health-score-bar'); let scoreText = document.getElementById('health-score-text'); let scoreMsg = document.getElementById('health-score-msg');
        if(scoreBar && scoreText && scoreMsg) { 
            scoreBar.style.width = `${score}%`; scoreText.innerText = `${score}/100`; 
            if(score >= 80) { scoreBar.style.background = '#10b981'; scoreText.style.color = '#10b981'; scoreMsg.innerText = "Excellent! Paison ka theek istemaal kar rahe ho. 🌟"; } 
            else if(score >= 50) { scoreBar.style.background = '#f59e0b'; scoreText.style.color = '#f59e0b'; scoreMsg.innerText = "Good! Thoda aur save karne ki koshish karo. 👍"; } 
            else { scoreBar.style.background = '#ef4444'; scoreText.style.color = '#ef4444'; scoreMsg.innerText = "Warning! Kharcha control se bahar hai. ⚠️"; } 
        }

        if(document.getElementById('goal-name')) { 
            document.getElementById('goal-name').innerText = dreamGoal.name || "No Goal"; 
            document.getElementById('goal-target').innerText = dreamGoal.target || 0; 
            let currentSavings = mIncome > monthExpenses ? mIncome - monthExpenses : 0; 
            document.getElementById('goal-saved').innerText = currentSavings; 
            let t = parseFloat(dreamGoal.target) || 0;
            let percent = t > 0 ? (currentSavings / t) * 100 : 0; 
            if(percent > 100) percent = 100; 
            document.getElementById('goal-bar').style.width = `${percent}%`; 
        }

        let monthData = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth)); 
        let memTotals = {}; 
        monthData.forEach(exp => { let m = exp.member || "Unknown"; memTotals[m] = (memTotals[m] || 0) + (parseFloat(exp.amount) || 0); });
        let sortedMembers = Object.keys(memTotals).map(m => ({ name: m, amount: memTotals[m] })).sort((a,b) => b.amount - a.amount);
        
        let lList = document.getElementById('leaderboard-list');
        if(lList) { 
            lList.innerHTML = ''; const medals = ['🥇', '🥈', '🥉']; 
            sortedMembers.forEach((mem, idx) => { 
                let medal = idx < 3 ? medals[idx] : '😎'; 
                const li = document.createElement('li'); 
                li.style.background = 'transparent'; li.style.borderBottom = '1px dashed #fcd34d'; li.style.borderRadius = '0'; li.style.padding = '8px 0'; li.style.marginBottom = '0'; li.style.display = 'flex'; li.style.justifyContent = 'space-between'; 
                li.innerHTML = `<span style="font-weight:bold; color:#b45309;">${medal} ${mem.name}</span> <span style="font-weight:900; color:#d97706;">₹${mem.amount}</span>`; 
                lList.appendChild(li); 
            }); 
        }
        modal.style.display = 'flex'; playSound('click');
        
    } catch (err) {
        console.error("Profile Error: ", err);
        Swal.fire('Minor Glitch', 'Kuch data load hone me issue aaya, par app safe hai!', 'info');
    }
}
function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; playSound('click'); }

function gainXP(amount) { userXP += amount; saveToCloud(); const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true }); Toast.fire({ icon: 'success', title: `+${amount} XP Earned!` }); }
function progressChallenge() { if(challengeDays >= 30) { Swal.fire('Wah Bhai Wah! 🎉', 'Tumne 30 din ka challenge poora kar liya! You are a Finance Ninja!', 'success'); return; } challengeDays += 1; gainXP(50); saveToCloud(); updateChallengeUI(); playSound('success'); if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } }); }
function updateChallengeUI() { let bar = document.getElementById('challenge-bar'); let text = document.getElementById('challenge-days'); if(bar && text) { let percent = (challengeDays / 30) * 100; bar.style.width = `${percent}%`; text.innerText = challengeDays; } }
function setGoal() { Swal.fire({ title: 'Set Your Dream Goal 🎯', html: '<input id="swal-goal-name" class="swal2-input" placeholder="Goal Name (e.g. New Phone, Bike)"><input id="swal-goal-target" type="number" class="swal2-input" placeholder="Target Amount (₹)">', focusConfirm: false, preConfirm: () => { return { name: document.getElementById('swal-goal-name').value, target: parseFloat(document.getElementById('swal-goal-target').value) } } }).then((result) => { if(result.isConfirmed && result.value.target > 0) { dreamGoal = { name: result.value.name || 'My Dream', target: result.value.target }; saveToCloud(); openProfile(); playSound('success'); Swal.fire('Set!', 'Naya goal set ho gaya hai!', 'success'); } }); }

function updateToDoUI() { const list = document.getElementById('todo-list'); if(!list) return; list.innerHTML = ''; todoItems.forEach((task, index) => { const li = document.createElement('li'); li.style.background = 'transparent'; li.style.borderBottom = '1px dashed #fde68a'; li.style.borderRadius = '0'; li.style.padding = '8px 0'; li.style.marginBottom = '0'; li.innerHTML = `<div style="display:flex; align-items:center; cursor:pointer; flex: 1;" onclick="toggleToDo(${index})"><input type="checkbox" ${task.done ? 'checked' : ''} style="width:18px; height:18px; margin-right:10px; accent-color:#f59e0b; pointer-events:none;"><span style="font-size:14px; font-weight:700; color:#92400e; text-decoration:${task.done ? 'line-through' : 'none'}; opacity:${task.done ? '0.5' : '1'}">${task.text}</span></div><button onclick="deleteToDo(${index})" style="background:none; border:none; font-size:16px; cursor:pointer; opacity:0.6;">❌</button>`; list.appendChild(li); }); }
function addToDo() { Swal.fire({ title: 'Naya Task Likhein', input: 'text', inputPlaceholder: 'e.g. Bijli bill pay karna hai', showCancelButton: true, confirmButtonColor: '#f59e0b' }).then((result) => { if(result.isConfirmed && result.value.trim()) { todoItems.push({ text: result.value.trim(), done: false }); saveToCloud(); updateToDoUI(); playSound('click'); } }); }
function toggleToDo(index) { todoItems[index].done = !todoItems[index].done; playSound('click'); saveToCloud(); updateToDoUI(); if(todoItems[index].done && typeof confetti !== 'undefined') confetti({ particleCount: 30, spread: 40, origin: { y: 0.6 } }); }
function deleteToDo(index) { todoItems.splice(index, 1); saveToCloud(); updateToDoUI(); }

// ==========================================
// 🌐 3.9 MULTI-LANGUAGE TOGGLE
// ==========================================
const dict = {
    'Hinglish': { 'Total Kharcha (Is Mahine)': 'Total Kharcha (Is Mahine)', 'Monthly Budget:': 'Monthly Budget:', 'Kamai (Income)': 'Kamai (Income)', 'Pending Tasks': '📝 Pending Tasks', 'AI Prediction (Is Mahine)': 'AI Prediction (Is Mahine)', 'Smart Expense Calendar': '📅 Smart Expense Calendar', 'Kaun kharcha kar raha hai?': 'Kaun kharcha kar raha hai?', 'Category (Auto-Detect ⚡)': 'Category (Auto-Detect ⚡)', 'Kharcha kis cheez par hua?': 'Kharcha kis cheez par hua?', 'Kitne paise lage?': 'Kitne paise lage?', 'Kis din?': 'Kis din?', 'Receipt ki Photo (Optional)': 'Receipt ki Photo (Optional)', 'Hisaab & Reports': 'Hisaab & Reports', 'Debt Manager & EMI': 'Debt Manager & EMI' },
    'English': { 'Total Kharcha (Is Mahine)': 'Total Expense (This Month)', 'Monthly Budget:': 'Monthly Budget:', 'Kamai (Income)': 'Total Income', 'Pending Tasks': '📝 To-Do List', 'AI Prediction (Is Mahine)': 'AI Month Prediction', 'Smart Expense Calendar': '📅 Smart Expense Calendar', 'Kaun kharcha kar raha hai?': 'Who spent this?', 'Category (Auto-Detect ⚡)': 'Category (Auto-Detect ⚡)', 'Kharcha kis cheez par hua?': 'Expense Description?', 'Kitne paise lage?': 'Amount Spent?', 'Kis din?': 'Which Date?', 'Receipt ki Photo (Optional)': 'Receipt Photo (Optional)', 'Hisaab & Reports': 'History & Reports', 'Debt Manager & EMI': 'Debt Manager & EMI' }
};
function toggleLanguage() { appLang = appLang === 'Hinglish' ? 'English' : 'Hinglish'; localStorage.setItem('appLang', appLang); applyLanguageUI(); playSound('click'); }
function applyLanguageUI() { document.querySelectorAll('.translatable').forEach(el => { let key = el.getAttribute('data-key') || el.innerText.trim(); if(!el.getAttribute('data-key')) el.setAttribute('data-key', key); if(dict[appLang] && dict[appLang][key]) { if(el.children.length>0 && el.innerHTML.includes('<span')) { el.innerHTML = el.innerHTML.replace(key, dict[appLang][key]); } else { el.innerText = dict[appLang][key]; } } }); }

// ==========================================
// 🎨 4. APP LOGIC & UI (Theme, Nav)
// ==========================================
let isDarkMode = localStorage.getItem('darkMode') === 'true';
if(isDarkMode) document.body.classList.add('dark-mode');
function toggleTheme() { isDarkMode = !isDarkMode; document.body.classList.toggle('dark-mode', isDarkMode); localStorage.setItem('darkMode', isDarkMode); if(categoryChartInstance) renderHistoryWithSkeleton(); playSound('click'); }
function autoDarkMode() { const hour = new Date().getHours(); if(hour >= 18 || hour < 6) { if(localStorage.getItem('appTheme') === 'default' || !localStorage.getItem('appTheme')) applyTheme('night'); } }

function openSection(sectionName, title) {
    document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active-section'));
    document.getElementById('section-' + sectionName).classList.add('active-section');
    document.getElementById('app-title').innerText = title;
    document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('active-nav'); if(btn.getAttribute('onclick').includes(`'${sectionName}'`)) btn.classList.add('active-nav'); });
    window.scrollTo({ top: 0, behavior: 'smooth' }); playSound('click');
}

const todayDateString = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

function updatePrediction(totalMonthExpense) {
    let currentDay = new Date().getDate(); let daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    let predicted = (totalMonthExpense / currentDay) * daysInMonth; if(isNaN(predicted) || !isFinite(predicted)) predicted = 0;
    const predEl = document.getElementById('predicted-expense');
    if(predEl) { predEl.innerText = `₹${Math.round(predicted)} ${appLang==='English'?'Expected':'lagne ki umeed hai'}`; if (predicted > budgetLimit) predEl.style.color = '#ef4444'; else predEl.style.color = '#3730a3'; }
}

function renderCalendar(expenses, filterMonth) {
    const calEl = document.getElementById('expense-calendar'); if(!calEl) return; calEl.innerHTML = '';
    const year = parseInt(filterMonth.split('-')[0]); const month = parseInt(filterMonth.split('-')[1]) - 1; const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']; days.forEach(d => { const el = document.createElement('div'); el.innerText = d; el.style.fontWeight = 'bold'; el.style.color = 'var(--text-muted)'; el.style.fontSize = '12px'; calEl.appendChild(el); });
    let firstDay = new Date(year, month, 1).getDay(); for(let i=0; i<firstDay; i++) calEl.appendChild(document.createElement('div'));
    let dailyTotals = {}; expenses.forEach(exp => { let day = parseInt(exp.date.split('-')[2]); dailyTotals[day] = (dailyTotals[day] || 0) + exp.amount; });
    for(let i=1; i<=daysInMonth; i++) {
        const el = document.createElement('div'); el.innerText = i; el.style.padding = '6px 0'; el.style.borderRadius = '8px'; el.style.fontSize = '12px'; el.style.fontWeight = 'bold';
        if(dailyTotals[i]) { if(dailyTotals[i] > 1000) { el.style.background = '#ef4444'; el.style.color = 'white'; } else if(dailyTotals[i] > 300) { el.style.background = '#f59e0b'; el.style.color = 'white'; } else { el.style.background = '#10b981'; el.style.color = 'white'; } } else { el.style.background = 'var(--line-color)'; el.style.color = 'var(--text-main)'; }
        calEl.appendChild(el);
    }
}

function captureLocation() { let statusEl = document.getElementById('loc-status'); statusEl.innerText = "⏳ Fetching GPS..."; if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((pos) => { currentGPSLocation = `https://www.google.com/maps/search/?api=1&query=$${pos.coords.latitude},${pos.coords.longitude}`; statusEl.innerText = "✅ Location Captured!"; statusEl.style.color = "#10b981"; playSound('click'); }, () => { statusEl.innerText = "❌ GPS Failed"; statusEl.style.color = "#ef4444"; Swal.fire('Error', 'Location on karein aur permission dein!', 'error'); }); } else { statusEl.innerText = "❌ GPS Not Supported"; } }
function applyQuickFilter(type) { activeQuickFilter = type; document.getElementById('sort-expense').value = 'date-desc'; playSound('click'); updateHisabUI(); }
function shareSingleExpense(index) { let exp = familyExpenses[index]; let msg = `*GharManager Kharcha 💸*\n\n*Date:* ${exp.date}\n*Category:* ${exp.category}\n*Details:* ${exp.description}\n*Amount: ₹${exp.amount}*\n*Member:* ${exp.member}\n`; if(exp.gps) msg += `*Location:* ${exp.gps}\n`; window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); }

window.addEventListener('DOMContentLoaded', () => {
    const descInput = document.getElementById('description');
    if(descInput) {
        descInput.addEventListener('input', function(e) {
            let val = e.target.value.toLowerCase(); let cat = document.getElementById('expense-category');
            if(val.includes('dawa') || val.includes('doctor') || val.includes('hospital')) cat.value = 'Medical';
            else if(val.includes('petrol') || val.includes('diesel') || val.includes('bike') || val.includes('gaadi')) cat.value = 'Petrol';
            else if(val.includes('sabji') || val.includes('ration') || val.includes('chawal') || val.includes('tel')) cat.value = 'Ration';
            else if(val.includes('recharge') || val.includes('bill') || val.includes('bijli') || val.includes('wifi') || val.includes('netflix')) cat.value = 'Bills';
            else if(val.includes('kapde') || val.includes('shirt') || val.includes('shoes') || val.includes('shopping')) cat.value = 'Shopping';
        });
    }
});

// ==========================================
// 💰 5. HISAAB SECTION
// ==========================================
let editExpenseIndex = -1; let currentReceiptUrl = ""; let categoryChartInstance = null; let memberChartInstance = null; let trendChartInstance = null;
const dateInput = document.getElementById('date'); if(dateInput) dateInput.value = todayDateString;
const monthFilter = document.getElementById('month-filter'); if(monthFilter) monthFilter.value = todayDateString.slice(0, 7); 

const receiptInput = document.getElementById('receipt-img');
if(receiptInput) { receiptInput.addEventListener('change', function(e) { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = function(event) { currentReceiptUrl = event.target.result; const preview = document.getElementById('receipt-preview'); if(preview) { preview.src = currentReceiptUrl; preview.style.display = 'block'; } document.getElementById('scan-btn').style.display = 'block'; }; reader.readAsDataURL(file); } }); }

function scanReceipt() { if(!currentReceiptUrl || typeof Tesseract === 'undefined') return Swal.fire('Wait', 'Library load ho rahi hai...', 'info'); const btn = document.getElementById('scan-btn'); btn.innerText = "⏳ AI Scanning..."; Tesseract.recognize(currentReceiptUrl, 'eng').then(({ data: { text } }) => { let amounts = text.match(/[\d,]+\.\d{2}/g); if(amounts) { let maxAmt = Math.max(...amounts.map(a => parseFloat(a.replace(/,/g, '')))); document.getElementById('amount').value = maxAmt; Swal.fire('Scan Success! 📸', `Bill me se Amount ₹${maxAmt} nikal liya gaya!`, 'success'); } else { Swal.fire('Oops', 'Bill mein exact amount nahi mila. Khud daal lijiye.', 'info'); } btn.innerText = "📸 AI Scan"; }).catch(err => { btn.innerText = "📸 AI Scan"; Swal.fire('Error', 'Scanning fail ho gayi.', 'error'); }); }
function calculateSplit() { let amt = parseFloat(document.getElementById('split-amount').value); let ppl = parseInt(document.getElementById('split-people').value); if(isNaN(amt) || isNaN(ppl) || amt<=0 || ppl<=0) return Swal.fire('Error', 'Sahi details daalein!', 'error'); let perHead = (amt / ppl).toFixed(2); let res = document.getElementById('split-result'); res.style.display = 'block'; res.innerHTML = `Har kisi ko <b>₹${perHead}</b> dene honge! 💸`; playSound('success'); if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); }

function importBankCSV() {
    const fileInput = document.getElementById('bank-csv-file'); if(!fileInput.files.length) return Swal.fire('File Missing', 'Pehle ek CSV file upload karein!', 'warning');
    const reader = new FileReader();
    reader.onload = function(e) {
        let lines = e.target.result.split('\n'); let added = 0;
        for(let i=1; i<lines.length; i++) {
            let cols = lines[i].split(',');
            if(cols.length >= 3) {
                let dateVal = cols[0].trim(); let descVal = cols[1].trim(); let amtVal = parseFloat(cols[2] || cols[3] || 0); 
                if(!isNaN(amtVal) && amtVal > 0 && descVal.length > 2) {
                    let fDate = todayDateString; try { let d = new Date(dateVal); if(!isNaN(d)) fDate = d.toISOString().split('T')[0]; } catch(err){}
                    familyExpenses.push({ member: "Aditya", category: "Other", description: `🏦 Bank: ${descVal.substring(0,15)}`, amount: amtVal, date: fDate, receipt: "", gps: null }); added++;
                }
            }
        }
        if(added > 0) { saveToCloud(); updateHisabUI(); playSound('success'); Swal.fire('Imported! 🏦', `${added} naye kharche bank statement se jod diye gaye!`, 'success'); } else { Swal.fire('Error', 'File format sahi nahi hai.', 'error'); }
        fileInput.value = "";
    }; reader.readAsText(fileInput.files[0]);
}

function setBudget() { Swal.fire({ title: 'Monthly Budget', input: 'number', inputValue: budgetLimit, showCancelButton: true }).then((result) => { if (result.isConfirmed && result.value > 0) { budgetLimit = result.value; saveToCloud(); renderHistoryWithSkeleton(); } }); }
function setIncome() { Swal.fire({ title: 'Is Mahine Ki Kamai (Income)', input: 'number', inputValue: monthlyIncome, showCancelButton: true }).then((result) => { if (result.isConfirmed && result.value >= 0) { monthlyIncome = parseFloat(result.value); saveToCloud(); updateHisabUI(); } }); }
function renderHistoryWithSkeleton() { const list = document.getElementById('history-list'); if(!list) return; list.innerHTML = `<div class="skeleton-box"></div>`; setTimeout(updateHisabUI, 400); }

function updateHisabUI() {
    const list = document.getElementById('history-list'); if(!list) return; list.innerHTML = ''; 
    const filterMonth = document.getElementById('month-filter').value || todayDateString.slice(0, 7);
    const budgetDisplay = document.getElementById('budget-display'); if(budgetDisplay) budgetDisplay.innerText = budgetLimit;
    const incomeDisplay = document.getElementById('total-income-display'); if(incomeDisplay) incomeDisplay.innerText = `₹${monthlyIncome}`;

    const searchInput = document.getElementById('search-expense'); const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
    const familyFilterInput = document.getElementById('family-filter'); const familyQuery = familyFilterInput ? familyFilterInput.value : "All";
    const sortFilterInput = document.getElementById('sort-expense'); const sortQuery = sortFilterInput ? sortFilterInput.value : "date-desc";

    let filteredExpenses = familyExpenses.filter(item => {
        const matchMonth = item.date && item.date.startsWith(filterMonth);
        const matchSearch = item.description.toLowerCase().includes(searchQuery) || item.category.toLowerCase().includes(searchQuery) || (item.member && item.member.toLowerCase().includes(searchQuery));
        const matchFamily = familyQuery === "All" ? true : (item.member === familyQuery); 
        return matchMonth && matchSearch && matchFamily;
    });

    let totalExpense = 0; let categoryTotals = { "Ration": 0, "Medical": 0, "Petrol": 0, "Shopping": 0, "Bills": 0, "Other": 0 }; let memberTotals = {};
    if(activeQuickFilter === 'Today') filteredExpenses = filteredExpenses.filter(item => item.date === todayDateString);
    if(activeQuickFilter === 'High') filteredExpenses = filteredExpenses.filter(item => item.amount >= 500);

    filteredExpenses.sort((a, b) => { if(sortQuery === 'date-desc') return new Date(b.date) - new Date(a.date); if(sortQuery === 'date-asc') return new Date(a.date) - new Date(b.date); if(sortQuery === 'amt-desc') return b.amount - a.amount; if(sortQuery === 'amt-asc') return a.amount - b.amount; return 0; });
    let isDateSorted = sortQuery.startsWith('date');

    filteredExpenses.forEach((item) => { totalExpense += item.amount; let cat = item.category || "Other"; if(categoryTotals[cat] !== undefined) categoryTotals[cat] += item.amount; let mem = item.member || "Unknown"; if(!memberTotals[mem]) memberTotals[mem] = 0; memberTotals[mem] += item.amount; });

    let currentDateHeader = "";
    filteredExpenses.forEach((item) => {
        if(isDateSorted && item.date !== currentDateHeader) {
            currentDateHeader = item.date; const parts = currentDateHeader.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`;
            const dateHeader = document.createElement('div'); dateHeader.className = 'date-header'; dateHeader.style.fontWeight = 'bold'; dateHeader.style.color = 'var(--ink-blue)'; dateHeader.style.margin = '10px 0 5px 0'; dateHeader.innerText = `📅 ${showDate}`; list.appendChild(dateHeader);
        }
        const originalIndex = familyExpenses.indexOf(item); const li = document.createElement('li');
        let receiptHTML = item.receipt ? `<img src="${item.receipt}" class="receipt-thumb" style="width:30px; height:30px; border-radius:5px; object-fit:cover; margin-right:5px; cursor:pointer;" onclick="Swal.fire({imageUrl: '${item.receipt}', imageWidth: '100%'})">` : '';
        let mapHtml = item.gps ? `<a href="${item.gps}" target="_blank" style="font-size:11px; text-decoration:none; background:#dbeafe; color:#1d4ed8; padding:2px 6px; border-radius:5px; margin-left:5px;">🌍 Map</a>` : '';
        let shareHtml = `<button onclick="shareSingleExpense(${originalIndex})" style="background:none; border:none; font-size:14px; cursor:pointer; margin-left:5px;" title="Share Bill">📲</button>`;
        li.innerHTML = `<div class="list-left"><strong style="font-size: 18px;">${item.description}</strong><div style="display: flex; align-items: center; margin-top: 5px; flex-wrap: wrap; gap: 5px;"><span class="member-badge">👤 ${item.member}</span> <span class="category-badge">${item.category||'Other'}</span>${mapHtml}</div></div><div class="list-right">${receiptHTML}<span style="font-weight: 800; color: #e74c3c; font-size: 20px; margin: 0 5px;">₹${item.amount}</span><button class="action-btn edit" onclick="editExpense(${originalIndex})">✏️</button><button class="action-btn delete" onclick="deleteExpense(${originalIndex})">🗑️</button>${shareHtml}</div>`;
        list.appendChild(li);
    });

    const totalEl = document.getElementById('total-expense'); if(totalEl) totalEl.innerText = `₹${totalExpense}`;
    
    let compEl = document.getElementById('month-comparison');
    if(compEl) {
        let currYear = parseInt(filterMonth.split('-')[0]); let currMonth = parseInt(filterMonth.split('-')[1]);
        let lastMonth = currMonth === 1 ? 12 : currMonth - 1; let lastYear = currMonth === 1 ? currYear - 1 : currYear;
        let lastMonthStr = `${lastYear}-${lastMonth.toString().padStart(2, '0')}`;
        let lastMonthTotal = familyExpenses.filter(item => item.date && item.date.startsWith(lastMonthStr)).reduce((sum, item) => sum + item.amount, 0);
        if(lastMonthTotal > 0) {
            let diff = totalExpense - lastMonthTotal; let percentDiff = Math.abs((diff / lastMonthTotal) * 100).toFixed(1);
            if(diff > 0) { compEl.innerHTML = `📉 Pichle mahine se <b>${percentDiff}% zyada</b> kharcha hua.`; compEl.style.color = '#ef4444'; } 
            else if(diff < 0) { compEl.innerHTML = `📈 Pichle mahine se <b>${percentDiff}% kam</b> kharcha hua! ✅`; compEl.style.color = '#10b981'; } 
            else { compEl.innerHTML = `📊 Pichle mahine jitna hi kharcha chal raha hai.`; compEl.style.color = '#64748b'; }
        } else { compEl.innerHTML = `📊 Abhi tak ka kharcha: ₹${totalExpense}`; compEl.style.color = '#64748b'; }
    }

    let budgetPercent = Math.min((totalExpense / budgetLimit) * 100, 100).toFixed(1); const bar = document.getElementById('budget-bar'); 
    if(bar) { bar.style.width = `${budgetPercent}%`; if(budgetPercent < 50) bar.style.background = '#2ecc71'; else if(budgetPercent < 80) bar.style.background = '#f39c12'; else bar.style.background = '#e74c3c'; const warning = document.getElementById('budget-warning'); if(warning) { warning.innerHTML = `📊 Usage: <b>${budgetPercent}%</b>`; warning.style.display = 'block'; warning.style.color = budgetPercent >= 80 ? '#e74c3c' : '#10b981'; } }
    
    let planner = document.getElementById('smart-budget-planner');
    if(monthlyIncome > 0 && planner) { planner.style.display = 'block'; document.getElementById('rule-needs').innerText = `₹${Math.round(monthlyIncome * 0.50)}`; document.getElementById('rule-wants').innerText = `₹${Math.round(monthlyIncome * 0.30)}`; document.getElementById('rule-saves').innerText = `₹${Math.round(monthlyIncome * 0.20)}`; } else if(planner) { planner.style.display = 'none'; }
    
    updatePrediction(totalExpense); renderCalendar(filteredExpenses, filterMonth); renderCategoryChart(categoryTotals); renderMemberChart(memberTotals); renderTrendChart(filteredExpenses); applyLanguageUI();
}

function renderTrendChart(expenses) { const ctx = document.getElementById('trendChart'); if(!ctx) return; if(trendChartInstance) trendChartInstance.destroy(); let dailyTotals = {}; expenses.forEach(exp => { let day = exp.date.split('-')[2]; dailyTotals[day] = (dailyTotals[day] || 0) + exp.amount; }); const labels = Object.keys(dailyTotals).sort((a,b) => parseInt(a) - parseInt(b)); const data = labels.map(day => dailyTotals[day]); const textColor = isDarkMode ? '#fff' : '#333'; trendChartInstance = new Chart(ctx.getContext('2d'), { type: 'bar', data: { labels: labels.map(l => l + ' Date'), datasets: [{ label: 'Daily Spend (₹)', data: data, backgroundColor: '#8b5cf6', borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { labels: { color: textColor } } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } } }); }
function renderCategoryChart(dataObj) { const ctx = document.getElementById('categoryChart'); if(!ctx) return; if(categoryChartInstance) categoryChartInstance.destroy(); const labels = Object.keys(dataObj); const data = Object.values(dataObj); const hasData = data.some(val => val > 0); const textColor = isDarkMode ? '#fff' : '#333'; categoryChartInstance = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { labels: labels, datasets: [{ data: hasData ? data : [1], backgroundColor: hasData ? ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor, font: {size: 11} } } }, cutout: '70%' } }); }
function renderMemberChart(dataObj) { const ctx = document.getElementById('memberChart'); if(!ctx) return; if(memberChartInstance) memberChartInstance.destroy(); const labels = Object.keys(dataObj); const data = Object.values(dataObj); const hasData = data.some(val => val > 0); const textColor = isDarkMode ? '#fff' : '#333'; memberChartInstance = new Chart(ctx.getContext('2d'), { type: 'pie', data: { labels: labels, datasets: [{ data: hasData ? data : [1], backgroundColor: hasData ? ['#2980b9', '#e84393', '#27ae60', '#8e44ad', '#16a085'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor, font: {size: 12, weight: 'bold'} } } } } }); }

function addExpense() {
    const member = document.getElementById('member-name').value; const category = document.getElementById('expense-category').value; const desc = document.getElementById('description').value; const amt = parseFloat(document.getElementById('amount').value); const date = document.getElementById('date').value;
    if (!desc || isNaN(amt) || amt <= 0 || !date) return Swal.fire('Oops...', 'Sahi details bhariye!', 'warning');
    const newRecord = { member, category, description: desc, amount: amt, date, receipt: currentReceiptUrl, gps: currentGPSLocation };
    if(editExpenseIndex === -1) { familyExpenses.push(newRecord); gainXP(10); playSound('success'); if(typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } 
    else { familyExpenses[editExpenseIndex] = newRecord; editExpenseIndex = -1; document.getElementById('btn-add-expense').innerText = "Kharcha Add Karein"; Swal.fire('Updated!', 'Update ho gaya.', 'success'); }
    currentGPSLocation = null; let statusEl = document.getElementById('loc-status'); if(statusEl) { statusEl.innerText = "📍 Location Not Saved"; statusEl.style.color = "var(--text-muted)"; }
    document.getElementById('scan-btn').style.display = 'none'; saveToCloud(); document.getElementById('description').value = ''; document.getElementById('amount').value = ''; currentReceiptUrl = ""; const preview = document.getElementById('receipt-preview'); if(preview) preview.style.display = 'none'; if(receiptInput) receiptInput.value = ""; renderHistoryWithSkeleton();
}
function editExpense(index) { const item = familyExpenses[index]; document.getElementById('member-name').value = item.member || 'Aditya'; document.getElementById('expense-category').value = item.category || 'Other'; document.getElementById('description').value = item.description; document.getElementById('amount').value = item.amount; document.getElementById('date').value = item.date; editExpenseIndex = index; document.getElementById('btn-add-expense').innerText = "Update Kharcha ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function deleteExpense(index) { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c' }).then((result) => { if (result.isConfirmed) { familyExpenses.splice(index, 1); saveToCloud(); renderHistoryWithSkeleton(); } }); }

// ==========================================
// 🏦 6. DEBT MANAGER & SUBSCRIPTIONS
// ==========================================
let tempLoanData = null;
function calculateEMI() { const name = document.getElementById('emi-name').value || 'My Loan'; const p = parseFloat(document.getElementById('emi-principal').value); const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100; const n = parseFloat(document.getElementById('emi-time').value); const dueDate = parseInt(document.getElementById('emi-due-date').value) || 5; if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || n <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error'); const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); const totalAmount = emi * n; const totalInterest = totalAmount - p; tempLoanData = { name: name, principal: p, rate: document.getElementById('emi-rate').value, time: n, emi: Math.round(emi), totalInterest: Math.round(totalInterest), dueDate: dueDate, monthsPaid: 0 }; document.getElementById('emi-result').style.display = 'block'; document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`; document.getElementById('emi-break-principal').innerText = Math.round(p); document.getElementById('emi-break-interest').innerText = Math.round(totalInterest); let pPercent = (p / totalAmount) * 100; document.getElementById('emi-break-bar').style.width = `${pPercent}%`; playSound('click'); }
function saveLoan() { if(!tempLoanData) return; activeLoans.push(tempLoanData); saveToCloud(); updateLoanUI(); tempLoanData = null; Swal.fire('Saved! 🏦', 'Yeh loan list me add ho gaya hai.', 'success'); document.getElementById('emi-result').style.display = 'none'; document.getElementById('emi-name').value = ''; document.getElementById('emi-principal').value = ''; document.getElementById('emi-rate').value = ''; document.getElementById('emi-time').value = ''; }
function updateLoanUI() { const list = document.getElementById('loan-list'); if(!list) return; list.innerHTML = ''; activeLoans.forEach((loan, index) => { let percentPaid = (loan.monthsPaid / loan.time) * 100; let isComplete = loan.monthsPaid >= loan.time; const li = document.createElement('li'); li.style.flexDirection = 'column'; li.style.alignItems = 'stretch'; li.style.borderLeft = isComplete ? "4px solid #10b981" : "4px solid #f472b6"; li.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"><div style="display: flex; flex-direction: column;"><strong style="font-size: 16px;">${loan.name}</strong><span style="font-size: 11px; color: #64748b;">Due: Every ${loan.dueDate}th | EMI: ₹${loan.emi}</span></div><button class="action-btn delete" onclick="deleteLoan(${index})">🗑️</button></div><div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #1e293b; margin-bottom: 4px;"><span>Paid: ${loan.monthsPaid}/${loan.time} Mnth</span><span style="color: ${isComplete ? '#10b981' : '#f59e0b'}">${isComplete ? 'Loan Clear! 🎉' : Math.round(percentPaid)+'% Done'}</span></div><div style="width:100%; background: var(--line-color); border-radius:10px; height:6px; overflow:hidden; margin-bottom: 10px;"><div style="height:100%; width:${percentPaid}%; background: ${isComplete ? '#10b981' : '#f472b6'}; transition: width 0.5s;"></div></div>${!isComplete ? `<button onclick="payEMI(${index})" style="background: #ec4899; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: bold; width: 100%; cursor: pointer;">1-Click Pay ₹${loan.emi} ✅</button>` : ''}`; list.appendChild(li); }); }
function payEMI(index) { let loan = activeLoans[index]; if(loan.monthsPaid >= loan.time) return; Swal.fire({ title: 'Pay EMI?', text: `Kya tum ${loan.name} ka ₹${loan.emi} Hisaab me add karna chahte ho?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Haan, Pay Karo' }).then(async (result) => { if (result.isConfirmed) { const autoExpense = { member: "Aditya", category: "Bills", description: `🏦 EMI Paid: ${loan.name}`, amount: loan.emi, date: todayDateString, receipt: "" }; familyExpenses.push(autoExpense); loan.monthsPaid += 1; gainXP(20); playSound('success'); if(loan.monthsPaid >= loan.time) { if(typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); Swal.fire('Mubarak Ho! 🎉', `Tumhara "${loan.name}" poori tarah se chukta ho gaya hai!`, 'success'); } else { Swal.fire('EMI Paid ✅', 'Hisaab mein add ho gaya hai.', 'success'); } await saveToCloud(); updateLoanUI(); updateHisabUI(); } }); }
function deleteLoan(index) { Swal.fire({ title: 'Delete Loan?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { activeLoans.splice(index, 1); saveToCloud(); updateLoanUI(); } }); }

function addSubscription() { const name = document.getElementById('sub-name').value; const amt = parseFloat(document.getElementById('sub-amount').value); const due = parseInt(document.getElementById('sub-due').value) || 1; if(!name || isNaN(amt) || amt <= 0) return Swal.fire('Error', 'Sahi details daalein!', 'error'); activeSubs.push({ name: name, amount: amt, dueDate: due }); saveToCloud(); updateSubsUI(); document.getElementById('sub-name').value = ''; document.getElementById('sub-amount').value = ''; playSound('success'); Swal.fire('Saved!', 'Subscription add ho gaya!', 'success'); }
function updateSubsUI() { const list = document.getElementById('sub-list'); if(!list) return; list.innerHTML = ''; activeSubs.forEach((sub, index) => { const li = document.createElement('li'); li.style.borderLeft = "4px solid #6366f1"; li.innerHTML = `<div class="list-left"><strong style="font-size:16px;">${sub.name}</strong><span style="font-size:11px; color:#64748b;">Due: Every ${sub.dueDate}th</span></div><div class="list-right" style="display:flex; gap:5px; align-items:center;"><button onclick="paySubscription(${index})" style="background:#6366f1; color:white; border:none; padding:6px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px;">Pay ₹${sub.amount}</button><button class="action-btn delete" onclick="deleteSubscription(${index})">🗑️</button></div>`; list.appendChild(li); }); }
function deleteSubscription(index) { activeSubs.splice(index, 1); saveToCloud(); updateSubsUI(); }
function paySubscription(index) { let sub = activeSubs[index]; Swal.fire({ title: 'Pay Bill?', text: `Pay ₹${sub.amount} for ${sub.name}?`, icon: 'question', showCancelButton: true }).then((result) => { if(result.isConfirmed) { familyExpenses.push({ member: "Aditya", category: "Bills", description: `🔁 Sub Paid: ${sub.name}`, amount: sub.amount, date: todayDateString, receipt: "" }); saveToCloud(); updateHisabUI(); playSound('success'); gainXP(10); Swal.fire('Paid!', 'Bill hisaab me add ho gaya ✅', 'success'); } }); }

// ==========================================
// 💸 7. VYAJ CALCULATOR
// ==========================================
function calculateVyaj() { const p = parseFloat(document.getElementById('vyaj-principal').value); const rate = parseFloat(document.getElementById('vyaj-rate').value); const time = parseFloat(document.getElementById('vyaj-time').value); if (isNaN(p) || isNaN(rate) || isNaN(time) || p <= 0 || time <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error'); const interest = (p * rate * time) / 100; document.getElementById('vyaj-result').style.display = 'block'; document.getElementById('vyaj-only').innerText = `₹${Math.round(interest)}`; playSound('click'); }

// ==========================================
// 📈 8. INVESTMENTS & RATION & DUDH
// ==========================================
function updateInvestUI() { const list = document.getElementById('invest-list'); if(!list) return; list.innerHTML = ''; let totalInvest = 0; investments.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((item, index) => { totalInvest += item.amount; const li = document.createElement('li'); li.style.borderLeft = "4px solid #06b6d4"; li.innerHTML = `<div class="list-left"><strong style="font-size:16px;">${item.type}</strong><span style="font-size:12px; color:#64748b; font-weight:bold;">📅 ${item.date}</span></div><div class="list-right"><span style="font-weight:800; color:#0891b2; font-size:18px; margin-right:10px;">₹${item.amount}</span><button class="action-btn delete" onclick="deleteInvestment(${index})">🗑️</button></div>`; list.appendChild(li); }); const totalEl = document.getElementById('invest-total-amount'); if(totalEl) totalEl.innerText = `₹${totalInvest}`; }
function addInvestment() { const type = document.getElementById('invest-type').value; const amt = parseFloat(document.getElementById('invest-amount').value); const date = document.getElementById('invest-date').value || todayDateString; if (isNaN(amt) || amt <= 0 || !date) return Swal.fire('Oops...', 'Sahi amount daalein!', 'warning'); investments.push({ type, amount: amt, date }); saveToCloud(); updateInvestUI(); gainXP(20); document.getElementById('invest-amount').value = ''; playSound('success'); Swal.fire('Great!', 'Investment add ho gaya!', 'success'); }
function deleteInvestment(index) { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { investments.splice(index, 1); saveToCloud(); updateInvestUI(); } }); }

function updateRationUI() { const list = document.getElementById('ration-list'); if(!list) return; list.innerHTML = ''; rationItems.sort((a, b) => new Date(b.date) - new Date(a.date)); const uniqueDates = [...new Set(rationItems.map(item => item.date))]; uniqueDates.forEach(dateStr => { const parts = dateStr.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`; const dateHeader = document.createElement('div'); dateHeader.className = 'date-header'; dateHeader.style.fontWeight = 'bold'; dateHeader.style.color = '#c084fc'; dateHeader.style.margin = '10px 0 5px 0'; dateHeader.innerText = `🛒 ${showDate}`; list.appendChild(dateHeader); rationItems.forEach((item, index) => { if(item.date === dateStr) { const li = document.createElement('li'); li.style.borderLeft = item.lowStock ? "4px solid #ef4444" : "4px solid #8e44ad"; li.style.background = item.lowStock ? "#fef2f2" : "var(--line-color)"; li.innerHTML = `<div class="list-left ration-item" onclick="toggleRation(${index})" style="flex-direction: row; align-items:center; cursor:pointer; opacity: ${item.bought ? '0.5' : '1'}; flex: 2;"><input type="checkbox" ${item.bought ? 'checked' : ''} style="width: 20px; height: 20px; margin-right:10px;"><div style="display:flex; flex-direction:column;"><strong style="font-size: 16px; text-decoration: ${item.bought ? 'line-through' : 'none'}; color: ${item.lowStock ? '#ef4444' : 'var(--text-main)'}">${item.name}</strong>${item.amount > 0 ? `<span style="font-size:12px; color:#64748b; font-weight:bold;">₹${item.amount}</span>` : ''}</div></div><div class="list-right" style="flex: 1; justify-content: flex-end;"><button class="action-btn" onclick="toggleLowStock(${index})" style="background: ${item.lowStock ? '#ef4444' : '#f1f5f9'}; color: ${item.lowStock ? 'white' : 'black'}; font-size:12px; font-weight:bold; width: 60px;">${item.lowStock ? '⚠️ Low' : 'Stock OK'}</button><button class="action-btn delete" onclick="deleteRation(${index})">🗑️</button></div>`; list.appendChild(li); } }); }); }
function addRation() { const name = document.getElementById('ration-item').value; const rDate = document.getElementById('ration-date').value || todayDateString; const amount = parseFloat(document.getElementById('ration-amount').value) || 0; if(!name || !rDate) return Swal.fire('Galti', 'Samaan ka naam likhein!', 'warning'); rationItems.push({ name: name, bought: false, date: rDate, amount: amount, lowStock: false }); saveToCloud(); document.getElementById('ration-item').value = ''; document.getElementById('ration-amount').value = ''; updateRationUI(); }
async function toggleRation(index) { const item = rationItems[index]; item.bought = !item.bought; playSound('click'); if (item.bought && item.amount > 0) { const autoExpense = { member: "Aditya", category: "Ration", description: `🛒 ${item.name} (Ration)`, amount: item.amount, date: todayDateString, receipt: "" }; familyExpenses.push(autoExpense); gainXP(5); playSound('success'); Swal.fire({ title: 'Hisaab mein juda!', text: `${item.name} ka ₹${item.amount} 'GharManager' mein add ho gaya hai. ✅`, icon: 'success', timer: 2000, showConfirmButton: false }); } await saveToCloud(); updateRationUI(); updateHisabUI(); }
function toggleLowStock(index) { rationItems[index].lowStock = !rationItems[index].lowStock; playSound('click'); saveToCloud(); updateRationUI(); }
function deleteRation(index) { rationItems.splice(index, 1); saveToCloud(); updateRationUI(); }

function updateDudhUI() { const list = document.getElementById('dudh-list'); if(!list) return; list.innerHTML = ''; let totalLiter = 0, totalBill = 0; dudhRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((record, index) => { const totalDayLiter = record.morning + record.evening; const dayCost = totalDayLiter * record.rate; totalLiter += totalDayLiter; totalBill += dayCost; const parts = record.date.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`; const li = document.createElement('li'); li.innerHTML = `<div class="list-left"><div style="display:flex; align-items:center; margin-bottom:6px;"><span class="member-badge" style="background:#bfdbfe; color:#2563eb;">📅 ${showDate}</span><strong style="font-size:15px;">S: ${record.morning}L | Sh: ${record.evening}L</strong></div><div style="font-size:12px; color:#64748b; font-weight:600;">Rate: ₹${record.rate}/L | Total: ${totalDayLiter}L</div></div><div class="list-right"><span style="font-weight:800; color:#2563eb; font-size:19px; margin-right:5px;">₹${dayCost}</span><button class="action-btn edit" onclick="editDudh(${index})">✏️</button><button class="action-btn delete" onclick="deleteDudh(${index})">🗑️</button></div>`; list.appendChild(li); }); document.getElementById('dudh-total-liter').innerText = totalLiter.toFixed(2); document.getElementById('dudh-total-bill').innerText = `₹${Math.round(totalBill)}`; }
function addDudh() { const dDate = document.getElementById('dudh-date').value || todayDateString; const rate = parseFloat(document.getElementById('dudh-rate').value); const morn = parseFloat(document.getElementById('dudh-morning').value) || 0; const eve = parseFloat(document.getElementById('dudh-evening').value) || 0; if (!dDate || isNaN(rate) || (morn === 0 && eve === 0)) return Swal.fire('Galti', 'Sahi details daaliye!', 'error'); if(editDudhIndex === -1) { dudhRecords.push({ date: dDate, rate: rate, morning: morn, evening: eve }); playSound('success'); } else { dudhRecords[editDudhIndex] = { date: dDate, rate: rate, morning: morn, evening: eve }; editDudhIndex = -1; document.getElementById('btn-add-dudh').innerText = "Dudh Add Karein"; } saveToCloud(); updateDudhUI(); document.getElementById('dudh-morning').value = ''; document.getElementById('dudh-evening').value = ''; }
function editDudh(index) { const item = dudhRecords[index]; document.getElementById('dudh-date').value = item.date; document.getElementById('dudh-rate').value = item.rate; document.getElementById('dudh-morning').value = item.morning; document.getElementById('dudh-evening').value = item.evening; editDudhIndex = index; document.getElementById('btn-add-dudh').innerText = "Update Dudh ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function deleteDudh(index) { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { dudhRecords.splice(index, 1); saveToCloud(); updateDudhUI(); } }); }

// ==========================================
// 💾 9. SECURE BACKUP, PDF & EXCEL REPORTS 
// ==========================================
function backupData() { 
    const dataToBackup = { expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, investments: investments, loans: activeLoans, subscriptions: activeSubs, budget: budgetLimit, income: monthlyIncome, xp: userXP, dailyStreak: dailyStreak, todoItems: todoItems, dreamGoal: dreamGoal }; 
    const encryptedData = btoa(unescape(encodeURIComponent(JSON.stringify(dataToBackup)))); 
    const dataStr = "data:text/plain;charset=utf-8," + encryptedData; 
    const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", "GharManager_Encrypted_Backup.txt"); dlAnchorElem.click(); 
}
function restoreData(event) { 
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); 
    reader.onload = async function(e) { 
        try { 
            let decryptedStr = e.target.result; try { decryptedStr = decodeURIComponent(escape(atob(e.target.result))); } catch(err) {} 
            const data = JSON.parse(decryptedStr); 
            if (data.expenses) { 
                familyExpenses = data.expenses || []; dudhRecords = data.dudh || []; rationItems = data.ration || []; investments = data.investments || []; activeLoans = data.loans || []; activeSubs = data.subscriptions || []; budgetLimit = data.budget || 20000; monthlyIncome = data.income || 0; userXP = data.xp || 0; dailyStreak = data.dailyStreak || 0; todoItems = data.todoItems || []; dreamGoal = data.dreamGoal || { name: "No Goal", target: 0 }; 
                await saveToCloud(); Swal.fire('Restored!', 'Aapka purana data wapas aa gaya hai! ✅', 'success'); loadCloudData(currentUser.uid); 
            } else { Swal.fire('Error', 'Yeh file sahi format mein nahi hai!', 'error'); } 
        } catch(err) { Swal.fire('Error', 'File read nahi ho paayi.', 'error'); } 
    }; reader.readAsText(file); 
}

async function shareReport() {
    if(!window.jspdf) return Swal.fire('Wait', 'PDF library load ho rahi hai.', 'info');
    const filterMonth = document.getElementById('month-filter').value; const dataToExport = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth)); if(dataToExport.length === 0) return Swal.fire('Khali hai!', 'Koi record nahi hai.', 'info');
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFillColor(30, 60, 114); doc.rect(0, 0, 210, 22, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text(`GharManager (${filterMonth})`, 14, 15);
    const tableColumn = ["Date", "Name", "Category", "Details", "Amount"]; const tableRows = []; let totalAmount = 0;
    [...dataToExport].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => { const p = exp.date.split('-'); tableRows.push([`${p[2]}/${p[1]}`, exp.member || '-', exp.category || 'Other', exp.description, `Rs ${exp.amount}`]); totalAmount += exp.amount; });
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, theme: 'grid', headStyles: { fillColor: [46, 204, 113] }, foot: [["", "", "", "Total :", `Rs ${totalAmount}`]], footStyles: { fillColor: [231, 76, 60] } });
    const pdfBlob = doc.output('blob'); const fileName = `GharManager_${filterMonth}.pdf`; const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) { try { await navigator.share({ title: `Hisaab - ${filterMonth}`, text: `Total kharcha: ₹${totalAmount}.`, files: [pdfFile] }); } catch (error) { console.log('Share cancel hua:', error); } } else { doc.save(fileName); }
}
function exportToPDF() { shareReport(); }

function exportToExcel() {
    const filterMonth = document.getElementById('month-filter').value; const dataToExport = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth)); if(dataToExport.length === 0) return Swal.fire('Khali hai!', 'Is mahine koi kharcha nahi hai.', 'info');
    let csvContent = "Date,Kaun,Category,Details,Amount (Rs)\n"; dataToExport.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(row => { let cleanDesc = row.description.replace(/,/g, " "); csvContent += `${row.date},${row.member},${row.category},${cleanDesc},${row.amount}\n`; });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", `GharManager_Excel_${filterMonth}.csv`); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); playSound('success'); Swal.fire('Downloaded! 📊', 'Excel file download ho gayi hai.', 'success');
}

async function convertToUSD() {
    let btn = document.getElementById('usd-btn'); btn.innerText = "⏳ Fetching...";
    try {
        let res = await fetch('https://open.er-api.com/v6/latest/INR'); let data = await res.json(); let rate = data.rates.USD;
        let totalInvestments = investments.reduce((sum, item) => sum + (parseFloat(item.amount)||0), 0); 
        let totalLoanLeft = activeLoans.reduce((sum, item) => { let p = parseFloat(item.principal)||0; let t = parseInt(item.time)||1; let m = parseInt(item.monthsPaid)||0; return sum + (p - (p*(m/t))); }, 0); 
        let totalExpAllTime = familyExpenses.reduce((sum, item) => sum + (parseFloat(item.amount)||0), 0);
        let netWorth = (parseFloat(monthlyIncome)||0) + totalInvestments - totalExpAllTime - totalLoanLeft;
        let usdValue = (netWorth * rate).toFixed(2); btn.innerText = `$${usdValue} USD`; btn.style.background = '#dcfce7'; btn.style.color = '#166534'; btn.style.borderColor = '#166534'; playSound('success');
    } catch(e) { btn.innerText = "Error!"; }
}

// ==========================================
// 🤖 11. LOCAL AI FINANCIAL ASSISTANT
// ==========================================
function startVoice() { 
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)(); 
    recognition.lang = 'hi-IN'; const btn = document.getElementById('mic-btn'); btn.innerText = "🛑"; 
    recognition.onresult = (event) => { 
        let text = event.results[0][0].transcript; 
        let match = text.match(/\d+/); 
        if(match) {
            document.getElementById('amount').value = match[0]; 
            let descStr = text.replace(match[0], '').replace(/(rupaye|rupay|roopaye|rs)/gi, '').trim(); 
            document.getElementById('description').value = descStr; 
            Swal.fire({ toast:true, position:'top-end', icon:'success', title:'✨ AI Smart Autofill!', timer: 2000, showConfirmButton: false });
        } else { document.getElementById('description').value = text; }
        btn.innerText = "🎤"; playSound('click'); document.getElementById('description').dispatchEvent(new Event('input'));
    }; 
    recognition.onerror = () => { btn.innerText = "🎤"; Swal.fire('Error', 'Awaz clear nahi aayi!', 'error'); }; recognition.start(); 
}

function askFinanceAI() {
    if(familyExpenses.length === 0) return Swal.fire('🤖 AI', 'Bhai, pehle kuch kharcha toh add karo, tabhi toh hisaab bataunga!', 'info');
    let catTotals = {}; let maxCat = ""; let maxAmt = 0;
    familyExpenses.forEach(exp => { catTotals[exp.category] = (catTotals[exp.category] || 0) + exp.amount; if(catTotals[exp.category] > maxAmt) { maxAmt = catTotals[exp.category]; maxCat = exp.category; } });
    let filterMonth = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0,7);
    let monthExpenses = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth)).reduce((sum, item) => sum + item.amount, 0);
    let savings = monthlyIncome - monthExpenses;
    let savingsMsg = savings > 0 ? `<span style="color:#16a34a; font-weight:bold;">Badiya! Tumne is mahine ₹${savings} bacha liye hain. 🤑</span>` : `<span style="color:#e74c3c; font-weight:bold;">Alert! Tumhari kamai se zyada kharcha (₹${Math.abs(savings)} extra) ho raha hai! 📉</span>`;
    Swal.fire({ title: '🤖 AI Finance Tips', html: `<div style="text-align: left; font-size: 14px; line-height: 1.6;"><p>📊 <b>Top Kharcha:</b> Sabse zyada paisa <b>${maxCat} (₹${maxAmt})</b> mein gaya hai. Thoda control karo!</p><hr style="margin: 10px 0; border: 0.5px dashed #cbd5e1;"><p>💰 <b>Savings:</b> ${savingsMsg}</p><hr style="margin: 10px 0; border: 0.5px dashed #cbd5e1;"><p>💡 <b>AI Tip:</b> "Rule of 50-30-20 yaad rakho. 50% zaroorat, 30% shauk, aur 20% future ke liye save karo."</p></div>`, icon: 'info', confirmButtonText: 'Thanks AI! 👍', confirmButtonColor: '#6366f1' });
}

// ==========================================
// 🎨 12. THEME STORE & DYNAMIC CSS INJECTION
// ==========================================
function openThemeStore() { closeProfile(); document.getElementById('theme-modal').style.display = 'flex'; playSound('click'); }
function closeThemeStore() { document.getElementById('theme-modal').style.display = 'none'; playSound('click'); }

function applyTheme(themeName) { document.body.setAttribute('data-theme', themeName); localStorage.setItem('appTheme', themeName); closeThemeStore(); Swal.fire({ title: 'Theme Applied! 🎨', text: 'Naya rang set ho gaya hai!', icon: 'success', timer: 1500, showConfirmButton: false }); if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); playSound('click'); }

window.addEventListener('DOMContentLoaded', () => { 
    if(!document.getElementById('premium-themes-css')) {
        let style = document.createElement('style'); style.id = 'premium-themes-css';
        style.innerHTML = `
            [data-theme="cyberpunk"] { --bg-color: #0f172a; --paper-bg: #1e1b4b; --text-main: #fdf4ff; --text-muted: #f472b6; --line-color: #831843; --ink-blue: #db2777; --btn-shadow: #9d174d; --shadow-color: rgba(219, 39, 119, 0.4); }
            [data-theme="glass"] { --bg-color: #e0f2fe; --paper-bg: rgba(255, 255, 255, 0.6); --text-main: #0f172a; --text-muted: #0369a1; --line-color: rgba(255, 255, 255, 0.4); --ink-blue: #0284c7; --btn-shadow: #075985; --shadow-color: rgba(2, 132, 199, 0.15); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); }
        `; document.head.appendChild(style);
    }
    let savedAppTheme = localStorage.getItem('appTheme'); if(savedAppTheme) document.body.setAttribute('data-theme', savedAppTheme); 
    updateSoundUI(); autoDarkMode(); 
});

// ==========================================
// 📲 13. PWA INSTALL LOGIC
// ==========================================
let deferredPrompt; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
function installApp() { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then((choiceResult) => { if (choiceResult.outcome === 'accepted') { Swal.fire('Mubarak Ho! 🎉', 'GharManager phone mein install ho gaya hai!', 'success'); } deferredPrompt = null; }); } else { Swal.fire({ title: 'Install Kaise Karein?', text: 'Bhai, upar Right corner mein 3-dots (⋮) par click karo aur wahan se "Add to Home screen" daba do!', icon: 'info', confirmButtonText: 'Theek hai 👍' }); } }
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').then(reg => console.log('✅ SW Active!')).catch(err => console.error('❌ SW Error', err)); }); }