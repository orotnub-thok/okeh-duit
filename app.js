const API_URL = "https://script.google.com/macros/s/AKfycbz0CKskSJMt4Q9zXIU7qEUJ7XiQfF-J4ohbb1D2izU9ArXoR4jNBiPUiEthVaGnEQ8/exec";
let appData = { wallets: [], categories: [], transactions: [] };

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

function renderApp() {
    const currencyTotals = {};
    const currencyWallets = {};

    appData.wallets.forEach(w => {
        const curr = w['Mata Uang'] || 'IDR';
        const saldo = Number(w['SaldoAkhir'] || 0);
        if (!currencyTotals[curr]) {
            currencyTotals[curr] = 0;
            currencyWallets[curr] = [];
        }
        currencyTotals[curr] += saldo;
        currencyWallets[curr].push(w);
    });

    const summaryList = document.getElementById('currencySummaryList');
    summaryList.innerHTML = '';

    for (const [curr, total] of Object.entries(currencyTotals)) {
        const totalFmt = total.toLocaleString('id-ID');
        const symbol = curr === 'USD' ? '$' : 'Rp';
        summaryList.innerHTML += `
            <div onclick="openWalletDetail('${curr}')" class="bg-white p-3 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                <div class="text-xs text-slate-400 font-medium">Total (${curr})</div>
                <div class="text-base font-bold text-slate-800">${symbol} ${totalFmt}</div>
                <div class="text-[10px] text-emerald-600 mt-1 font-medium">Ketuk rincian &rarr;</div>
            </div>
        `;
    }

    window.currencyWalletsData = currencyWallets;

    const selFrom = document.getElementById('txFrom');
    const selTo = document.getElementById('txTo');
    selFrom.innerHTML = ''; selTo.innerHTML = '';
    appData.wallets.forEach(w => {
        selFrom.innerHTML += `<option value="${w['Nama Wallet']}">${w['Nama Wallet']}</option>`;
        selTo.innerHTML += `<option value="${w['Nama Wallet']}">${w['Nama Wallet']}</option>`;
    });

    const historyEl = document.getElementById('txHistory');
    historyEl.innerHTML = '';
    [...appData.transactions].reverse().slice(0, 10).forEach(t => {
        const jumlahFmt = Number(t['Jumlah'] || 0).toLocaleString('id-ID');
        const isIncome = t['Tipe'] === 'Income';
        const isTransfer = t['Tipe'] === 'Transfer';
        let colorClass = 'text-rose-600', sign = '-';
        if (isIncome) { colorClass = 'text-emerald-600'; sign = '+'; }
        if (isTransfer) { colorClass = 'text-blue-600'; sign = '•'; }

        historyEl.innerHTML += `
            <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center text-sm">
                <div>
                    <div class="font-bold text-slate-700">${t['Kategori'] || t['Tipe']}</div>
                    <div class="text-xs text-slate-400">${t['Tanggal']} • ${t['Catatan'] || '-'}</div>
                </div>
                <div class="font-semibold ${colorClass}">${sign} Rp ${jumlahFmt}</div>
            </div>
        `;
    });
}

function openWalletDetail(curr) {
    document.getElementById('walletDetailTitle').innerText = `Rincian Wallet (${curr})`;
    const contentEl = document.getElementById('walletDetailContent');
    contentEl.innerHTML = '';

    const wallets = window.currencyWalletsData[curr] || [];
    wallets.forEach(w => {
        const saldo = Number(w['SaldoAkhir'] || 0).toLocaleString('id-ID');
        const symbol = curr === 'USD' ? '$' : 'Rp';
        contentEl.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                <div>
                    <div class="font-bold text-sm text-slate-700">${w['Nama Wallet']}</div>
                    <div class="text-xs text-slate-500">${symbol} ${saldo}</div>
                </div>
                <div class="flex space-x-1">
                    <button onclick="openEditWallet('${w['Wallet ID']}', '${w['Nama Wallet']}', '${w['Mata Uang']}')" class="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition" title="Ubah">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button onclick="deleteWallet('${w['Wallet ID']}')" class="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition" title="Hapus">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
        `;
    });

    document.getElementById('walletDetailModal').classList.remove('hidden');
}

function closeWalletDetailModal() { document.getElementById('walletDetailModal').classList.add('hidden'); }

function openEditWallet(id, name, currency) {
    document.getElementById('editWalletId').value = id;
    document.getElementById('editWalletName').value = name;
    document.getElementById('editWalletCurrency').value = currency;
    document.getElementById('editWalletModal').classList.remove('hidden');
}

function closeEditWalletModal() { document.getElementById('editWalletModal').classList.add('hidden'); }

async function submitEditWallet() {
    const id = document.getElementById('editWalletId').value;
    const name = document.getElementById('editWalletName').value;
    const currency = document.getElementById('editWalletCurrency').value;
    
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'editWallet', id, name, currency }) });
    const json = await res.json();
    if (json.success) { closeEditWalletModal(); closeWalletDetailModal(); loadData(); } else { alert(json.message); }
}

async function deleteWallet(id) {
    if (!confirm('Yakin ingin menghapus wallet ini?')) return;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteWallet', id }) });
    const json = await res.json();
    if (json.success) { closeWalletDetailModal(); loadData(); } else { alert(json.message); }
}

function openCategoryManagerModal() {
    const content = document.getElementById('categoryListContent');
    content.innerHTML = '';
    appData.categories.forEach(c => {
        content.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border text-sm">
                <div>
                    <span class="font-bold text-slate-700">${c['Nama Kategori']}</span>
                    <span class="text-xs text-slate-400 ml-2">(${c['Tipe']})</span>
                </div>
                <div class="flex space-x-1">
                    <button onclick="openEditCategory('${c['Category ID']}', '${c['Nama Kategori']}', '${c['Tipe']}')" class="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition" title="Ubah">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button onclick="deleteCategory('${c['Category ID']}')" class="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition" title="Hapus">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
        `;
    });
    document.getElementById('categoryManagerModal').classList.remove('hidden');
}

function closeCategoryManagerModal() { document.getElementById('categoryManagerModal').classList.add('hidden'); }

function openEditCategory(id, name, type) {
    document.getElementById('editCatId').value = id;
    document.getElementById('editCatName').value = name;
    document.getElementById('editCatType').value = type;
    document.getElementById('editCategoryModal').classList.remove
