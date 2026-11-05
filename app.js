function renderApp() {
    const filterValue = document.getElementById('timeFilter') ? document.getElementById('timeFilter').value : 'this_month';
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 - 11

    // 1. FILTER TRANSAKSI BERDASARKAN WAKTU (AMAN DARI SEGALA FORMAT TANGGAL)
    const filteredTransactions = appData.transactions.filter(t => {
        let rawTanggal = findVal(t, ['tanggal', 'date']);
        if (!rawTanggal) return false;

        let dateStr = String(rawTanggal).trim();
        // Ambil bagian YYYY-MM-DD secara aman entah bentuknya ISO string atau objek
        if (dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0];
        } else if (dateStr.length >= 10) {
            dateStr = dateStr.substring(0, 10);
        }

        let parts = dateStr.split('-');
        if (parts.length !== 3) {
            let d = new Date(rawTanggal);
            if (isNaN(d.getTime())) return false;
            parts = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')];
        }

        const txYear = parseInt(parts[0], 10);
        const txMonth = parseInt(parts[1], 10) - 1;

        if (filterValue === 'this_month') {
            return txYear === currentYear && txMonth === currentMonth;
        } else if (filterValue === 'this_year') {
            return txYear === currentYear;
        }
        return true; // 'all_time'
    });

    // 2. HITUNG SALDO BERDASARKAN FILTER WAKTU
    const currencyTotals = {};
    const currencyWallets = {};
    const walletPeriodBalances = {};

    filteredTransactions.forEach(t => {
        const tipe = String(findVal(t, ['tipe', 'type']) || '').toLowerCase();
        const fromW = String(findVal(t, ['darivallet', 'dariwald', 'fromwallet', 'darawallet']) || '').trim();
        const toW = String(findVal(t, ['kowallet', 'kewallet', 'towallet']) || '').trim();
        const amount = Number(findVal(t, ['jumlah', 'amount', 'nominal'])) || 0;

        if (tipe === 'income') {
            if (fromW) walletPeriodBalances[fromW] = (walletPeriodBalances[fromW] || 0) + amount;
        } else if (tipe === 'expense') {
            if (fromW) walletPeriodBalances[fromW] = (walletPeriodBalances[fromW] || 0) - amount;
        } else if (tipe === 'transfer') {
            if (fromW) walletPeriodBalances[fromW] = (walletPeriodBalances[fromW] || 0) - amount;
            if (toW) walletPeriodBalances[toW] = (walletPeriodBalances[toW] || 0) + amount;
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
                const fW = String(findVal(t, ['darivallet', 'dariwald', 'fromwallet', 'darawallet']) || '').trim();
                const tW = String(findVal(t, ['kowallet', 'kewallet', 'towallet']) || '').trim();
                const amt = Number(findVal(t, ['jumlah', 'amount', 'nominal'])) || 0;

                if (fW.toLowerCase() === name.toLowerCase()) {
                    if (tipe === 'income') allTimeMutasi += amt;
                    else if (tipe === 'expense' || tipe === 'transfer') allTimeMutasi -= amt;
                }
                if (tW.toLowerCase() === name.toLowerCase()) {
                    if (tipe === 'transfer') allTimeMutasi += amt;
                }
            });
            saldo = initialBalance + allTimeMutasi;
        } else {
            let matchedKey = Object.keys(walletPeriodBalances).find(k => k.toLowerCase() === name.toLowerCase());
            saldo = matchedKey ? walletPeriodBalances[matchedKey] : 0;
        }

        const wProcessed = { ...w, computedSaldo: saldo };

        if (!currencyTotals[curr]) {
            currencyTotals[curr] = 0;
            currencyWallets[curr] = [];
        }
        currencyTotals[curr] += saldo;
        currencyWallets[curr].push(wProcessed);
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
    
    const sortedWalletsForTx = [...appData.wallets]
        .filter(w => findVal(w, ['namawallet', 'wallet', 'nama']))
        .sort((a, b) => {
            const nameA = String(findVal(a, ['namawallet', 'wallet', 'nama']));
            const nameB = String(findVal(b, ['namawallet', 'wallet', 'nama']));
            return nameA.localeCompare(nameB);
        });

    sortedWalletsForTx.forEach(w => {
        const name = findVal(w, ['namawallet', 'wallet', 'nama']);
        const curr = String(findVal(w, ['matauang', 'currency', 'curr']) || 'IDR').toUpperCase();
        selFrom.innerHTML += `<option value="${name}">${name} (${curr})</option>`;
        selTo.innerHTML += `<option value="${name}">${name} (${curr})</option>`;
    });

    const historyEl = document.getElementById('txHistory');
    historyEl.innerHTML = '';

    if (filteredTransactions.length === 0) {
        historyEl.innerHTML = `<div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center text-xs text-slate-400">Tidak ada transaksi pada periode ini.</div>`;
        return;
    }

    [...filteredTransactions].reverse().slice(0, 15).forEach(t => {
        const jumlah = Number(findVal(t, ['jumlah', 'amount', 'nominal'])) || 0;
        const jumlahFmt = jumlah.toLocaleString('id-ID');
        const tipe = String(findVal(t, ['tipe', 'type']) || '');
        const kategori = String(findVal(t, ['kategori', 'category']) || '');
        
        let rawTanggal = findVal(t, ['tanggal', 'date']);
        let tanggal = String(rawTanggal).trim();
        if (tanggal.includes('T')) tanggal = tanggal.split('T')[0];
        else if (tanggal.length >= 10) tanggal = tanggal.substring(0, 10);

        const catatan = String(findVal(t, ['catatan', 'note', 'keterangan']) || '');
        const txCurr = String(findVal(t, ['matauang', 'currency', 'curr']) || 'IDR').toUpperCase();

        if (!tipe && !jumlah) return;

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
                    <div class="text-xs text-slate-400">${tanggal} • ${catatan || '-'}</div>
                </div>
                <div class="font-semibold ${colorClass}">${sign} ${symbol} ${jumlahFmt}</div>
            </div>
        `;
    });
}
