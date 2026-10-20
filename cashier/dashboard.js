// API Configuration
const API_BASE_URL = 'http://localhost:5077/api';

// Global Variables
let cart = [];
let selectedProduct = null;
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

// Initialize Page
function initializePage() {
    // Get current user from localStorage
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        alert('Anda harus login terlebih dahulu');
        window.location.href = '../index.html';
        return;
    }

    // Display cashier name
    document.getElementById('cashierName').textContent = `Kasir: ${currentUser.fullName || currentUser.username}`;
    
    // Update date and time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Generate invoice number
    generateInvoiceNumber();
    
    // Load payment methods
    loadPaymentMethods();
    
    // Load transaction history
    loadTransactionHistory();
}

// Update Date and Time
function updateDateTime() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    };
    const dateTimeString = now.toLocaleString('id-ID', options);
    document.getElementById('currentDateTime').textContent = dateTimeString;
}

// Generate Invoice Number
function generateInvoiceNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const invoiceNumber = `${timestamp}${random}`;
    document.getElementById('invoiceNumber').textContent = invoiceNumber;
}

// Switch Tab
function switchTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all buttons
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Reload history if switching to history tab
    if (tabName === 'history-transaction') {
        loadTransactionHistory();
    }
}

// Handle Search on Enter key
function handleSearch(event) {
    if (event.key === 'Enter') {
        const searchTerm = event.target.value.trim();
        if (searchTerm.length > 0) {
            searchProducts(searchTerm);
        }
    }
}

// Search Products
async function searchProducts(searchTerm) {
    try {
        const response = await fetch(`${API_BASE_URL}/Product`);
        
        if (!response.ok) {
            throw new Error('Gagal mengambil data produk');
        }
        
        const products = await response.json();
        
        // Filter products by search term (case insensitive)
        const filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 10); // Maximum 10 results
        
        displaySearchResults(filteredProducts);
        
    } catch (error) {
        console.error('Error searching products:', error);
        alert('Terjadi kesalahan saat mencari produk: ' + error.message);
    }
}

// Display Search Results
function displaySearchResults(products) {
    const searchResults = document.getElementById('searchResults');
    const searchResultsBody = document.getElementById('searchResultsBody');
    
    // Clear previous results
    searchResultsBody.innerHTML = '';
    
    if (products.length === 0) {
        searchResultsBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tidak ada produk ditemukan</td></tr>';
        searchResults.style.display = 'block';
        return;
    }
    
    // Display results
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.weight || 'N/A'}</td>
            <td>${product.stock}</td>
            <td>Rp ${formatNumber(product.price)}</td>
            <td>${product.discount || 0}%</td>
            <td><button class="btn-pilih" onclick='selectProduct(${JSON.stringify(product)})'>Pilih</button></td>
        `;
        searchResultsBody.appendChild(row);
    });
    
    searchResults.style.display = 'block';
}

// Format Number with thousands separator
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Select Product (Open Modal)
function selectProduct(product) {
    selectedProduct = product;
    
    // Fill modal with product info
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductPrice').textContent = `Rp ${formatNumber(product.price)}`;
    document.getElementById('modalProductStock').textContent = product.stock;
    document.getElementById('qtyInput').value = 1;
    document.getElementById('qtyInput').max = product.stock;
    
    // Show modal
    document.getElementById('productModal').style.display = 'block';
}

// Close Modal
function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    selectedProduct = null;
}

// Add to Cart
function addToCart() {
    if (!selectedProduct) return;
    
    const qty = parseInt(document.getElementById('qtyInput').value);
    
    // Validate quantity
    if (qty <= 0) {
        alert('Jumlah barang harus lebih dari 0');
        return;
    }
    
    if (qty > selectedProduct.stock) {
        alert('Jumlah barang yang dimasukkan melebihi sisa stok.');
        return;
    }
    
    // Check if product already in cart
    const existingItemIndex = cart.findIndex(item => item.id === selectedProduct.id);
    
    if (existingItemIndex !== -1) {
        // Update quantity if product already in cart
        const newQty = cart[existingItemIndex].qty + qty;
        
        if (newQty > selectedProduct.stock) {
            alert('Jumlah barang yang dimasukkan melebihi sisa stok.');
            return;
        }
        
        cart[existingItemIndex].qty = newQty;
        cart[existingItemIndex].subtotal = calculateSubtotal(
            cart[existingItemIndex].price,
            cart[existingItemIndex].discount,
            newQty
        );
    } else {
        // Add new item to cart
        const subtotal = calculateSubtotal(selectedProduct.price, selectedProduct.discount || 0, qty);
        
        cart.push({
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            discount: selectedProduct.discount || 0,
            qty: qty,
            subtotal: subtotal
        });
    }
    
    // Update cart display
    displayCart();
    
    // Close modal
    closeModal();
}

// Calculate Subtotal with discount
function calculateSubtotal(price, discount, qty) {
    const discountAmount = (price * discount) / 100;
    const priceAfterDiscount = price - discountAmount;
    return priceAfterDiscount * qty;
}

// Display Cart
function displayCart() {
    const cartBody = document.getElementById('cartBody');
    cartBody.innerHTML = '';
    
    if (cart.length === 0) {
        cartBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Keranjang kosong</td></tr>';
        updateTotal();
        return;
    }
    
    cart.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>Rp ${formatNumber(item.price)}</td>
            <td>${item.discount}%</td>
            <td>${item.qty}</td>
            <td>Rp ${formatNumber(item.subtotal)}</td>
            <td><button class="btn-hapus" onclick="removeFromCart(${index})">Hapus</button></td>
        `;
        cartBody.appendChild(row);
    });
    
    updateTotal();
}

