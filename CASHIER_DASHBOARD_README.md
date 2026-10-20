# Dashboard Cashier - BeeMart

## Deskripsi
Dashboard Cashier adalah halaman yang digunakan untuk melakukan transaksi pembelian barang di BeeMart. Dashboard ini dapat diakses oleh role **Cashier** dan **Admin**.

## Fitur Utama

### 1. **New Transaction Tab**
Tab ini digunakan untuk melakukan transaksi baru.

#### Fitur:
- **Invoice Number Otomatis**: Setiap transaksi baru akan mendapatkan invoice number yang unik
- **Pencarian Barang**: 
  - Ketik nama barang di kolom pencarian
  - Tekan Enter untuk mencari
  - Sistem akan menampilkan maksimal 10 data yang sesuai
  
- **Pemilihan Barang**:
  - Klik tombol "Pilih" pada barang yang diinginkan
  - Modal akan muncul menampilkan:
    - Nama barang
    - Harga satuan
    - Sisa stok
  - Masukkan jumlah barang (qty)
  - Klik "Masukkan ke Keranjang"
  - Validasi: Jika qty melebihi stok, akan muncul error: "Jumlah barang yang dimasukkan melebihi sisa stok."

- **Daftar Belanjaan (Keranjang)**:
  - Menampilkan semua barang yang sudah dipilih
  - Menghitung subtotal per item (harga setelah diskon × qty)
  - Total keseluruhan ditampilkan di bagian bawah
  - Tombol "Hapus" untuk menghapus item dari keranjang

- **Metode Pembayaran**:
  - Data diambil secara dinamis
  - Pilihan: Cash, Debit Card, Credit Card, E-Wallet

- **Submit Transaksi**:
  - Validasi keranjang tidak kosong
  - Validasi metode pembayaran sudah dipilih
  - Setelah berhasil, halaman akan di-reset
  - Invoice number baru akan di-generate

### 2. **History Transaction Tab**
Tab ini menampilkan riwayat semua transaksi yang telah dilakukan.

#### Informasi yang ditampilkan:
- Nomor urut
- Invoice Number
- Nama barang (semua item dalam transaksi)
- Total quantity
- Metode pembayaran
- Total harga
- Timestamp transaksi

## API Endpoints

### Product API
- **GET** `http://localhost:5077/api/Product`
  - Mendapatkan semua data produk
  - Digunakan untuk pencarian barang

### User API
- **GET** `http://localhost:5077/api/User`
  - Mendapatkan semua data user
  - Digunakan untuk validasi login dan registrasi

- **GET** `http://localhost:5077/api/User/{id}`
  - Mendapatkan data user berdasarkan ID

- **POST** `http://localhost:5077/api/User`
  - Mendaftarkan user baru
  - Request body:
    ```json
    {
      "username": "string",
      "fullName": "string",
      "password": "string (hashed)",
      "role": "Cashier/Admin"
    }
    ```

## Validasi Registrasi

### a. Field Wajib Diisi
- Username
- Full Name
- Password
- Re-Password

Jika salah satu field kosong, sistem akan menampilkan alert.

### b. Password Hashing
Password yang disimpan ke database sudah di-hash menggunakan SHA-256 melalui Web Crypto API.

### c. Username Unik
- Sistem akan mengecek apakah username sudah terdaftar
- Jika username sudah ada, akan muncul error: **"Username already exists"**
- Pengecekan case-insensitive

### d. Validasi Password Match
Password dan Re-Password harus sama.

## Fitur Pencarian Barang

### Validasi:
- Maksimal 10 hasil pencarian ditampilkan
- Pencarian berdasarkan nama barang (case-insensitive)
- Pencarian dilakukan saat user menekan Enter

### Tabel Hasil Pencarian:
- Nama Barang
- Berat
- Stock
- Harga
- Diskon
- Aksi (Tombol "Pilih")

## Fitur Keranjang Belanja

### Validasi:
- **f.** Qty tidak boleh melebihi stok
  - Error: "Jumlah barang yang dimasukkan melebihi sisa stok."
- Subtotal dihitung dengan: (Harga - Diskon) × Qty

### g. Hapus Item
- User dapat menghapus item yang sudah ditambahkan
- Tombol "Hapus" pada setiap baris keranjang

## Fitur Submit Transaksi

### h. Metode Pembayaran Dinamis
- Data metode pembayaran di-fetch dari data statis
- Bisa disesuaikan dengan API jika tersedia

### i. Reset Setelah Submit
- Halaman transaksi akan di-reset ke kondisi awal
- Keranjang dikosongkan
- Pencarian di-clear
- Invoice number baru di-generate
- Metode pembayaran di-reset

## Teknologi yang Digunakan

- **HTML5**: Struktur halaman
- **CSS3**: Styling dan layout
- **Vanilla JavaScript**: Logic dan interaksi
- **Fetch API**: Komunikasi dengan backend
- **Web Crypto API**: Hashing password (SHA-256)
- **LocalStorage**: Menyimpan data user dan transaksi

## Cara Penggunaan

1. **Login**:
   - Masuk dengan username dan password
   - Sistem akan mengecek role dan redirect ke dashboard yang sesuai

2. **Melakukan Transaksi**:
   - Klik tab "New Transaction"
   - Cari barang dengan mengetik nama di kolom pencarian dan tekan Enter
   - Klik tombol "Pilih" pada barang yang diinginkan
   - Masukkan quantity di modal
   - Klik "Masukkan ke Keranjang"
   - Ulangi untuk barang lain
   - Pilih metode pembayaran
   - Klik "Submit Transaksi"

3. **Melihat Riwayat**:
   - Klik tab "History Transaction"
   - Semua transaksi akan ditampilkan dengan detail lengkap

4. **Logout**:
   - Klik tombol "Logout" di navbar
   - Konfirmasi logout
   - Akan redirect ke halaman login

## Keamanan

- Password di-hash sebelum disimpan
- User session disimpan di localStorage
- Validasi di frontend dan backend
- Username unik untuk setiap user

## Catatan Penting

- Pastikan API Backend sudah running di `http://localhost:5077`
- Browser harus support Web Crypto API (modern browsers)
- Data transaksi sementara disimpan di localStorage (bisa disesuaikan dengan API)
- Invoice number menggunakan timestamp + random number untuk uniqueness
