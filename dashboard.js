/* =========================================================================
   dashboard.js — logika halaman New Transaction & History Transaction
   Dipakai bersama oleh role Cashier & Admin. Pemisahan akses data (kasir vs
   semua kasir) ditegakkan di SERVER dari token, bukan dari parameter klien.
   ========================================================================= */

// ------------------------------ State --------------------------------------
let cart = [];            // {idProduct, name, price, discount, qty, subtotal, stock}
let selectedProduct = null;
let currentUser = null;

let historyState = { date: '', page: 1, pageSize: 20, totalPages: 1, totalItems: 0 };

// ------------------------- Initialization ----------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Guard: hanya bisa diakses jika sudah login
    currentUser = requireAuth();
    if (!currentUser) return;

    // Navbar: nama kasir
    const nameEl = document.getElementById('cashierName');
    if (nameEl) nameEl.textContent = `Kasir: ${currentUser.username}`;

    // Header sesi (di tab History)
    renderSessionHeader();

    // Jam real-time WIB
    startWibClock('currentDateTime');

    // Invoice & metode pembayaran
    loadInvoice();
    loadPaymentMethods();

    // Tampilkan keranjang kosong
    renderCart();
});

// ---------------------- Session / role header -----------------------------
function renderSessionHeader() {
    const role = (currentUser.role || '').toLowerCase();
    const roleLabel = role === 'admin' ? 'Admin' : 'Cashier';

    const headerEl = document.getElementById('sessionHeader');
    if (headerEl) {
        // Format persis: "Role: <role> | Login: <username>" (nilai role warna emas)
        headerEl.innerHTML =
            `Role: <span class="role-value">${roleLabel}</span> | Login: ${currentUser.username}`;
    }

    const subtitleEl = document.getElementById('historySubtitle');
    if (subtitleEl) {
        if (role === 'admin') {
            subtitleEl.innerHTML = `<em>Pencarian Data Transaksi <strong>(Menampilkan Semua Kasir)</strong></em>`;
        } else {
            subtitleEl.innerHTML = `<em>Pencarian Data Transaksi <strong>(Hanya Kasir: ${currentUser.username})</strong></em>`;
        }
    }

    // Fitur tambah akun hanya untuk Admin (server tetap menolak bila bukan Admin).
    if (role === 'admin') {
        const section = document.getElementById('registerSection');
        if (section) section.style.display = 'block';
        const navBtn = document.getElementById('navRegisterBtn');
        if (navBtn) navBtn.style.display = 'inline-block';
    }
}

// ----------------------------- Invoice -------------------------------------
async function loadInvoice() {
    const el = document.getElementById('invoiceNumber');
    if (el) el.textContent = 'Loading...';
    const { ok, data } = await apiFetch('/transactions/next-invoice');
    if (ok && data && data.success) {
        el.textContent = data.data.invoiceNo;
    } else {
        el.textContent = '-';
        showToast(data?.message || 'Gagal memuat invoice', 'error');
    }
}

// ------------------------ Payment methods ---------------------------------
async function loadPaymentMethods() {
    const select = document.getElementById('paymentMethod');
    if (!select) return;
    select.innerHTML = '<option value="">Loading...</option>';

    const { ok, data } = await apiFetch('/payment-methods');
    if (!ok || !data || !data.success) {
        select.innerHTML = '<option value="">Gagal memuat</option>';
        showToast(data?.message || 'Gagal memuat metode pembayaran', 'error');
        return;
    }

    const methods = data.data || [];
    select.innerHTML = '';
    methods.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = m.idPaymentMethod;
        opt.textContent = m.methodName;
        if (i === 0) opt.selected = true; // default Cash (data pertama)
        select.appendChild(opt);
    });
}

// --------------------------- Tab switching --------------------------------
function switchTab(tabName, btnEl) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const tab = document.getElementById(tabName);
    if (tab) tab.classList.add('active');
    if (btnEl) btnEl.classList.add('active');
}