// Remove from Cart
function removeFromCart(index) {
    cart.splice(index, 1);
    displayCart();
}

// Update Total
function updateTotal() {
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    document.getElementById('totalAmount').textContent = `Rp ${formatNumber(total)}`;
}

// Load Payment Methods
async function loadPaymentMethods() {
    try {
        // Simulate payment methods API (you may need to adjust based on actual API)
        const paymentMethods = [
            { id: 1, name: 'Cash' },
            { id: 2, name: 'Debit Card' },
            { id: 3, name: 'Credit Card' },
            { id: 4, name: 'E-Wallet' }
        ];
        
        const select = document.getElementById('paymentMethod');
        select.innerHTML = '';
        
        paymentMethods.forEach(method => {
            const option = document.createElement('option');
            option.value = method.name;
            option.textContent = method.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading payment methods:', error);
        alert('Gagal memuat metode pembayaran');
    }
}

// Submit Transaction
async function submitTransaction() {
    // Validate cart
    if (cart.length === 0) {
        alert('Keranjang masih kosong. Tambahkan produk terlebih dahulu.');
        return;
    }
    
    // Validate payment method
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (!paymentMethod) {
        alert('Pilih metode pembayaran terlebih dahulu.');
        return;
    }
    
    // Get invoice number
    const invoiceNumber = document.getElementById('invoiceNumber').textContent;
    
    // Calculate total
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Prepare transaction data
    const transactionData = {
        invoiceNumber: invoiceNumber,
        items: cart,
        paymentMethod: paymentMethod,
        total: total,
        cashierId: currentUser.id,
        cashierName: currentUser.fullName || currentUser.username,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Save to localStorage (since there's no transaction API endpoint specified)
        let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        transactions.push(transactionData);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        
        // Show success message
        alert(`Transaksi berhasil!\nInvoice No: ${invoiceNumber}\nTotal: Rp ${formatNumber(total)}`);
        
        // Reset transaction page
        resetTransaction();
        
    } catch (error) {
        console.error('Error submitting transaction:', error);
        alert('Terjadi kesalahan saat menyimpan transaksi: ' + error.message);
    }
}

// Reset Transaction
function resetTransaction() {
    // Clear cart
    cart = [];
    displayCart();
    
    // Clear search
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').style.display = 'none';
    
    // Generate new invoice number
    generateInvoiceNumber();
    
    // Reset payment method
    document.getElementById('paymentMethod').selectedIndex = 0;
}

// Load Transaction History
function loadTransactionHistory() {
    const historyBody = document.getElementById('historyBody');
    historyBody.innerHTML = '';
    
    // Get transactions from localStorage
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    
    if (transactions.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Belum ada transaksi</td></tr>';
        return;
    }
    
    // Display transactions (reverse order - newest first)
    transactions.reverse().forEach((transaction, index) => {
        const itemNames = transaction.items.map(item => item.name).join(', ');
        const totalQty = transaction.items.reduce((sum, item) => sum + item.qty, 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transactions.length - index}</td>
            <td>${transaction.invoiceNumber}</td>
            <td>${itemNames}</td>
            <td>${totalQty}</td>
            <td>${transaction.paymentMethod}</td>
            <td>Rp ${formatNumber(transaction.total)}</td>
            <td>${new Date(transaction.timestamp).toLocaleString('id-ID')}</td>
        `;
        historyBody.appendChild(row);
    });
}

// Logout
function logout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = '../index.html';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) {
        closeModal();
    }
}
