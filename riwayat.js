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
            // Mengirim action sebagai parameter URL (query string) pada method POST
            // Ini dijamin cocok dengan cara Code.gs membaca e.parameter
            const callAPI = async (actionName) => {
                const url = `${API_URL}?action=${actionName}`;
                const res = await fetch(url, {
                    method: 'POST'
                });
                return await res.json();
            };

            const [resTrx, resWallet, resCat] = await Promise.all([
                callAPI('getTransactions'),
                callAPI('getWallets'),
                callAPI('getCategories')
            ]);

            console.log("Response Transaksi dari Server:", resTrx);
            console.log("Response Wallet dari Server:", resWallet);
            console.log("Response Kategori dari Server:", resCat);

            allTransactions = resTrx.data || [];
            allWallets = resWallet.data || [];
            allCategories = resCat.data || [];

            populateWalletDropdowns();
            filterAndRender();
        } catch (err) {
            console.error("Gagal memuat data:", err);
            alert("Gagal memuat data dari server.");
        }
    }

    function populateWalletDropdowns() {
        const filterWallet = document.getElementById("filterWallet");
        const editDari = document.getElementById("editDariWallet");
        const editKe = document.getElementById("editKeWallet");

        let walletOptions = `<option value="Semua">Semua Wallet</option>`;
        let editOptions = ``;

        allWallets.forEach(w => {
            walletOptions += `<option value="${w.nama}">${w.nama}</option>`;
            editOptions += `<option value="${w.nama}">${w.nama}</option>`;
        });

        filterWallet.innerHTML = walletOptions;
        editDari.innerHTML = editOptions;
        editKe.innerHTML = editOptions;
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

        // 1. Filter Transaksi Berdasarkan Kontrol Atas
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
        
        // Hitung total per kategori
        let catMap = {};
        filteredTrx.forEach(t => {
            let cat = t.kategori || "Tanpa Kategori";
            if (!catMap[cat]) catMap[cat] = { count: 0, total: 0 };
            catMap[cat].count++;
            catMap[cat].total += Number(t.jumlah || 0);
        });

        let html = `
            <div class="p-2 rounded-lg cursor-pointer transition text-xs font-medium flex justify-between items-center ${selectedCategory === 'Semua' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'hover:bg-gray-100 text-gray-700'}" onclick="selectCategory('Semua')">
                <span>Semua Kategori</span>
                <span class="text-gray-500">${filteredTrx.length}</span>
            </div>
        `;

        for (const [catName, data] of Object.entries(catMap)) {
            const isActive = (selectedCategory === catName);
            html += `
                <div class="p-2 rounded-lg cursor-pointer transition text-xs flex justify-between items-center ${isActive ? 'bg-emerald-100 text-emerald-800 font-bold' : 'hover:bg-gray-100 text-gray-700'}" onclick="selectCategory('${catName}')">
                    <span class="truncate pr-2">${catName}</span>
                    <span class="text-gray-500 text-[10px]">${data.count}</span>
                </div>
            `;
        }

        sidebar.innerHTML = html;
    }

    // Fungsi global agar bisa dipanggil dari onclick HTML sidebar
    window.selectCategory = function(catName) {
        selectedCategory = catName;
        filterAndRender();
    };

    function renderRightTransactions(filteredTrx) {
        const container = document.getElementById("listTransaksiContainer");
        const counter = document.getElementById("counterTransaksi");
        const judul = document.getElementById("judulDaftarTransaksi");

        // Filter lanjutan jika kategori di kiri diklik
        let finalTrx = filteredTrx;
        if (selectedCategory !== "Semua") {
            finalTrx = filteredTrx.filter(t => (t.kategori || "Tanpa Kategori") === selectedCategory);
            judul.innerText = `Kategori: ${selectedCategory}`;
        } else {
            judul.innerText = "Daftar Transaksi";
        }

        counter.innerText = `${finalTrx.length} item`;

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
            const nominal = Number(t.jumlah).toLocaleString('id-ID');
            
            // Format ringkas: Tanggal, Catatan, Nilai
            html += `
                <div class="p-3 bg-gray-50 hover:bg-gray-100 border rounded-xl flex justify-between items-center cursor-pointer transition" onclick='openDetailModal(${JSON.stringify(t)})'>
                    <div>
                        <div class="text-[11px] text-gray-400 mb-0.5">${t.tanggal} • <span class="font-medium text-gray-600">${t.kategori || 'Umum'}</span></div>
                        <div class="text-sm font-medium text-gray-800">${t.catatan || '(Tanpa Catatan)'}</div>
                        ${isTransfer ? `<div class="text-[10px] text-blue-500 mt-0.5">${t.darivallet} → ${t.kewallet}</div>` : `<div class="text-[10px] text-gray-500 mt-0.5">${t.darivallet || t.kewallet || ''}</div>`}
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-bold ${colorClass}">${sign}Rp ${nominal}</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Modal Handler & Logic Edit/Delete
    window.openDetailModal = function(trx) {
        document.getElementById("editId").value = trx.transactionid;
        document.getElementById("editTanggal").value = trx.tanggal;
        document.getElementById("editTipe").value = trx.tipe;
        document.getElementById("editJumlah").value = trx.jumlah;
        document.getElementById("editCatatan").value = trx.catatan || "";
        
        if(trx.darivallet) document.getElementById("editDariWallet").value = trx.darivallet;
        if(trx.kewallet) document.getElementById("editKeWallet").value = trx.kewallet;

        const catSelect = document.getElementById("editKategori");
        catSelect.innerHTML = allCategories.map(c => `<option value="${c.nama}" ${c.nama === trx.kategori ? 'selected' : ''}>${c.nama}</option>`).join('');

        setFormEnabled(false);
        document.getElementById("modalTransaksi").classList.remove("hidden");
    };

    document.getElementById("btnModalClose").addEventListener("click", () => {
        document.getElementById("modalTransaksi").classList.add("hidden");
    });

    document.getElementById("btnModalEdit").addEventListener("click", () => {
        setFormEnabled(true); // Aktifkan input agar bisa diedit
    });

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
        if(enabled) {
            actionContainer.classList.remove("hidden");
        } else {
            actionContainer.classList.add("hidden");
        }
    }

    // Tombol Delete di Modal
    document.getElementById("btnModalDelete").addEventListener("click", async () => {
        const id = document.getElementById("editId").value;
        if(confirm("Yakin ingin menghapus transaksi ini?")) {
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'deleteTransaction', transactionid: id })
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

    // Event listener untuk Submit Form Edit Transaksi
    document.getElementById("formDetailTransaksi").addEventListener("submit", async (e) => {
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
                    tanggal: tanggal,
                    tipe: tipe,
                    darivallet: dariWallet,
                    kewallet: keWallet,
                    kategori: kategori,
                    jumlah: jumlah,
                    catatan: catatan
                })
            });
            const result = await res.json();
            if(result.success) {
                alert("Transaksi berhasil diperbarui!");
                document.getElementById("modalTransaksi").classList.add("hidden");
                loadData(); // Reload data terbaru
            } else {
                alert("Gagal memperbarui: " + result.message);
            }
        } catch(err) {
            console.error(err);
            alert("Terjadi kesalahan jaringan saat menyimpan perubahan.");
        }
    });
});
