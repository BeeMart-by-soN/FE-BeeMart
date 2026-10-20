async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role     = document.getElementById('role').value;

    if (!username) { 
        showToast('Username wajib diisi', 'error'); 
        return; 
    }

    if (!password) { 
        showToast('Password wajib diisi', 'error'); 
        return; 
    }

    if (!role) {
        showToast('Role wajib dipilih', 'error');
        return; 
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';

    try {
        const { ok, data } = await apiFetch('/auth/login', {
            method: 'POST',
            auth: false,
            body: { username, password, role }
        });

        if (!ok || !data || !data.success) {
            showToast(data?.message || 'Login gagal', 'error');
            return;
        }

        const user = data.data;
        setSession(user);

        showToast('Login berhasil!', 'success');

        const r = (user.role || role).toLowerCase();
        setTimeout(() => {
            if (r === 'admin') window.location.href = 'admin/dashboard.html';
            else window.location.href = 'cashier/dashboard.html';
        }, 600);
    } catch (err) {
        console.error('Login error:', err);
        showToast('Terjadi kesalahan saat login', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

// Register
async function handleRegister(e) {
    e.preventDefault();

    const username   = document.getElementById('username').value.trim();
    const fullName   = document.getElementById('fullName').value.trim();
    const password   = document.getElementById('password').value;
    const rePassword = document.getElementById('rePassword').value;
    const role       = document.getElementById('role').value;

    // Validasi klien
    if (!username)   { showToast('Username wajib diisi', 'error'); return; }
    if (!fullName)   { showToast('Full Name wajib diisi', 'error'); return; }
    if (!password)   { showToast('Password wajib diisi', 'error'); return; }
    if (!rePassword) { showToast('Re-Password wajib diisi', 'error'); return; }
    if (!role)       { showToast('Role wajib dipilih', 'error'); return; }

    if (password !== rePassword) {
        showToast('Password dan Re-Password tidak cocok', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';

    try {
        const { ok, data } = await apiFetch('/auth/register', {
            method: 'POST',
            auth: false,
            body: { username, fullName, password, rePassword, role }
        });

        if (!ok || !data || !data.success) {
            showToast(data?.message || 'Registrasi gagal', 'error');
            return;
        }

        showToast('Registrasi berhasil! Silakan login.', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } catch (err) {
        console.error('Register error:', err);
        showToast('Terjadi kesalahan saat registrasi', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Daftar';
    }
}