// --------------------------- Product search -------------------------------
function handleSearch(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const term = event.target.value.trim();
        if (term.length === 0) {
            showToast('Ketik kata kunci pencarian', 'info');
            return;
        }
        searchProducts(term);
    }
}

async function searchProducts(keyword) {
    const resultsEl = document.getElementById('searchResults');
    const bodyEl = document.getElementById('searchResultsBody');
    if (!resultsEl || !bodyEl) return;

    bodyEl.innerHTML = '<tr><td colspan="6" class="empty-row">Mencari...</td></tr>';
    resultsEl.style.display = 'block';

    const { ok, data } = await apiFetch(`/products/search?keyword=${encodeURIComponent(keyword)}`);
    if (!ok || !data || !data.success) {
        bodyEl.innerHTML = '<tr><td colspan="6" class="empty-row">Gagal mencari produk</td></tr>';
        showToast(data?.message || 'Gagal mencari produk', 'error');
        return;
    }

    const products = data.data || [];
    if (products.length === 0) {
        bodyEl.innerHTML = '<tr><td colspan="6" class="empty-row">Tidak ada produk ditemukan</td></tr>';
        return;
    }

    bodyEl.innerHTML = '';
    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(p.name)}</td>
            <td>${formatWeight(p.weight)}</td>
            <td>${p.stock}</td>
            <td>${formatRupiah(p.price)}</td>
            <td>${p.discount || 0}%</td>
            <td><button class="btn-pilih" data-id="${p.idProduct}">Pilih</button></td>
        `;
        tr.querySelector('.btn-pilih').addEventListener('click', () => selectProduct(p));
        bodyEl.appendChild(tr);
    });
}

// --------------------------- Select product -------------------------------
function selectProduct(product) {
    selectedProduct = product;
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductPrice').textContent = formatRupiah(product.price);
    document.getElementById('modalProductStock').textContent = product.stock;
    const qtyInput = document.getElementById('qtyInput');
    qtyInput.value = 1;
    qtyInput.max = product.stock;
    document.getElementById('productModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    selectedProduct = null;
}

// --------------------------- Add to cart ----------------------------------
function addToCart() {
    if (!selectedProduct) return;

    const qty = parseInt(document.getElementById('qtyInput').value, 10);

    // Validasi klien: qty bilangan bulat >= 1
    if (!Number.isInteger(qty) || qty < 1) {
        showToast('Qty harus bilangan bulat minimal 1', 'error');
        return;
    }

    // Cek stok terhadap jumlah di keranjang (jika produk sudah ada, jumlahkan)
    const existing = cart.find(item => item.idProduct === selectedProduct.idProduct);
    const newTotalQty = (existing ? existing.qty : 0) + qty;

    if (newTotalQty > selectedProduct.stock) {
        showToast('Jumlah barang yang dimasukkan melebihi sisa stok.', 'error');
        return;
    }

    if (existing) {
        existing.qty = newTotalQty;
        existing.subtotal = calcSubtotal(existing.price, existing.discount, existing.qty);
    } else {
        cart.push({
            idProduct: selectedProduct.idProduct,
            name: selectedProduct.name,
            price: selectedProduct.price,
            discount: selectedProduct.discount || 0,
            qty: qty,
            subtotal: calcSubtotal(selectedProduct.price, selectedProduct.discount || 0, qty),
            stock: selectedProduct.stock
        });
    }

    renderCart();
    closeModal();
    showToast('Barang ditambahkan ke keranjang', 'success', 1500);
}

function calcSubtotal(price, discount, qty) {
    const afterDiscount = price * (1 - (discount || 0) / 100);
    return Math.round(afterDiscount * qty * 100) / 100;
}

// --------------------------- Cart render ----------------------------------
function renderCart() {
    const bodyEl = document.getElementById('cartBody');
    if (!bodyEl) return;
    bodyEl.innerHTML = '';

    if (cart.length === 0) {
        bodyEl.innerHTML = '<tr><td colspan="6" class="empty-row">Keranjang kosong</td></tr>';
        updateTotal();
        return;
    }

    cart.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(item.name)}</td>
            <td>${formatRupiah(item.price)}</td>
            <td>${item.discount || 0}%</td>
            <td>${item.qty}</td>
            <td>${formatRupiah(item.subtotal)}</td>
            <td><button class="btn-hapus">Hapus</button></td>
        `;
        tr.querySelector('.btn-hapus').addEventListener('click', () => removeFromCart(index));
        bodyEl.appendChild(tr);
    });

    updateTotal();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function updateTotal() {
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const el = document.getElementById('totalAmount');
    if (el) el.textContent = formatRupiah(total);
}

