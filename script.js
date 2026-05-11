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

// Initialize Firebase 
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let allExpenses = [];
let allDudh = [];
let allRation = [];
let monthlyBudget = 20000;

// ==========================================
// 🔐 2. GOOGLE LOGIN SYSTEM
// ==========================================
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginStatus = document.getElementById('login-status');

// App Start & Auth Check
auth.onAuthStateChanged(async (user) => {
    // Splash screen hatao agar hai
    const splash = document.getElementById('splash-screen');
    if(splash) splash.style.display = 'none';

    if (user) {
        currentUser = user;
        if(loginStatus) {
            loginStatus.style.display = 'block';
            loginStatus.innerText = "Cloud se data laa rahe hain... ⏳";
            loginStatus.style.color = "#2563eb";
        }
        
        let userName = user.displayName ? user.displayName.split(" ")[0] : "User";
        document.getElementById('smart-greeting').innerText = `Hello, ${userName}! ✨`;
        
        // 1. Cloud se data laao
        await loadCloudData(user.uid);
        
        // 2. Agar phone mein purana offline data hai toh cloud par bhej do
        await syncOldLocalData();
        
        // UI Dikhao
        loginScreen.style.opacity = "0";
        setTimeout(() => {
            loginScreen.style.display = 'none';
            mainApp.style.display = 'block';
        }, 300);
    } else {
        currentUser = null;
        mainApp.style.display = 'none';
        loginScreen.style.display = 'flex';
        loginScreen.style.opacity = "1";
        if(loginStatus) loginStatus.style.display = 'none';
    }
});

// YAHAN AB EMAIL NAHI, DIRECT GOOGLE SE LOGIN HOGA
// (Apne index.html mein button ka onclick="loginWithGoogle()" kar lena)
function loginWithGoogle() {
    if(loginStatus) {
        loginStatus.style.display = 'block';
        loginStatus.innerText = "Google se connect kar rahe hain... ⏳";
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider); 
}

function logout() {
    Swal.fire({
        title: 'Logout?',
        text: "Kya aap sach mein logout karna chahte hain?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        confirmButtonText: 'Yes, Logout'
    }).then((result) => {
        if (result.isConfirmed) {
            auth.signOut();
        }
    });
}

// ==========================================
// 🔄 3. CLOUD SYNC & LOAD DATA
// ==========================================
function loadCloudData(uid) {
    const userRef = db.collection('users').doc(uid);

    // Load Budget
    userRef.get().then((doc) => {
        if (doc.exists && doc.data().budget) {
            monthlyBudget = doc.data().budget;
            document.getElementById('budget-display').innerText = monthlyBudget;
        }
    });

    // Realtime Expenses
    userRef.collection('expenses').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
        allExpenses = [];
        snapshot.forEach(doc => allExpenses.push({ id: doc.id, ...doc.data() }));
        renderHistory();
        updateCharts();
    });

    // Realtime Dudh
    userRef.collection('dudh').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
        allDudh = [];
        snapshot.forEach(doc => allDudh.push({ id: doc.id, ...doc.data() }));
        renderDudhHistory();
    });

    // Realtime Ration
    userRef.collection('ration').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
        allRation = [];
        snapshot.forEach(doc => allRation.push({ id: doc.id, ...doc.data() }));
        renderRationHistory();
    });
}

// Agar localStorage mein purana data pada ho, toh use cloud par upload kar do
async function syncOldLocalData() {
    if (!currentUser) return;
    const oldExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    if (oldExpenses.length > 0) {
        let batch = db.batch();
        oldExpenses.forEach(exp => {
            let docRef = db.collection('users').doc(currentUser.uid).collection('expenses').doc();
            batch.set(docRef, exp);
        });
        await batch.commit();
        localStorage.removeItem('expenses'); // Sync ke baad mita do
        console.log("Purana hisaab cloud par bhej diya!");
    }
}

