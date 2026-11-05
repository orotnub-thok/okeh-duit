const API_URL = "https://script.google.com/macros/s/AKfycbxUOvYPQXImXk31br78SEWlOvQLD5CfR3sjPwGEzM9s0ppdH4tOqeMhxenW7nXYn8Ms/exec";
let appData = { wallets: [], categories: [], transactions: [] };
let currentCatTab = 'Expense';
let currentWalletTab = 'IDR';

window.onload = function() {
    if (localStorage.getItem('okeh_logged_in') === 'true') {
        showApp();
    }
};

async function handleLogin() {
    const pin = document.getElementById('pinInput').value;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', pin }) });
    const json = await res.json();
    if (json.success) {
        localStorage.setItem('okeh_logged_in', 'true');
        showApp();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
}

function showApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    loadData();
}

async function loadData() {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData' }) });
    const json = await res.json();
    if (json.success) {
        appData = json;
        renderApp();
    }
}

function findVal(obj, keywords) {
    if (!obj) return '';
    const keys = Object.keys(obj);
    for (let kw of keywords) {
        const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (let k of keys) {
            const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanK.includes(cleanKw) || cleanKw.includes(cleanK)) {
                if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
                    return obj[k];
                }
            }
        }
    }
    return '';
}

function renderApp() {
    const filterValue = document.getElementById('timeFilter') ? document.getElementById('timeFilter').value : 'this_month';
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const filteredTransactions = appData.transactions.filter(t => {
        let rawTanggal = findVal(t, ['tanggal', 'date']);
        if (!rawTanggal) return false;

        let dateStr = String(rawTanggal).trim();
        if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
        else if (dateStr.length >= 10) dateStr = dateStr.substring(0, 10);

        let parts = dateStr.split('-');
        if (parts.length !== 3) {
            let d = new Date(rawTanggal);
            if (isNaN(d.getTime())) return false;
            parts = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')];
        }

        const txYear = parseInt(parts[0], 10);
        const txMonth = parseInt(parts[1], 10) - 1;

        if (filterValue === 'this_month') return txYear === currentYear && txMonth === currentMonth;
        if (filterValue === 'this_year') return txYear === currentYear;
        return true;
    });

    const currencyTotals = {};
    const currencyWallets = {};
    const walletPeriodBalances = {};

    filteredTransactions.forEach(t => {
        const tipe = String(findVal(t, ['tipe', 'type']) || '').toLowerCase();
        const mainWallet = String(findVal(t, ['darivallet', 'dariwald', 'fromwallet', 'darawallet']) || '').trim();
        const targetWallet = String(findVal(t, ['kowallet', 'kewallet', 'towallet']) || '').trim();
        const amount = Number(findVal(t, ['jumlah', 'amount', 'nominal'])) || 0;

        if (tipe === 'income' && mainWallet) walletPeriodBalances[mainWallet] = (walletPeriodBalances[mainWallet] || 0) + amount;
        else if (tipe === 'expense' && mainWallet) walletPeriodBalances[mainWallet] = (walletPeriodBalances[mainWallet] || 0) - amount;
        else if (tipe === 'transfer') {
            if (mainWallet) walletPeriodBalances[mainWallet] = (walletPeriodBalances[mainWallet] || 0) - amount;
            if (targetWallet) walletPeriodBalances[targetWallet] = (walletPeriodBalances[targetWallet] || 0) + amount;
        }
    });

    appData.wallets.forEach(w => {
        const name = findVal(w, ['namawallet', 'wallet', 'nama']);
        if (!name) return;
        const curr = String(findVal(w, ['matauang', 'currency', 'curr']) || 'IDR').toUpperCase();
        
        let saldo = 0;
        if (filterValue === 'all_time') {
            const initialBalance = Number(findVal(w, ['saldoakhir', 'saldoawal', 'balance', 'saldo'])) || 0;
            let allTimeMutasi = 0;
            appData.transactions.forEach(t => {
                const tipe = String(findVal(t, ['tipe', 'type']) || '').toLowerCase();
                const mWallet = String(findVal(t, ['darivallet', 'dariwald', 'fromwallet', 'darawallet']) || '').trim();
                const tWallet = String(findVal(t, ['kowallet', 'kewallet', 'towallet']) || '').trim();
                const amt = Number(findVal(t, ['jumlah', 'amount', 'nominal'])) || 0;

                if (mWallet.toLowerCase() === name.toLowerCase()) {
                    if (tipe === 'income') allTimeMutasi += amt;
                    else if (tipe === 'expense' || tipe === 'transfer') allTimeMutasi -= amt;
                }
                if (tWallet.toLowerCase() === name.toLowerCase()) {
                    if (tipe === 'transfer') allTimeMutasi += amt;
                }
            });
            saldo = initialBalance + allTimeMutasi;
        } else {
            let matchedKey = Object.keys(walletPeriodBalances).find(k => k.toLowerCase() === name.toLowerCase());
            saldo = matchedKey ? walletPeriodBalances[matchedKey] : 0;
        }

        if (!currencyTotals[curr]) {
            currencyTotals[curr] = 0;
            currencyWallets[curr] = [];
        }
        currencyTotals[curr] += saldo;
        currencyWallets[curr].push({ ...w, computedSaldo: saldo });
    });

    const summaryList = document.getElementById('currencySummaryList');
    summaryList.innerHTML = '';
    for (const [curr, total] of Object.entries(currencyTotals)) {
        const symbol = curr === 'USD' ? '$' : 'Rp';
        summaryList.innerHTML += `
            <div onclick="openWalletDetail('${curr}')" class="bg-white p-3 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                <div class="text-xs text-slate-400 font-medium">Total (${curr})</div>
                <div class="text-base font-bold text-slate-800">${symbol} ${total.toLocaleString('id-ID')}</div>
                <div class="text-[10px] text-emerald-600 mt-1 font-medium">Ketuk rincian &rarr;</div>
            </div>
        `;
    }

    window.currencyWalletsData = currencyWallets;

    const selFrom = document.getElementById('txFrom');
    const selTo = document.getElementById('txTo');
    selFrom.innerHTML = ''; selTo.innerHTML = '';
    
    [...appData.wallets]
        .filter(w => findVal(w, ['namawallet', 'wallet', 'nama']))
        .sort((a, b) => String(findVal(a, ['namawallet', 'wallet', 'nama'])).localeCompare(String(findVal(b, ['namawallet', 'wallet', 'nama']))))
        .forEach(w => {
            const name = findVal(w, ['namawallet', 'wallet', 'nama']);
            const curr = String(findVal(w, ['matauang', 'currency', 'curr']) || 'IDR').toUpperCase();
            selFrom.innerHTML += `<option value="${name}">${name} (${curr})</option>`;
            selTo.innerHTML += `<option value="${name}">${name} (${curr})</option>`;
        });

    const historyEl = document.getElementById('txHistory');
    historyEl.innerHTML = '';

    if (filteredTransactions.length === 0) {
        historyEl.innerHTML = `<div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center text-xs text-slate-400">Tidak ada transaksi.</div>`;
        return;
    }

    [...filteredTransactions].reverse().slice(0, 5).forEach(t => {
        const jumlah = Number(findVal(t, ['jumlah', 'amount', 'nominal'])) || 0;
        const tipe = String(findVal(t, ['tipe', 'type']) || '');
        const kategori = String(findVal(t, ['kategori', 'category']) || '');
        
        let rawTanggal = findVal(t, ['tanggal', 'date']);
        let tanggal = String(rawTanggal).trim();
        if (tanggal.includes('T')) tanggal = tanggal.split('T')[0];

        const txCurr = String(findVal(t, ['matauang', 'currency', 'curr']) || 'IDR').toUpperCase();
        const isIncome = tipe.toLowerCase() === 'income';
        const isTransfer = tipe.toLowerCase() === 'transfer';
        let colorClass = 'text-rose-600', sign = '-';
        if (isIncome) { colorClass = 'text-emerald-600'; sign = '+'; }
        if (isTransfer) { colorClass = 'text-blue-600'; sign = '•'; }

        const symbol = txCurr === 'USD' ? '$' : 'Rp';

        historyEl.innerHTML += `
            <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center text-sm">
                <div>
                    <div class="font-bold text-slate-700">${kategori || tipe}</div>
                    <div class="text-xs text-slate-400">${tanggal}</div>
                </div>
                <div class="font-semibold ${colorClass}">${sign} ${symbol} ${jumlah.toLocaleString('id-ID')}</div>
            </div>
        `;
    });
}