// --------------------------- Submit transaction ---------------------------
async function submitTransaction() {
    if (cart.length === 0) {
        showToast('Keranjang masih kosong. Tambahkan produk terlebih dahulu.', 'error');
        return;
    }

    const paymentMethodId = parseInt(document.getElementById('paymentMethod').value, 10);
    if (!paymentMethodId) {
        showToast('Pilih metode pembayaran terlebih dahulu.', 'error');
        return;
    }

    const items = cart.map(c => ({ productId: c.idProduct, qty: c.qty }));

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
        const { ok, data } = await apiFetch('/transactions', {
            method: 'POST',
            body: { paymentMethodId, items }
        });

        if (!ok || !data || !data.success) {
            showToast(data?.message || 'Gagal menyimpan transaksi', 'error');
            return;
        }

        const result = data.data;
        showToast(`Transaksi berhasil! Invoice: ${result.invoiceNo} | Total: ${formatRupiah(result.totalPrice)}`, 'success', 5000);
        resetTransaction();
    } catch (err) {
        console.error('Submit error:', err);
        showToast('Terjadi kesalahan saat menyimpan transaksi', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Transaksi';
    }
}

function resetTransaction() {
    cart = [];
    renderCart();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const searchResults = document.getElementById('searchResults');
    if (searchResults) searchResults.style.display = 'none';

    // Reset metode pembayaran ke default (Cash)
    const select = document.getElementById('paymentMethod');
    if (select && select.options.length > 0) select.selectedIndex = 0;

    // Invoice baru
    loadInvoice();
}

// --------------------------- History --------------------------------------
async function searchHistory() {
    const dateInput = document.getElementById('historyDate');
    if (!dateInput) return;

    const date = dateInput.value;
    if (!date) {
        showToast('Pilih tanggal terlebih dahulu sebelum mencari.', 'error');
        return;
    }

    historyState.date = date;
    historyState.page = 1;
    await loadHistory();
}

