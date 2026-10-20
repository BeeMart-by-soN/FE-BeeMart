/* =========================================================================
   common.js — helper bersama untuk seluruh halaman BeeMart (FE - AMJS)
   Berisi: konfigurasi API, auth (JWT), toast, format Rupiah, jam WIB real-time.
   Frontend HANYA consumer API — tidak ada akses DB langsung.
   ========================================================================= */

// Base URL API (Backend S1). Sesuaikan port bila berbeda.
// Backend berjalan di http://localhost:5077 (lihat S1/Properties/launchSettings.json)
const API_BASE_URL = 'http://localhost:5077/api/v1';

// ------------------------- Session / Auth helpers -------------------------

function setSession(user) {
    localStorage.setItem('beemart_user', JSON.stringify(user));
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('beemart_user'));
    } catch {
        return null;
    }
}

function getToken() {
    const u = getCurrentUser();
    return u ? u.token : null;
}

function clearSession() {
    localStorage.removeItem('beemart_user');
}

/**
 * Guard halaman: pastikan user sudah login. Bila belum -> redirect ke login.
 * Kembalikan objek user bila valid, null bila redirect terjadi.
 */
function requireAuth() {
    const user = getCurrentUser();
    if (!user || !user.token) {
        showToast('Anda harus login terlebih dahulu', 'error');
        setTimeout(() => { window.location.href = resolveLoginUrl(); }, 800);
        return null;
    }
    return user;
}

// Hitung URL login relatif terhadap lokasi halaman saat ini.
function resolveLoginUrl() {
    const path = window.location.pathname;
    // bila berada di subfolder (mis. /cashier/ atau /admin/), naik satu level
    if (/\/(cashier|admin)\//i.test(path)) return '../index.html';
    return 'index.html';
}

// ------------------------------ API fetch ---------------------------------

/**
 * Wrapper fetch yang menambahkan Authorization Bearer & mem-parsing ApiResponse
 * { success, message, data }. Mengembalikan { ok, status, data }.
 * @param {string} path  path relatif setelah /api/v1 (mis. '/auth/login')
 * @param {object} opts  { method, body, auth=true }
 */
async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let res;
    try {
        res = await fetch(API_BASE_URL + path, opts);
    } catch (networkErr) {
        return { ok: false, status: 0, data: { success: false, message: 'Tidak dapat terhubung ke server. Pastikan API berjalan.', data: null } };
    }

    const contentType = res.headers.get('Content-Type') || '';
    let data;
    if (contentType.includes('application/json')) {
        data = await res.json();
    } else {
        const text = await res.text();
        data = { success: false, message: text || `HTTP ${res.status}`, data: null };
    }

    // 401 -> sesi habis/tidak valid -> logout otomatis
    if (auth && res.status === 401 && !path.startsWith('/auth/login')) {
        clearSession();
    }

    return { ok: res.ok, status: res.status, data };
}

// ------------------------------ Toast -------------------------------------

// Sisipkan container toast sekali saja
function ensureToastContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'toast-container';
        document.body.appendChild(c);
    }
    return c;
}

/**
 * Tampilkan toast notifikasi.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info', duration = 3500) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // animasi tampil
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// --------------------------- Format helpers -------------------------------

/** Format angka ke Rupiah: 35000 -> "Rp 35.000" (pemisah ribuan titik, id-ID). */
function formatRupiah(num) {
    const n = Number(num) || 0;
    return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

/** Format berat: tampilkan apa adanya tanpa menebak unit. */
function formatWeight(w) {
    const n = Number(w) || 0;
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/**
 * Format datetime WIB ke "yyyy-MM-dd HH:mm" untuk tabel riwayat.
 * Server menyimpan waktu WIB (tanpa offset), sehingga ditampilkan apa adanya.
 */
function formatWibDateTime(dt) {
    const d = new Date(dt);
    if (isNaN(d)) return '-';
    const pad = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ----------------------------- WIB clock ----------------------------------

/**
 * Mulai jam real-time WIB (Asia/Jakarta) pada elemen target.
 * Update tiap detik. Memakai Intl dengan timeZone Asia/Jakarta sehingga
 * selalu menampilkan waktu WIB terlepas dari zona waktu browser.
 */
function startWibClock(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const update = () => {
        el.textContent = new Date().toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };
    update();
    setInterval(update, 1000);
}
