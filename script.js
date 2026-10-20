// API Configuration
const API_BASE_URL = 'http://localhost:5077/api';

// Normalize API response — backend may wrap array in { $values, data, users, ... }
function normalizeArray(raw) {
    if (Array.isArray(raw)) return raw;
    return raw.$values ?? raw.data ?? raw.users ?? [];
}

// Read error body safely — backend may return JSON or plain text
async function readErrorBody(response) {
    const contentType = response.headers.get('Content-Type') || '';
    try {
        if (contentType.includes('application/json')) {
            const json = await response.json();
            if (json.message) return json.message;
            if (json.title)   return json.title;
            if (json.errors)  return JSON.stringify(json.errors);
            return JSON.stringify(json);
        }
        return await response.text();
    } catch {
        return `HTTP ${response.status}`;
    }
}

// Login Function — validasi kosong di FE, validasi kredensial di BE
async function afterLogin(e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    // Validasi FE: field kosong
    if (!username) { alert("Username wajib diisi!"); return; }
    if (!password) { alert("Password wajib diisi!"); return; }

    try {
        const response = await fetch(`${API_BASE_URL}/Auth/Login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const msg = await readErrorBody(response);
            throw new Error(msg);
        }

        // Response shape: { statusCode, requestMethod, data: { token, expiresAt, idUser, username, fullName, role } }
        const result = await response.json();
        const user   = result.data;

        // Simpan data user ke localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));

        // Redirect berdasarkan role dari backend
        const role = (user.role || '').toLowerCase();
        if (role === 'admin') {
            window.location.href = 'admin/dashboard.html';
        } else if (role === 'cashier') {
            window.location.href = 'cashier/dashboard.html';
        } else {
            alert('Role tidak dikenali: ' + user.role);
        }

    } catch (error) {
        console.error('Login error:', error);
        alert('Login gagal: ' + error.message);
    }
}

// Register Function
async function handleRegister(e) {
    e.preventDefault();

    const username   = document.getElementById("username").value.trim();
    const fullName   = document.getElementById("fullName").value.trim();
    const password   = document.getElementById("password").value;
    const rePassword = document.getElementById("rePassword").value;
    const role       = document.getElementById("role").value;

    // Validasi: semua field wajib diisi
    if (!username)   { alert("Username wajib diisi!");    return; }
    if (!fullName)   { alert("Full Name wajib diisi!");   return; }
    if (!password)   { alert("Password wajib diisi!");    return; }
    if (!rePassword) { alert("Re-Password wajib diisi!"); return; }

    if (password !== rePassword) {
        alert("Password dan Re-Password tidak cocok!");
        return;
    }

    try {
        // Cek username duplikat
        const checkResponse = await fetch(`${API_BASE_URL}/User`);
        if (!checkResponse.ok) {
            const msg = await readErrorBody(checkResponse);
            throw new Error(msg);
        }

        const existingUsers = normalizeArray(await checkResponse.json());
        const usernameExists = existingUsers.some(
            u => u.username.toLowerCase() === username.toLowerCase()
        );

        if (usernameExists) {
            alert("Username already exists");
            return;
        }

        const userData = {
            username:   username,
            fullname:   fullName,
            password:   password,
            rePassword: rePassword,
            role:       role
        };

        const response = await fetch(`${API_BASE_URL}/User`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(userData)
        });

        if (!response.ok) {
            const msg = await readErrorBody(response);
            throw new Error(msg);
        }

        alert("Registrasi berhasil! Silakan login.");
        window.location.href = "index.html";

    } catch (error) {
        console.error('Registration error:', error);
        alert('Terjadi kesalahan saat registrasi: ' + error.message);
    }
}

function goTo(page) {
    window.location.href = page;
}
