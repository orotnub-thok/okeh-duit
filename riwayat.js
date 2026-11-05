let riwayatData = { wallets: [], categories: [], transactions: [] };

window.onload = function() {
    if (localStorage.getItem('okeh_logged_in') !== 'true') {
        window.location.href = 'index.html';
        return;
    }
    loadRiwayatData();
};

async function loadRiwayatData() {
    const container = document.getElementById('riwayatList');
    container.innerHTML = `<div class="text-center text-xs text-slate-400 py-8">Memuat riwayat transaksi...</div>`;

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData' }) });
        const json = await res.json();
        if (json.success) {
            riwayatData = json;
            populateYearFilter();
            renderRiwayat();
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="text-center text-xs text-red-500 py-8">Gagal memuat data. Periksa koneksi internet.</div>`;
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

function populateYearFilter() {
    const yearSelect = document.getElementById('filterYear');
    const years = new Set();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);

    riwayatData.transactions.forEach(t => {
        let rawTanggal = findVal(t, ['tanggal', 'date']);
        if (rawTanggal) {
            let y = new Date(rawTanggal).getFullYear();
            if (!isNaN(y)) years.add(y);
        }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    yearSelect.innerHTML = `<option value="all">Semua Tahun</option>`;
    sortedYears.forEach(y => {
        yearSelect.innerHTML += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
    });

    // Set bulan saat ini sebagai default
    document.getElementById('filterMonth').value = new Date().getMonth().toString();
}

function renderRiwayat() {
    const container = document.getElementById('riwayatList');
    const selectedYear = document.getElementById('filterYear').value;
    const selectedMonth = document.getElementById('filterMonth').value;
    const selectedType = document.getElementById('filterType').value;

    container.innerHTML = '';

    const filtered = riwayatData.transactions.filter(t => {
        let rawTanggal = findVal(t, ['tanggal', 'date']);
        if (!rawTanggal) return false;

        let d = new Date(rawTanggal);
        if (isNaN(d.getTime())) return false;

        const txYear = d.getFullYear().toString();
        const txMonth = d.getMonth().toString();
        const tipe = String(findVal(t, ['tipe', 'type']) || '').toLowerCase();

        if (selectedYear !== 'all' && txYear !== selectedYear) return false;
        if (selectedMonth !== 'all' && txMonth !== selectedMonth) return false;
        if (selectedType !== 'all' && tipe !== selectedType.toLowerCase()) return false;

        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center text-xs text-slate-400">Tidak ada riwayat transaksi pada filter ini.</div>`;
        return;
    }

    filtered.sort((a, b) => new Date(findVal(b, ['tanggal', 'date'])) - new Date(findVal(a, ['tanggal', 'date'])));

    filtered.forEach(t => {
        const txId = findVal(t, ['transactionid', 'txid', 'id']);
        const jumlah = Number(findVal(t, ['jumlah', 'amount', 'nominal'])) || 0;
        const jumlahFmt = jumlah.toLocaleString('id-ID');
        const tipe = String(findVal(t, ['tipe', 'type']) || '');
        const kategori = String(findVal(t, ['kategori', 'category']) || '');
        const dariWallet = String(findVal(t, ['darivallet', 'dariwald', 'fromwallet', 'darawallet']) || '');
        const keWallet = String(findVal(t, ['kowallet', 'kewallet', 'towallet']) || '');
        
        let rawTanggal = findVal(t, ['tanggal', 'date']);
        let tanggal = String(rawTanggal).trim();
        if (tanggal.includes('T')) tanggal = tanggal.split('T')[0];
        else if (tanggal.length >= 10) tanggal = tanggal.substring(0, 10);

        const catatan = String(findVal(t, ['catatan', 'note', 'keterangan']) || '');
        const txCurr = String(findVal(t, ['matauang', 'currency', 'curr']) || 'IDR').toUpperCase();

        const isIncome = tipe.toLowerCase() === 'income';
        const isTransfer = tipe.toLowerCase() === 'transfer';
        let colorClass = 'text-rose-600', sign = '-';
        if (isIncome) { colorClass = 'text-emerald-600'; sign = '+'; }
        if (isTransfer) { colorClass = 'text-blue-600'; sign = '•'; }

        const symbol = txCurr === 'USD' ? '$' : 'Rp';
        const txDataJson = JSON.stringify(t).replace(/'/g, "&apos;");

        container.innerHTML += `
            <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center text-sm">
                <div class="space-y-0.5 max-w-[60%]">
                    <div class="font-bold text-slate-800 border-b pb-0.5 border-slate-100">${kategori || tipe}</div>
                    <div class="text-[11px] text-slate-400 font-medium leading-tight">
                        ${tanggal} • ${dariWallet}${keWallet ? ' ➔ ' + keWallet : ''}
                    </div>
                    ${catatan ? `<div class="text-[11px] text-slate-500 italic truncate">${catatan}</div>` : ''}
                </div>
                <div class="flex items-center space-x-2">
                    <div class="font-bold text-xs sm:text-sm ${colorClass} text-right">
                        ${sign} ${symbol} ${jumlahFmt}
                    </div>
                    <div class="flex space-x-1 pl-1 border-l border-slate-100">
                        <button onclick='openEditTxModal(${txDataJson})' class="p-1 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition" title="Edit">✏️</button>
                        <button onclick="deleteTx('${txId}')" class="p-1 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition" title="Hapus">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// LOGIKA MODAL EDIT & DELETE TRANSAKSI
function openEditTxModal(tx) {
    const txId = findVal(tx, ['transactionid', 'txid', 'id']);
    let rawTanggal = findVal(tx, ['tanggal', 'date']);
    let tanggal = String(rawTanggal).trim();
    if (tanggal.includes('T')) tanggal = tanggal.split('T')[0];
    else if (tanggal.length >= 10) tanggal = tanggal.substring(0, 10);

    const tipe = findVal(tx, ['tipe', 'type']);
    const dariWallet = findVal(tx, ['darivallet', 'dariwald', 'fromwallet', 'darawallet']);
    const keWallet = findVal(tx, ['kowallet', 'kewallet', 'towallet']);
    const kategori = findVal(tx, ['kategori', 'category']);
    const jumlah = findVal(tx, ['jumlah', 'amount', 'nominal']);
    const catatan = findVal(tx, ['catatan', 'note', 'keterangan']);

    document.getElementById('editTxId').value = txId;
    document.getElementById('editTxDate').value = tanggal;
    document.getElementById('editTxType').value = tipe;
    document.getElementById('editTxAmount').value = jumlah;
    document.getElementById('editTxNote').value = catatan || '';

    populateEditWallets(dariWallet, keWallet);
    populateEditCategories(tipe, kategori);
    handleEditTypeChange();

    document.getElementById('editTxModal').classList.remove('hidden');
}

function handleEditTypeChange() {
    const type = document.getElementById('editTxType').value;
    const editWrapperKe = document.getElementById('editWrapperKe');
    const editWrapperKategori = document.getElementById('editWrapperKategori');
    const editLabelDari = document.getElementById('editLabelDari');

    if (type === 'Income') {
        editLabelDari.innerText = 'Ke Wallet (Tujuan)';
        editWrapperKe.classList.add('hidden');
        editWrapperKategori.classList.remove('hidden');
    } else if (type === 'Expense') {
        editLabelDari.innerText = 'Dari Wallet (Sumber)';
        editWrapperKe.classList.add('hidden');
        editWrapperKategori.classList.remove('hidden');
    } else if (type === 'Transfer') {
        editLabelDari.innerText = 'Dari Wallet';
        editWrapperKe.classList.remove('hidden');
        editWrapperKategori.classList.add('hidden');
    }

    populateEditCategories(type, document.getElementById('editTxCategory').value);
}

function populateEditWallets(selectedFrom, selectedTo) {
    const editFrom = document.getElementById('editTxFrom');
    const editTo = document.getElementById('editTxTo');
    editFrom.innerHTML = ''; editTo.innerHTML = '';

    const sortedWallets = [...riwayatData.wallets]
        .filter(w => findVal(w, ['namawallet', 'wallet', 'nama']))
        .sort((a, b) => String(findVal(a, ['namawallet', 'wallet', 'nama'])).localeCompare(String(findVal(b, ['namawallet', 'wallet', 'nama']))));

    sortedWallets.forEach(w => {
        const name = findVal(w, ['namawallet', 'wallet', 'nama']);
        const curr = String(findVal(w, ['matauang', 'currency', 'curr']) || 'IDR').toUpperCase();
        
        const isSelectedFrom = name.toLowerCase() === String(selectedFrom).toLowerCase();
        const isSelectedTo = name.toLowerCase() === String(selectedTo).toLowerCase();

        editFrom.innerHTML += `<option value="${name}" ${isSelectedFrom ? 'selected' : ''}>${name} (${curr})</option>`;
        editTo.innerHTML += `<option value="${name}" ${isSelectedTo ? 'selected' : ''}>${name} (${curr})</option>`;
    });
}

function populateEditCategories(type, selectedCat) {
    const select = document.getElementById('editTxCategory');
    select.innerHTML = '';

    if (type === 'Transfer') {
        select.innerHTML = `<option value="Transfer" selected>Transfer</option>`;
        return;
    }

    const filteredCategories = riwayatData.categories
        .filter(c => String(findVal(c, ['tipe', 'type'])).toLowerCase() === type.toLowerCase())
        .sort((a, b) => String(findVal(a, ['namakategori', 'kategori', 'category', 'nama'])).localeCompare(String(findVal(b, ['namakategori', 'kategori', 'category', 'nama']))));

    filteredCategories.forEach(c => {
        const name = findVal(c, ['namakategori', 'kategori', 'category', 'nama']);
        const isSelected = name.toLowerCase() === String(selectedCat).toLowerCase();
        select.innerHTML += `<option value="${name}" ${isSelected ? 'selected' : ''}>${name}</option>`;
    });
}

function closeEditTxModal() {
    document.getElementById('editTxModal').classList.add('hidden');
}

async function submitEditTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('editTxType').value;
    const data = {
        action: 'editTransaction',
        transactionid: document.getElementById('editTxId').value,
        tanggal: document.getElementById('editTxDate').value,
        tipe: type,
        dariWallet: document.getElementById('editTxFrom').value,
        keWallet: type === 'Transfer' ? document.getElementById('editTxTo').value : '',
        kategori: type === 'Transfer' ? 'Transfer' : document.getElementById('editTxCategory').value,
        jumlah: document.getElementById('editTxAmount').value,
        catatan: document.getElementById('editTxNote').value
    };

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        const result = await res.json();
        if (result.success) {
            closeEditTxModal();
            loadRiwayatData();
        } else {
            alert('Gagal mengedit transaksi: ' + (result.message || 'Kesalahan Server'));
        }
    } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan koneksi.');
    }
}

async function deleteTx(id) {
    if (!id || id === 'undefined') {
        alert('ID Transaksi tidak valid.');
        return;
    }
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteTransaction', transactionid: id }) });
        const result = await res.json();
        if (result.success) {
            loadRiwayatData();
        } else {
            alert('Gagal menghapus transaksi.');
        }
    } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan koneksi.');
    }
}
