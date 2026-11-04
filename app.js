const API_URL = "https://script.google.com/macros/s/AKfycbz0CKskSJMt4Q9zXIU7qEUJ7XiQfF-J4ohbb1D2izU9ArXoR4jNBiPUiEthVaGnEQ8/exec";
let appData = { wallets: [], categories: [], transactions: [] };
let currentCatTab = 'Expense'; // Tab aktif default: Expense (Pengeluaran)

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

// KELOLA KATEGORI DENGAN SISTEM TAB & SORT BERDASARKAN NAMA
function openCategoryManagerModal() {
    renderCategoryList();
    document.getElementById('categoryManagerModal').classList.remove('hidden');
}

function switchCategoryTab(type) {
    currentCatTab = type;
    renderCategoryList();
}

function renderCategoryList() {
    const content = document.getElementById('categoryListContent');
    
    // Inject tombol tab pilihan (Expense / Income) di dalam modal jika belum ada
    let tabContainer = document.getElementById('catTabContainer');
    if (!tabContainer) {
        const modalBody = document.querySelector('#categoryManagerModal > div');
        tabContainer = document.createElement('div');
        tabContainer.id = 'catTabContainer';
        tabContainer.className = 'grid grid-cols-2 gap-2 mb-2';
        // Sisipkan di bawah tombol "Tambah Kategori"
        const btnAdd = modalBody.querySelector('button[onclick="openCategoryModal()"]');
        btnAdd.parentNode.insertBefore(tabContainer, btnAdd.nextSibling);
    }

    // Render tombol Tab
    tabContainer.innerHTML = `
        <button onclick="switchCategoryTab('Expense')" class="py-2 text-xs font-bold rounded-lg transition ${currentCatTab === 'Expense' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">Pengeluaran (Expense)</button>
        <button onclick="switchCategoryTab('Income')" class="py-2 text-xs font-bold rounded-lg transition ${currentCatTab === 'Income' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">Pemasukan (Income)</button>
    `;

    content.innerHTML = '';

    // Filter berdasarkan tab aktif dan Urutkan (sort) berdasarkan nama secara alfabetis (A-Z)
    const filteredCategories = appData.categories
        .filter(c => c['Tipe'] === currentCatTab)
        .sort((a, b) => a['Nama Kategori'].localeCompare(b['Nama Kategori']));

    if (filteredCategories.length === 0) {
        content.innerHTML = `<div class="text-center text-xs text-slate-400 py-4">Belum ada kategori ${currentCatTab === 'Expense' ? 'Pengeluaran' : 'Pemasukan'}</div>`;
        return;
    }

    filteredCategories.forEach(c => {
        content.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border text-sm">
                <div>
                    <span class="font-bold text-slate-700">${c['Nama Kategori']}</span>
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
}

function closeCategoryManagerModal() { document.getElementById('categoryManagerModal').classList.add('hidden'); }

function openEditCategory(id, name, type) {
    document.getElementById('editCatId').value = id;
    document.getElementById('editCatName').value = name;
    document.getElementById('editCatType').value = type;
    document.getElementById('editCategoryModal').classList.remove('hidden');
}

function closeEditCategoryModal() { document.getElementById('editCategoryModal').classList.add('hidden'); }

async function submitEditCategory() {
    const id = document.getElementById('editCatId').value;
    const name = document.getElementById('editCatName').value;
    const type = document.getElementById('editCatType').value;

    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'editCategory', id, name, type }) });
    const json = await res.json();
    if (json.success) { closeEditCategoryModal(); closeCategoryManagerModal(); loadData(); } else { alert(json.message); }
}

async function deleteCategory(id) {
    if (!confirm('Yakin ingin menghapus kategori ini?')) return;
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteCategory', id }) });
    const json = await res.json();
    if (json.success) { closeCategoryManagerModal(); loadData(); } else { alert(json.message); }
}

function openTxModal(type) {
    document.getElementById('txType').value = type;
    const modalTitle = document.getElementById('txModalTitle');
    const btnSave = document.getElementById('btnSaveTx');
    const wrapperKe = document.getElementById('wrapperKe');
    const wrapperKategori = document.getElementById('wrapperKategori');
    const labelDari = document.getElementById('labelDari');
    const catSelect = document.getElementById('txCategory');

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
        // Urutkan juga dropdown kategori saat memilih transaksi
        appData.categories
            .filter(c => c['Tipe'] === type)
            .sort((a, b) => a['Nama Kategori'].localeCompare(b['Nama Kategori']))
            .forEach(c => {
                catSelect.innerHTML += `<option value="${c['Nama Kategori']}">${c['Nama Kategori']}</option>`;
            });
    }

    document.getElementById('txModal').classList.remove('hidden');
}

function closeTxModal() { document.getElementById('txModal').classList.add('hidden'); document.getElementById('txAmount').value = ''; document.getElementById('txNote').value = ''; }
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
        tanggal: new Date().toISOString().split('T')[0]
    };

    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (json.success) { closeTxModal(); loadData(); } else { alert('Gagal: ' + json.message); }
}

async function submitNewWallet() {
    const name = document.getElementById('newWalletName').value;
    const currency = document.getElementById('newWalletCurrency').value;
    const initial = document.getElementById('newWalletInitial' ).value;
    if (!name) return alert('Nama wallet wajib diisi');

    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addWallet', name, currency, initial }) });
    const json = await res.json();
    if (json.success) { closeWalletModal(); loadData(); } else { alert(json.message); }
}

async function submitNewCategory() {
    const name = document.getElementById('newCatName').value;
    const type = document.getElementById('newCatType').value;
    if (!name) return alert('Nama kategori wajib diisi');

    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addCategory', name, type }) });
    const json = await res.json();
    if (json.success) { 
        closeCategoryModal(); 
        await loadData(); 
        openCategoryManagerModal(); 
    } else { 
        alert(json.message); 
    }
}
