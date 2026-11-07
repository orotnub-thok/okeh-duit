document.addEventListener("DOMContentLoaded", () => {
    let allTransactions = [];
    let allWallets = [];
    let allCategories = [];
    let selectedCategory = "Semua"; // Default tampilkan semua kategori

    // Inisialisasi dropdown filter Tahun & Bulan
    initFilterOptions();

    // Load data awal dari backend
    loadData();

    // Event listener perubahan filter
    document.getElementById("filterTahun").addEventListener("change", filterAndRender);
    document.getElementById("filterBulan").addEventListener("change", filterAndRender);
    document.getElementById("filterJenis").addEventListener("change", filterAndRender);
    document.getElementById("filterWallet").addEventListener("change", filterAndRender);
    document.getElementById("btnRefresh").addEventListener("click", loadData);

    async function loadData() {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getData' })
            });
            const result = await res.json();

            console.log("Response Data dari Server:", result);

            if (result.success) {
                allTransactions = result.transactions || [];
                allWallets = result.wallets || [];
                allCategories = result.categories || [];

                populateWalletDropdowns();
                filterAndRender();
            } else {
                alert("Gagal memuat data: " + result.message);
            }
        } catch (err) {
            console.error("Gagal memuat data:", err);
            alert("Terjadi kesalahan jaringan saat memuat data.");
        }
    }

    function populateWalletDropdowns() {
        const filterWallet = document.getElementById("filterWallet");
        const editDari = document.getElementById("editDariWallet");
        const editKe = document.getElementById("editKeWallet");

        let walletOptions = `<option value="Semua">Semua Wallet</option>`;
        let editOptions = ``;

        allWallets.forEach(w => {
            walletOptions += `<option value="${w.namawallet}">${w.namawallet}</option>`;
            editOptions += `<option value="${w.namawallet}">${w.namawallet}</option>`;
        });

        filterWallet.innerHTML = walletOptions;
        if (editDari) editDari.innerHTML = editOptions;
        if (editKe) editKe.innerHTML = editOptions;
    }

    function initFilterOptions() {
        const tahunSelect = document.getElementById("filterTahun");
        const bulanSelect = document.getElementById("filterBulan");
        
        const currentYear = new Date().getFullYear();
        let tahunHTML = "";
        for (let y = currentYear; y >= currentYear - 3; y--) {
            tahunHTML += `<option value="${y}">${y}</option>`;
        }
        tahunSelect.innerHTML = tahunHTML;

        const months = [
            {val: "01", name: "Januari"}, {val: "02", name: "Februari"},
            {val: "03", name: "Maret"}, {val: "04", name: "April"},
            {val: "05", name: "Mei"}, {val: "06", name: "Juni"},
            {val: "07", name: "Juli"}, {val: "08", name: "Agustus"},
            {val: "09", name: "September"}, {val: "10", name: "Oktober"},
            {val: "11", name: "November"}, {val: "12", name: "Desember"}
        ];

        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        let bulanHTML = `<option value="Semua">Semua Bulan</option>`;
        months.forEach(m => {
            bulanHTML += `<option value="${m.val}" ${m.val === currentMonth ? 'selected' : ''}>${m.name}</option>`;
        });
        bulanSelect.innerHTML = bulanHTML;
    }

    function filterAndRender() {
        const thn = document.getElementById("filterTahun").value;
        const bln = document.getElementById("filterBulan").value;
        const jenis = document.getElementById("filterJenis").value;
        const wallet = document.getElementById("filterWallet").value;

        // Filter Transaksi Berdasarkan Kontrol Atas
        let filtered = allTransactions.filter(t => {
            const [tThn, tBln] = t.tanggal.split("-");
            const matchThn = (thn === "Semua" || tThn === thn);
            const matchBln = (bln === "Semua" || tBln === bln);
            const matchJenis = (jenis === "Semua" || t.tipe === jenis);
            const matchWallet = (wallet === "Semua" || t.darivallet === wallet || t.kewallet === wallet);

            return matchThn && matchBln && matchJenis && matchWallet;
        });

        renderSidebarCategories(filtered);
        renderRightTransactions(filtered);
    }

    function renderSidebarCategories(filteredTrx) {
        const sidebar = document.getElementById("listKategoriSidebar");
        
        let catMap = {};
        let totalSemuaNominal = 0;

        filteredTrx.forEach(t => {
            let cat = (!t.kategori || t.kategori === "undefined") ? "Tanpa Kategori" : t.kategori;
            const jumlah = Number(t.jumlah || 0);

            if (!catMap[cat]) catMap[cat] = { count: 0, total: 0 };
            catMap[cat].count++;
            catMap[cat].total += jumlah;

            totalSemuaNominal += jumlah;
        });

        // Opsi "Semua Kategori"
        let html = `
            <div class="p-2.5 rounded-lg cursor-pointer transition text-xs flex flex-col space-y-0.5 ${selectedCategory === 'Semua' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'hover:bg-gray-100 text-gray-700'}" onclick="selectCategory('Semua')">
                <span class="font-medium">Semua Kategori (${filteredTrx.length})</span>
                <span class="text-emerald-700 text-[11px] font-semibold">Rp ${totalSemuaNominal.toLocaleString('id-ID')}</span>
            </div>
        `;

        // Daftar tiap-tiap kategori
        for (const [catName, data] of Object.entries(catMap)) {
            const isActive = (selectedCategory === catName);
            const totalRp = data.total.toLocaleString('id-ID');

            html += `
                <div class="p-2.5 rounded-lg cursor-pointer transition text-xs flex flex-col space-y-0.5 ${isActive ? 'bg-emerald-100 text-emerald-800 font-bold' : 'hover:bg-gray-100 text-gray-700'}" onclick="selectCategory('${catName}')">
                    <span class="truncate font-medium">${catName} (${data.count})</span>
                    <span class="text-gray-500 text-[11px] font-semibold">Rp ${totalRp}</span>
                </div>
            `;
        }

        sidebar.innerHTML = html;
    }

    window.selectCategory = function(catName) {
        selectedCategory = catName;
        filterAndRender();
    };

    function renderRightTransactions(filteredTrx) {
        const container = document.getElementById("listTransaksiContainer");
        const counter = document.getElementById("counterTransaksi");
        const judul = document.getElementById("judulDaftarTransaksi");

        let finalTrx = filteredTrx;
        if (selectedCategory !== "Semua") {
            finalTrx = filteredTrx.filter(t => {
                const cat = (!t.kategori || t.kategori === "undefined") ? "Tanpa Kategori" : t.kategori;
                return cat === selectedCategory;
            });
            judul.innerText = `Kategori: ${selectedCategory}`;
        } else {
            judul.innerText = "Daftar Transaksi";
        }

        if (counter) {
            counter.innerText = `${finalTrx.length} item`;
        }

        if (finalTrx.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Tidak ada transaksi ditemukan.</p>`;
            return;
        }

        let html = "";
        finalTrx.forEach(t => {
            const isExpense = t.tipe === "Expense";
            const isTransfer = t.tipe === "Transfer";
            const colorClass = isExpense ? "text-rose-600" : (isTransfer ? "text-blue-600" : "text-emerald-600");
            const sign = isExpense ? "- " : (isTransfer ? "" : "+ ");
            const nominal = Number(t.jumlah || 0).toLocaleString('id-ID');
            
            const kategoriNama = (!t.kategori || t.kategori === "undefined") ? "Umum" : t.kategori;
            
            let walletInfo = "";
            if (isTransfer) {
                const dariW = t.darivallet || "-";
                const keW = t.kewallet || "-";
                walletInfo = `Transfer: ${dariW} → ${keW}`;
            } else {
                walletInfo = t.darivallet || t.kewallet || "-";
            }
            
            html += `
                <div class="p-3.5 bg-gray-50 hover:bg-gray-100 border rounded-xl cursor-pointer transition flex flex-col space-y-1.5" onclick='openDetailModal(${JSON.stringify(t)})'>
                    <div class="text-[11px] text-gray-400 font-medium">
                        ${t.tanggal}
                    </div>
                    <div class="text-xs font-semibold text-gray-700">
                        ${kategoriNama}
                    </div>
                    <div class="text-xs text-gray-500 font-medium">
                        ${walletInfo}
                    </div>
                    <div class="text-sm font-bold ${colorClass} pt-1">
                        ${sign}Rp ${nominal}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Modal Handler & Logic Edit/Delete
    window.openDetailModal = function(trx) {
        const editId = document.getElementById("editId");
        const editTanggal = document.getElementById("editTanggal");
        const editTipe = document.getElementById("editTipe");
        const editJumlah = document.getElementById("editJumlah");
        const editCatatan = document.getElementById("editCatatan");

        if (editId) editId.value = trx.transactionid;
        if (editTanggal) editTanggal.value = trx.tanggal;
        if (editTipe) editTipe.value = trx.tipe;
        if (editJumlah) editJumlah.value = trx.jumlah;
        if (editCatatan) editCatatan.value = trx.catatan || "";
        
        // Atur tampilan field Ke Wallet berdasarkan tipe transaksi saat modal dibuka
        const wrapperKe = document.getElementById("wrapperKeWallet");
        const labelDari = document.getElementById("labelDariWallet");
        if (trx.tipe === "Transfer") {
            if (wrapperKe) wrapperKe.classList.remove("hidden");
            if (labelDari) labelDari.innerText = "Dari Wallet";
        } else {
            if (wrapperKe) wrapperKe.classList.add("hidden");
            if (labelDari) labelDari.innerText = "Wallet";
        }

        if(trx.darivallet) {
            const el = document.getElementById("editDariWallet");
            if(el) el.value = trx.darivallet;
        }
        if(trx.kewallet) {
            const el = document.getElementById("editKeWallet");
            if(el) el.value = trx.kewallet;
        }

        const catSelect = document.getElementById("editKategori");
        if (catSelect) {
            catSelect.innerHTML = allCategories.map(c => `<option value="${c.namakategori || c.nama}" ${(c.namakategori || c.nama) === trx.kategori ? 'selected' : ''}>${c.namakategori || c.nama}</option>`).join('');
        }

        setFormEnabled(false);
        const modal = document.getElementById("modalTransaksi");
        if (modal) modal.classList.remove("hidden");
    };

    const btnClose = document.getElementById("btnModalClose");
    if (btnClose) {
        btnClose.addEventListener("click", () => {
            document.getElementById("modalTransaksi").classList.add("hidden");
        });
    }

    const btnEdit = document.getElementById("btnModalEdit");
    if (btnEdit) {
        btnEdit.addEventListener("click", () => {
            setFormEnabled(true);
        });
    }

    function setFormEnabled(enabled) {
        const fields = ["editTanggal", "editTipe", "editJumlah", "editDariWallet", "editKeWallet", "editKategori", "editCatatan"];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.disabled = !enabled;
                if(enabled) {
                    el.classList.remove("bg-gray-100");
                    el.classList.add("bg-white");
                } else {
                    el.classList.add("bg-gray-100");
                    el.classList.remove("bg-white");
                }
            }
        });

        const actionContainer = document.getElementById("actionContainer");
        if(actionContainer) {
            if(enabled) {
                actionContainer.classList.remove("hidden");
            } else {
                actionContainer.classList.add("hidden");
            }
        }
    }

    // Tombol Delete di Modal
    const btnDelete = document.getElementById("btnModalDelete");
    if (btnDelete) {
        btnDelete.addEventListener("click", async () => {
            const id = document.getElementById("editId").value;
            if(confirm("Yakin ingin menghapus transaksi ini?")) {
                try {
                    const res = await fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({ 
                            action: 'deleteTransaction', 
                            transactionid: id,
                            id: id 
                        })
                    });
                    const result = await res.json();
                    if(result.success) {
                        alert("Transaksi berhasil dihapus!");
                        document.getElementById("modalTransaksi").classList.add("hidden");
                        loadData();
                    } else {
                        alert("Gagal menghapus: " + result.message);
                    }
                } catch(e) {
                    console.error(e);
                    alert("Terjadi kesalahan jaringan.");
                }
            }
        });
    }

    // Event listener untuk Submit Form Edit Transaksi
    const formDetail = document.getElementById("formDetailTransaksi");
    if (formDetail) {
        formDetail.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const id = document.getElementById("editId").value;
            const tanggal = document.getElementById("editTanggal").value;
            const tipe = document.getElementById("editTipe").value;
            const jumlah = document.getElementById("editJumlah").value;
            const dariWallet = document.getElementById("editDariWallet").value;
            const keWallet = document.getElementById("editKeWallet").value;
            const kategori = document.getElementById("editKategori").value;
            const catatan = document.getElementById("editCatatan").value;

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'editTransaction',
                        transactionid: id,
                        id: id,
                        tanggal: tanggal,
                        tipe: tipe,
                        darivallet: dariWallet,
                        dariWallet: dariWallet,
                        kewallet: keWallet,
                        keWallet: keWallet,
                        kategori: kategori,
                        jumlah: jumlah,
                        catatan: catatan
                    })
                });
                const result = await res.json();
                if(result.success) {
                    alert("Transaksi berhasil diperbarui!");
                    document.getElementById("modalTransaksi").classList.add("hidden");
                    loadData();
                } else {
                    alert("Gagal memperbarui: " + result.message);
                }
            } catch(err) {
                console.error(err);
                alert("Terjadi kesalahan jaringan saat menyimpan perubahan.");
            }
        });
    }
});
