function afterLogin (e) {
    e.preventDefault();
    const roleEl = document.getElementById("role");
    const role = roleEl ? roleEl.value : "cashier";
    window.location.href = role === "admin"
        ? "admin/dashboard.html"
        : "cashier/dashboard.html";
}

function goTo (page) {
    window.location.href = page;
}