// ==========================================
// 💰 4. HISAAB (EXPENSES) LOGIC
// ==========================================
async function addExpense() {
    if (!currentUser) return;

    const desc = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('expense-category').value;
    const member = document.getElementById('member-name').value;
    const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];

    if (!desc || !amount) {
        Swal.fire('Khali hai!', 'Description aur Amount bharna zaroori hai', 'warning');
        return;
    }

    try {
        await db.collection('users').doc(currentUser.uid).collection('expenses').add({
            desc, amount, category, member, date, timestamp: Date.now()
        });
        
        document.getElementById('description').value = '';
        document.getElementById('amount').value = '';
        
        try { document.getElementById('sound-success').play(); } catch(e){}
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        Swal.fire({ title: 'Hisaab Add Hua!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } catch (e) {
        Swal.fire('Error', 'Data save nahi hua!', 'error');
    }
}

function renderHistoryWithSkeleton() {
    document.getElementById('history-list').innerHTML = `
        <div style="height: 60px; background: #e2e8f0; border-radius: 8px; margin-bottom: 10px; animation: smoothFadeIn 1s infinite alternate;"></div>
        <div style="height: 60px; background: #e2e8f0; border-radius: 8px; margin-bottom: 10px; animation: smoothFadeIn 1s infinite alternate;"></div>
    `;
    setTimeout(renderHistory, 500);
}

function renderHistory() {
    const list = document.getElementById('history-list');
    const totalDisp = document.getElementById('total-expense');
    const filter = document.getElementById('month-filter').value; 
    
    let filtered = allExpenses;
    if (filter) {
        filtered = allExpenses.filter(e => e.date.startsWith(filter));
    }

    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += e.amount;
        return `
            <li>
                <div class="list-left">
                    <strong>${e.desc}</strong>
                    <div style="display:flex; gap:5px; margin-top: 3px;">
                        <span class="member-badge">${e.member}</span>
                        <span class="category-badge">${e.category}</span>
                    </div>
                </div>
                <div class="list-right">
                    <span>₹${e.amount}</span>
                    <button class="action-btn delete" onclick="deleteRecord('expenses', '${e.id}')">🗑️</button>
                </div>
            </li>
        `;
    }).join('');

    totalDisp.innerText = `₹${total}`;
    updateBudgetBar(total);
}

async function setBudget() {
    if (!currentUser) return;
    const { value: newBudget } = await Swal.fire({
        title: 'Naya Budget Set Karein',
        input: 'number',
        inputValue: monthlyBudget,
        showCancelButton: true,
        inputValidator: (value) => { if (!value) return 'Budget daalna zaroori hai!' }
    });

    if (newBudget) {
        monthlyBudget = parseFloat(newBudget);
        document.getElementById('budget-display').innerText = monthlyBudget;
        await db.collection('users').doc(currentUser.uid).set({ budget: monthlyBudget }, { merge: true });
        renderHistory();
    }
}

function updateBudgetBar(total) {
    const bar = document.getElementById('budget-bar');
    let percent = (total / monthlyBudget) * 100;
    if (percent > 100) percent = 100;
    
    bar.style.width = `${percent}%`;
    if (percent < 50) bar.style.background = '#10b981'; 
    else if (percent < 80) bar.style.background = '#f59e0b'; 
    else bar.style.background = '#ef4444'; 
}