async function loadHistory() {
    const bodyEl = document.getElementById('historyBody');
    if (!bodyEl) return;

    bodyEl.innerHTML = '<tr><td colspan="6" class="empty-row">Memuat data...</td></tr>';

    const path = `/transactions/history?date=${encodeURIComponent(historyState.date)}&page=${historyState.page}&pageSize=${historyState.pageSize}`;
    const { ok, data } = await apiFetch(path);

    if (!ok || !data || !data.success) {
        bodyEl.innerHTML = '<tr><td colspan="6" class="empty-row">Gagal memuat data</td></tr>';
        showToast(data?.message || 'Gagal memuat riwayat', 'error');
        return;
    }

    const page = data.data;
    historyState.totalItems = page.totalItems;
    historyState.totalPages = page.totalPages;

    const items = page.items || [];
    if (items.length === 0) {
        bodyEl.innerHTML = '<tr><td colspan="6" class="empty-row">Tidak ada transaksi pada tanggal ini</td></tr>';
        renderPagination();
        return;
    }

    bodyEl.innerHTML = '';
    items.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(t.invoiceNo)}</td>
            <td>${formatWibDateTime(t.transactionDate)}</td>
            <td>${escapeHtml(t.cashier)}</td>
            <td>${t.totalQty}</td>
            <td>${escapeHtml(t.paymentMethod)}</td>
            <td>${formatRupiah(t.totalPrice)}</td>
        `;
        bodyEl.appendChild(tr);
    });

    renderPagination();
}

function renderPagination() {
    const pager = document.getElementById('historyPager');
    if (!pager) return;
    pager.innerHTML = '';

    const totalPages = Math.max(historyState.totalPages, 1);
    if (totalPages <= 1) return;

    // Tombol Prev
    if (historyState.page > 1) {
        pager.appendChild(makePageBtn('«', historyState.page - 1));
    }

    // Nomor halaman (tampilkan maks 9 halaman di sekitar halaman aktif)
    let start = Math.max(1, historyState.page - 4);
    let end = Math.min(totalPages, start + 8);
    start = Math.max(1, end - 8);

    for (let p = start; p <= end; p++) {
        pager.appendChild(makePageBtn(String(p), p, p === historyState.page));
    }

    // Tombol Next
    if (historyState.page < totalPages) {
        pager.appendChild(makePageBtn('»', historyState.page + 1));
    }
}

function makePageBtn(label, page, active = false) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (active ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', async () => {
        historyState.page = page;
        await loadHistory();
    });
    return btn;
}

// ----------------------- Tambah akun (Admin) ------------------------------
// Memakai endpoint register yang sama (/api/v1/auth/register). Endpoint tersedia
// untuk Admin yang sudah login; validasi & hashing tetap dilakukan di server.
function openRegisterTab() {
    const historyTabBtn = document.querySelectorAll('.tab-btn')[1];
    switchTab('history-transaction', historyTabBtn);
    setTimeout(() => toggleRegisterForm(true), 0);
}

function toggleRegisterForm(forceOpen) {
    const form = document.getElementById('registerForm');
    if (!form) return;
    const shouldOpen = forceOpen === true ? true : form.style.display === 'none';
    form.style.display = shouldOpen ? 'block' : 'none';
    if (shouldOpen) {
        const input = document.getElementById('regUsername');
        if (input) input.focus();
    }
}

async function handleAdminRegister(e) {
    e.preventDefault();

    const username   = document.getElementById('regUsername').value.trim();
    const fullName   = document.getElementById('regFullName').value.trim();
    const password   = document.getElementById('regPassword').value;
    const rePassword = document.getElementById('regRePassword').value;
    const role       = document.getElementById('regRole').value;

    if (!username)   { showToast('Username wajib diisi', 'error'); return; }
    if (!fullName)   { showToast('Full Name wajib diisi', 'error'); return; }
    if (!password)   { showToast('Password wajib diisi', 'error'); return; }
    if (!rePassword) { showToast('Re-Password wajib diisi', 'error'); return; }
    if (password !== rePassword) {
        showToast('Password dan Re-Password tidak cocok', 'error');
        return;
    }

    const btn = document.getElementById('regSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
        const { ok, data } = await apiFetch('/auth/register', {
            method: 'POST',
            body: { username, fullName, password, rePassword, role }
        });

        if (!ok || !data || !data.success) {
            showToast(data?.message || 'Registrasi gagal', 'error');
            return;
        }

        showToast('Akun berhasil dibuat!', 'success');
        document.getElementById('registerForm').reset();
        toggleRegisterForm(false);
    } catch (err) {
        console.error('Admin register error:', err);
        showToast('Terjadi kesalahan saat registrasi', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Daftar';
    }
}

// ----------------------------- Logout -------------------------------------
function logout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        clearSession();
        window.location.href = resolveLoginUrl();
    }
}

// ----------------------------- Helpers ------------------------------------
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Tutup modal saat klik di luar
window.addEventListener('click', (event) => {
    const modal = document.getElementById('productModal');
    if (event.target === modal) closeModal();
});