function openWalletDetail(curr) {
    document.getElementById('walletDetailTitle').innerText = `Rincian Wallet (${curr})`;
    const contentEl = document.getElementById('walletDetailContent');
    contentEl.innerHTML = '';

    const rawWallets = window.currencyWalletsData[curr] || [];
    rawWallets.forEach(w => {
        const id = findVal(w, ['walletid', 'id', 'code']);
        const name = findVal(w, ['namawallet', 'wallet', 'nama']);
        const currVal = String(findVal(w, ['matauang', 'currency', 'curr']) || curr).toUpperCase();
        let saldo = w.computedSaldo !== undefined ? w.computedSaldo : 0;
        const symbol = curr === 'USD' ? '$' : 'Rp';

        contentEl.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50 p-3 rounded-lg border text-sm">
                <div>
                    <div class="font-bold text-slate-700">${name}</div>
                    <div class="text-xs text-slate-500">${symbol} ${saldo.toLocaleString('id-ID')}</div>
                </div>
                <div class="flex space-x-1">
                    <button onclick="openEditWallet('${id}', '${name}', '${currVal}')" class="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition">✏️</button>
                    <button onclick="deleteWallet('${id}')" class="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition">🗑️</button>
                </div>
            </div>
        `;
    });
    document.getElementById('walletDetailModal').classList.remove('hidden');
}

function openWalletManagerModal(defaultCurr = 'IDR') { currentWalletTab = defaultCurr; renderWalletList(); document.getElementById('walletDetailModal').classList.remove('hidden'); }
function switchWalletTab(curr) { currentWalletTab = curr; renderWalletList(); }
function renderWalletList() {
    document.getElementById('walletDetailTitle').innerText = `Kelola Wallet`;
    const contentEl = document.getElementById('walletDetailContent');
    contentEl.innerHTML = '';

    const filtered = appData.wallets.filter(w => String(findVal(w, ['matauang', 'currency', 'curr']) || 'IDR').toUpperCase() === currentWalletTab);
    filtered.forEach(w => {
        const id = findVal(w, ['walletid', 'id', 'code']);
        const name = findVal(w, ['namawallet', 'wallet', 'nama']);
        contentEl.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50 p-3 rounded-lg border text-sm">
                <div>
                    <div class="font-bold text-slate-700">${name}</div>
                </div>
                <div class="flex space-x-1">
                    <button onclick="openEditWallet('${id}', '${name}', '${currentWalletTab}')" class="p-1.5 bg-amber-500 text-white rounded-lg">✏️</button>
                    <button onclick="deleteWallet('${id}')" class="p-1.5 bg-rose-500 text-white rounded-lg">🗑️</button>
                </div>
            </div>
        `;
    });
}