// ==========================================
// 🥛 5. DUDH (MILK) LOGIC
// ==========================================
async function addDudh() {
    if (!currentUser) return;
    const date = document.getElementById('dudh-date').value || new Date().toISOString().split('T')[0];
    const rate = parseFloat(document.getElementById('dudh-rate').value);
    const morning = parseFloat(document.getElementById('dudh-morning').value) || 0;
    const evening = parseFloat(document.getElementById('dudh-evening').value) || 0;

    if (!rate || (morning === 0 && evening === 0)) {
        Swal.fire('Error', 'Rate aur dudh ki matra dalein!', 'warning');
        return;
    }

    const totalLtr = morning + evening;
    const totalCost = totalLtr * rate;

    try {
        await db.collection('users').doc(currentUser.uid).collection('dudh').add({
            date, rate, morning, evening, totalLtr, totalCost, timestamp: Date.now()
        });
        document.getElementById('dudh-morning').value = '';
        document.getElementById('dudh-evening').value = '';
        Swal.fire({ title: 'Dudh Add Hua!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } catch (e) {
        Swal.fire('Error', 'Data save nahi hua!', 'error');
    }
}

function renderDudhHistory() {
    const list = document.getElementById('dudh-list');
    let totalBill = 0;
    let totalLiters = 0;

    list.innerHTML = allDudh.map(d => {
        totalBill += d.totalCost;
        totalLiters += d.totalLtr;
        return `
            <li>
                <div class="list-left">
                    <strong>${d.date}</strong>
                    <span style="font-size: 12px; color: #64748b;">Subah: ${d.morning}L | Shaam: ${d.evening}L</span>
                </div>
                <div class="list-right">
                    <span>₹${d.totalCost}</span>
                    <button class="action-btn delete" onclick="deleteRecord('dudh', '${d.id}')">🗑️</button>
                </div>
            </li>
        `;
    }).join('');

    document.getElementById('dudh-total-bill').innerText = `₹${totalBill}`;
    document.getElementById('dudh-total-liter').innerText = totalLiters.toFixed(1);
}

// ==========================================
// 🛒 6. RATION LOGIC
// ==========================================
async function addRation() {
    if (!currentUser) return;
    const date = document.getElementById('ration-date').value || new Date().toISOString().split('T')[0];
    const item = document.getElementById('ration-item').value;

    if (!item) return Swal.fire('Error', 'Samaan ka naam likhein!', 'warning');

    try {
        await db.collection('users').doc(currentUser.uid).collection('ration').add({
            date, item, bought: false, timestamp: Date.now()
        });
        document.getElementById('ration-item').value = '';
    } catch (e) {}
}

function renderRationHistory() {
    const list = document.getElementById('ration-list');
    list.innerHTML = allRation.map(r => `
        <li style="opacity: ${r.bought ? '0.5' : '1'};">
            <div class="list-left" style="flex-direction: row; align-items: center; gap: 10px;">
                <input type="checkbox" ${r.bought ? 'checked' : ''} onchange="toggleRation('${r.id}', this.checked)" style="width: 20px; height: 20px;">
                <strong style="text-decoration: ${r.bought ? 'line-through' : 'none'};">${r.item}</strong>
            </div>
            <div class="list-right">
                <button class="action-btn delete" onclick="deleteRecord('ration', '${r.id}')">🗑️</button>
            </div>
        </li>
    `).join('');
}

async function toggleRation(id, isBought) {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).collection('ration').doc(id).update({ bought: isBought });
}

// ==========================================
// 🧮 7. EMI & VYAJ CALCULATORS
// ==========================================
function calculateEMI() {
    const p = parseFloat(document.getElementById('emi-principal').value);
    const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100;
    const n = parseFloat(document.getElementById('emi-time').value);

    if (!p || !r || !n) return;
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    document.getElementById('emi-result').style.display = 'block';
    document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`;
    try { document.getElementById('sound-click').play(); } catch(e){}
}

function calculateVyaj() {
    const p = parseFloat(document.getElementById('vyaj-principal').value);
    const r = parseFloat(document.getElementById('vyaj-rate').value);
    const t = parseFloat(document.getElementById('vyaj-time').value);

    if (!p || !r || !t) return;
    const interest = (p * r * t) / 100;
    
    document.getElementById('vyaj-result').style.display = 'block';
    document.getElementById('vyaj-only').innerText = `₹${interest}`;
    try { document.getElementById('sound-click').play(); } catch(e){}
}

// ==========================================
// 🗑️ 8. DELETE FUNCTION
// ==========================================
async function deleteRecord(collectionName, id) {
    if (!currentUser) return;
    const result = await Swal.fire({ title: 'Delete?', text: "Hamesha ke liye mita dein?", icon: 'warning', showCancelButton: true });
    if (result.isConfirmed) {
        await db.collection('users').doc(currentUser.uid).collection(collectionName).doc(id).delete();
    }
}

// ==========================================
// 📈 9. CHARTS
// ==========================================
let catChartInstance = null;
function updateCharts() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const catData = {};
    allExpenses.forEach(e => catData[e.category] = (catData[e.category] || 0) + e.amount);

    if (catChartInstance) catChartInstance.destroy();
    catChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catData),
            datasets: [{ data: Object.values(catData), backgroundColor: ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
    });
}

// ==========================================
// 📄 10. PDF & SHARE
// ==========================================
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Family Hisaab Report", 14, 15);
    const rows = allExpenses.map(e => [e.date, e.desc, e.member, e.category, `Rs ${e.amount}`]);
    doc.autoTable({ head: [['Date', 'Item', 'User', 'Cat', 'Amount']], body: rows, startY: 20 });
    doc.save("Family_Hisaab.pdf");
}

function shareReport() {
    const total = document.getElementById('total-expense').innerText;
    const text = `Ghar ka Hisaab Report 💰\nIs mahine ka kharcha: ${total}\nApp link: family-super-app.web.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// ==========================================
// 🎙️ 11. UI TOOLS
// ==========================================
function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'hi-IN';
    const btn = document.getElementById('mic-btn');
    btn.innerText = "🛑";
    
    recognition.onresult = (event) => {
        document.getElementById('description').value = event.results[0][0].transcript;
        btn.innerText = "🎤";
    };
    recognition.onerror = () => { btn.innerText = "🎤"; Swal.fire('Error', 'Awaz clear nahi aayi!', 'error'); };
    recognition.start();
}

function openSection(id, title) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(`section-${id}`).classList.add('active-section');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    event.currentTarget.classList.add('active-nav');
    
    document.getElementById('app-title').innerText = title;
    try { document.getElementById('sound-click').play(); } catch(e){}
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-toggle').innerText = isDark ? '☀️' : '🌙';
}