function closeWalletDetailModal() { document.getElementById('walletDetailModal').classList.add('hidden'); }
function openEditWallet(id, name, currency) { document.getElementById('editWalletId').value = id; document.getElementById('editWalletName').value = name; document.getElementById('editWalletCurrency').value = currency; document.getElementById('editWalletModal').classList.remove('hidden'); }
function closeEditWalletModal() { document.getElementById('editWalletModal').classList.add('hidden'); }

async function submitEditWallet() {
    const id = document.getElementById('editWalletId').value;
    const name = document.getElementById('editWalletName').value;
    const currency = document.getElementById('editWalletCurrency').value;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'editWallet', id, name, currency }) });
    const json = await res.json();
    if (json.success) { closeEditWalletModal(); await loadData(); }
}

async function deleteWallet(id) {
    if (!confirm('Yakin hapus wallet ini?')) return;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteWallet', id }) });
    const json = await res.json();
    if (json.success) loadData();
}

function openCategoryManagerModal() { renderCategoryList(); document.getElementById('categoryManagerModal').classList.remove('hidden'); }
function switchCategoryTab(type) { currentCatTab = type; renderCategoryList(); }
function renderCategoryList() {
    const content = document.getElementById('categoryListContent');
    content.innerHTML = '';
    const filtered = appData.categories.filter(c => String(findVal(c, ['tipe', 'type'])).toLowerCase() === currentCatTab.toLowerCase());
    filtered.forEach(c => {
        const id = findVal(c, ['categoryid', 'id', 'code']);
        const name = findVal(c, ['namakategori', 'kategori', 'category', 'nama']);
        const type = findVal(c, ['tipe', 'type']);
        content.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border text-sm">
                <span class="font-bold text-slate-700">${name}</span>
                <div class="flex space-x-1">
                    <button onclick="openEditCategory('${id}', '${name}', '${type}')" class="p-1.5 bg-amber-500 text-white rounded-lg">✏️</button>
                    <button onclick="deleteCategory('${id}')" class="p-1.5 bg-rose-500 text-white rounded-lg">🗑️</button>
                </div>
            </div>
        `;
    });
}

function closeCategoryManagerModal() { document.getElementById('categoryManagerModal').classList.add('hidden'); }
function openEditCategory(id, name, type) { document.getElementById('editCatId').value = id; document.getElementById('editCatName').value = name; document.getElementById('editCatType').value = type; document.getElementById('editCategoryModal').classList.remove('hidden'); }
function closeEditCategoryModal() { document.getElementById('editCategoryModal').classList.add('hidden'); }

async function submitEditCategory() {
    const id = document.getElementById('editCatId').value;
    const name = document.getElementById('editCatName').value;
    const type = document.getElementById('editCatType').value;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'editCategory', id, name, type }) });
    const json = await res.json();
    if (json.success) { closeEditCategoryModal(); loadData(); }
}

async function deleteCategory(id) {
    if (!confirm('Yakin hapus kategori ini?')) return;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteCategory', id }) });
    const json = await res.json();
    if (json.success) loadData();
}

function openTxModal(type) {
    document.getElementById('txType').value = type;
    const modalTitle = document.getElementById('txModalTitle');
    const btnSave = document.getElementById('btnSaveTx');
    const wrapperKe = document.getElementById('wrapperKe');
    const wrapperKategori = document.getElementById('wrapperKategori');
    const labelDari = document.getElementById('labelDari');
    const catSelect = document.getElementById('txCategory');

    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];

    if (type === 'Income') {
        modalTitle.innerText = 'Tambah Pemasukan';
        btnSave.className = 'w-1/2 bg-emerald-600 text-white font-semibold py-2 rounded-lg text-sm';
        labelDari.innerText = 'Ke Wallet (Tujuan)';
        wrapperKe.classList.add('hidden');
        wrapperKategori.classList.remove('hidden');
    } else if (type === 'Expense') {
        modalTitle.innerText = 'Tambah Pengeluaran';
        btnSave.className = 'w-1/2 bg-rose-600 text-white font-semibold py-2 rounded-lg text-sm';
        labelDari.innerText = 'Dari Wallet (Sumber)';
        wrapperKe.classList.add('hidden');
        wrapperKategori.classList.remove('hidden');
    } else if (type === 'Transfer') {
        modalTitle.innerText = 'Transfer Antar Wallet';
        btnSave.className = 'w-1/2 bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm';
        labelDari.innerText = 'Dari Wallet';
        wrapperKe.classList.remove('hidden');
        wrapperKategori.classList.add('hidden');
    }

    if (type !== 'Transfer') {
        catSelect.innerHTML = '';
        appData.categories
            .filter(c => String(findVal(c, ['tipe', 'type'])).toLowerCase() === type.toLowerCase())
            .forEach(c => {
                const name = findVal(c, ['namakategori', 'kategori', 'category', 'nama']);
                catSelect.innerHTML += `<option value="${name}">${name}</option>`;
            });
    }

    document.getElementById('txModal').classList.remove('hidden');
}

function closeTxModal() { document.getElementById('txModal').classList.add('hidden'); }
function openWalletModal() { document.getElementById('walletModal').classList.remove('hidden'); }
function closeWalletModal() { document.getElementById('walletModal').classList.add('hidden'); }
function openCategoryModal() { document.getElementById('categoryModal').classList.remove('hidden'); }
function closeCategoryModal() { document.getElementById('categoryModal').classList.add('hidden'); }

async function submitTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('txType').value;
    const data = {
        action: 'addTransaction',
        tipe: type,
        dariWallet: document.getElementById('txFrom').value,
        keWallet: type === 'Transfer' ? document.getElementById('txTo').value : '',
        kategori: type === 'Transfer' ? 'Transfer' : document.getElementById('txCategory').value,
        jumlah: document.getElementById('txAmount').value,
        catatan: document.getElementById('txNote').value,
        tanggal: document.getElementById('txDate').value
    };

    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (json.success) { closeTxModal(); loadData(); }
}

async function submitNewWallet() {
    const name = document.getElementById('newWalletName').value;
    const currency = document.getElementById('newWalletCurrency').value;
    const initial = document.getElementById('newWalletInitial').value;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addWallet', name, currency, initial }) });
    const json = await res.json();
    if (json.success) { closeWalletModal(); loadData(); }
}

async function submitNewCategory() {
    const name = document.getElementById('newCatName').value;
    const type = document.getElementById('newCatType').value;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addCategory', name, type }) });
    const json = await res.json();
    if (json.success) { closeCategoryModal(); loadData(); }
}
