// ==========================================
// 1. VARIABLES & CONFIGURATION
// ==========================================
let products = JSON.parse(localStorage.getItem('shop_products')) || []; 
let sales = JSON.parse(localStorage.getItem('shop_sales')) || [];
let cart = {}; 
let cartPrices = {}; 
let currentFilter = 'Tout';
let searchTerm = ""; 
let editingId = null;
let negotiatingId = null;
let tempImageBase64 = null;
let pendingSale = null;
let chartTrend = null;
let chartPie = null;

let currentPinInput = "";
const DEFAULT_PIN = "8388";
const RESET_PIN = "1999";
let userPin = localStorage.getItem('shop_pin') || DEFAULT_PIN;

// ==========================================
// 2. INITIALISATION (Démarrage)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    sales.forEach(s => { if(s.amountPaid === undefined) { s.amountPaid = s.total; s.status = 'paid'; } });
    products = products.filter(p => p.category !== 'Draps' && p.name !== 'Parure de Draps');
    products.forEach(p => { if (p.totalInput === undefined) p.totalInput = p.stock; });
    
    saveData();
    sortProducts(); 
    renderProducts(); 
    updateStockUI(); 
    updateHistoryUI(); 
    updateDailyTotal();
    
    if (sessionStorage.getItem('is_logged_in')) {
        document.getElementById('lock-screen').style.display = 'none';
    }
});

// ==========================================
// 3. FONCTIONS VITALES (Stock & Navigation)
// ==========================================
window.switchTab = (tabName) => {
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active-tab'); btn.classList.add('inactive-tab');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active-tab');
    document.getElementById(`tab-${tabName}`).classList.remove('inactive-tab');

    const views = ['pos', 'stock', 'history', 'stats'];
    views.forEach(v => document.getElementById(`view-${v}`).style.transform = 'translateX(100%)');
    document.getElementById(`view-${tabName}`).style.transform = 'translateX(0)';
    
    if (tabName === 'stock') updateStockUI();
    if (tabName === 'history') updateHistoryUI();
    if (tabName === 'stats') renderCharts();
};

window.openProductModal = (id = null) => {
    const modal = document.getElementById('productModal');
    const title = modal.querySelector('h3');
    const preview = document.getElementById('image-preview');
    const container = document.getElementById('image-preview-container');
    
    tempImageBase64 = null;
    preview.src = ""; 
    preview.classList.add('hidden'); 
    container.classList.remove('opacity-0');

    if (id) {
        const p = products.find(x => x.id == id);
        if (!p) return;
        editingId = id;
        title.textContent = "Modifier Produit";
        document.getElementById('new-prod-name').value = p.name;
        document.getElementById('new-prod-price').value = p.price;
        document.getElementById('new-prod-stock').value = p.stock;
        document.getElementById('new-prod-cat').value = p.category;
        if (p.image) {
            tempImageBase64 = p.image;
            preview.src = p.image;
            preview.classList.remove('hidden');
            container.classList.add('opacity-0');
        }
    } else {
        editingId = null;
        title.textContent = "Nouveau Produit";
        document.getElementById('new-prod-name').value = "";
        document.getElementById('new-prod-price').value = "";
        document.getElementById('new-prod-stock').value = "";
    }
    modal.classList.remove('hidden');
};

window.saveNewProduct = () => {
    const name = document.getElementById('new-prod-name').value;
    const price = parseInt(document.getElementById('new-prod-price').value);
    const stock = parseInt(document.getElementById('new-prod-stock').value);
    const cat = document.getElementById('new-prod-cat').value;

    if (name && !isNaN(price)) {
        if (editingId) {
            const p = products.find(x => x.id == editingId);
            if (p) {
                p.name = name; p.price = price; p.stock = stock || 0; p.category = cat;
                if (tempImageBase64) p.image = tempImageBase64;
            }
        } else {
            products.push({ id: Date.now(), name, price, stock: stock || 0, totalInput: stock || 0, category: cat, image: tempImageBase64 });
        }
        saveData();
        document.getElementById('productModal').classList.add('hidden');
        renderProducts(); updateStockUI();
    } else {
        alert("Remplir les champs !");
    }
};

window.handleImageUpload = (input) => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 150; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            tempImageBase64 = canvas.toDataURL('image/jpeg', 0.5);
            const preview = document.getElementById('image-preview');
            preview.src = tempImageBase64; preview.classList.remove('hidden');
            document.getElementById('image-preview-container').classList.add('opacity-0');
        }
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// ==========================================
// 4. CAISSE & PRIX (FIX STRING ID)
// ==========================================
window.searchProducts = (val) => { searchTerm = val; renderProducts(); }

function renderProducts() {
    sortProducts(); 
    const grid = document.getElementById('product-grid');
    const categories = ['Tout', ...new Set(products.map(p => p.category))];
    const filterContainer = document.getElementById('category-filters');
    if (categories.length <= 1 && products.length === 0) { filterContainer.innerHTML = ''; } 
    else { filterContainer.innerHTML = categories.map(c => `<button onclick="filter('${c}')" class="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${currentFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}">${c}</button>`).join(''); }

    const filtered = products.filter(p => currentFilter === 'Tout' || p.category === currentFilter).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filtered.length === 0) { grid.innerHTML = `<div class="col-span-2 text-center mt-10 text-slate-400 text-sm font-bold">Aucun produit trouvé.</div>`; return; }

    grid.innerHTML = filtered.map(p => {
            const qtyInCart = cart[p.id] || 0; const isOutOfStock = p.stock === 0;
            const imgHtml = p.image ? `<img src="${p.image}" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition duration-500">` : `<div class="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center"><i class="fa-solid fa-box-open text-4xl text-slate-600"></i></div>`;
            return `<div onclick="${isOutOfStock ? '' : `addToCart(${p.id})`}" class="aspect-[4/5] relative rounded-2xl shadow-sm overflow-hidden group border border-slate-200 dark:border-white/5 active:scale-95 transition bg-white dark:bg-slate-800">${imgHtml}<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent dark:from-black/90 dark:via-black/40"></div><div class="absolute top-2 right-2 z-10">${qtyInCart > 0 ? `<div class="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">${qtyInCart}</div>` : ''}</div><div class="absolute top-2 left-2 z-10"><span class="text-[9px] font-bold px-2 py-1 rounded bg-white/90 dark:bg-black/50 text-slate-800 dark:text-white backdrop-blur-sm border border-slate-200 dark:border-white/10 uppercase tracking-wider shadow-sm">${p.category}</span></div><div class="absolute bottom-0 w-full p-3 z-10"><div class="flex justify-between items-end"><div><h3 class="font-bold text-white text-sm leading-tight mb-1 shadow-black drop-shadow-md">${p.name}</h3><p class="text-cyberBlue font-mono font-bold text-lg drop-shadow-md">${p.price.toLocaleString()} <span class="text-xs">F</span></p></div></div>${isOutOfStock ? '<div class="absolute inset-0 bg-white/80 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center"><span class="text-red-500 font-bold border-2 border-red-500 px-3 py-1 rounded rotate-12 bg-white dark:bg-transparent">RUPTURE</span></div>' : ''}</div></div>`;
        }).join('');
}

window.filter = (cat) => { currentFilter = cat; renderProducts(); };
window.addToCart = (id) => { const p = products.find(x => x.id == id); if (p.stock <= (cart[id] || 0)) return alert("Stock insuffisant !"); if (!cart[id]) cartPrices[id] = p.price; cart[id] = (cart[id] || 0) + 1; renderProducts(); updateCartUI(); };
window.removeFromCart = (id) => { if (cart[id]) { cart[id]--; if (cart[id] === 0) { delete cart[id]; delete cartPrices[id]; } renderProducts(); updateCartUI(); } };
window.toggleCart = () => { const panel = document.getElementById('cart-panel'); const chevron = document.getElementById('cart-chevron'); if (panel.style.transform === 'translateY(0px)') { panel.style.transform = 'translateY(88%)'; chevron.style.transform = 'rotate(0deg)'; } else { panel.style.transform = 'translateY(0px)'; chevron.style.transform = 'rotate(180deg)'; } };

window.updateCartUI = () => {
    const container = document.getElementById('cart-items'); let total = 0; let count = 0; let html = '';
    for (const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        if (p) {
            const sellingPrice = cartPrices[id] !== undefined ? cartPrices[id] : p.price; const subtotal = sellingPrice * qty; total += subtotal; count += qty; const isModified = sellingPrice !== p.price; const priceColor = isModified ? (sellingPrice > p.price ? 'text-green-500' : 'text-orange-500') : 'text-blue-600';
            html += `<div class="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-3 rounded-xl"><div class="flex-1"><p class="font-bold text-sm text-slate-800 dark:text-white">${p.name}</p><div class="flex items-center gap-2 mt-1"><button onclick="openPriceEdit('${id}')" class="text-xs bg-white dark:bg-white/10 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-lg font-mono font-bold flex items-center gap-1 ${priceColor}">${sellingPrice.toLocaleString()} F <i class="fa-solid fa-pen text-[10px] opacity-50"></i></button><span class="text-xs text-slate-400">x ${qty} = ${subtotal.toLocaleString()}</span></div></div><div class="flex items-center gap-3 ml-2"><button onclick="removeFromCart(${id})" class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-white font-bold">-</button><span class="font-bold w-4 text-center dark:text-white">${qty}</span><button onclick="addToCart(${id})" class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">+</button></div></div>`;
        }
    }
    container.innerHTML = html; const badge = document.getElementById('cart-badge'); badge.innerText = count; if (count > 0) badge.classList.remove('scale-0'); else badge.classList.add('scale-0'); document.getElementById('cart-total-preview').innerText = total.toLocaleString() + ' F'; document.getElementById('cart-total-final').innerText = total.toLocaleString() + ' FCFA'; if (count === 1 && document.getElementById('cart-panel').style.transform !== 'translateY(0px)') { window.toggleCart(); }
};

window.openPriceEdit = (idString) => {
    const p = products.find(x => x.id == idString); 
    if (!p) return;
    negotiatingId = p.id;
    document.getElementById('price-modal-product').textContent = p.name;
    document.getElementById('negotiated-price').value = cartPrices[p.id] !== undefined ? cartPrices[p.id] : p.price;
    document.getElementById('priceModal').classList.remove('hidden');
};

window.saveNegotiatedPrice = () => {
    if (!negotiatingId) return;
    const newPrice = parseInt(document.getElementById('negotiated-price').value);
    if (!isNaN(newPrice) && newPrice >= 0) {
        cartPrices[negotiatingId] = newPrice;
        updateCartUI();
        document.getElementById('priceModal').classList.add('hidden');
    }
};
window.closePriceModal = () => document.getElementById('priceModal').classList.add('hidden');

// --- PAIEMENT ---
window.processSale = () => {
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
        const sellingPrice = cartPrices[id] !== undefined ? cartPrices[id] : products.find(x => x.id == id).price;
        return sum + (sellingPrice * qty);
    }, 0);
    if (total === 0) return alert("Panier vide !");
    pendingSale = { total: total };
    document.getElementById('payment-total-display').innerText = total.toLocaleString() + ' F';
    document.getElementById('payment-input').value = total;
    document.getElementById('paymentModal').classList.remove('hidden');
};

window.confirmPayment = () => {
    const inputVal = parseInt(document.getElementById('payment-input').value);
    if (isNaN(inputVal) || inputVal < 0) return alert("Montant invalide");
    
    const clientName = document.getElementById('client-name').value || "Client";
    const saleItems = []; let saleSurplus = 0;
    
    for (const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        const sellingPrice = cartPrices[id] !== undefined ? cartPrices[id] : p.price;
        saleSurplus += (sellingPrice - p.price) * qty;
        p.stock -= qty;
        saleItems.push({ name: p.name, qty: qty, price: sellingPrice });
    }
    
    const isFullyPaid = inputVal >= pendingSale.total;
    const sale = { id: Date.now(), date: new Date().toLocaleString(), client: clientName, items: saleItems, total: pendingSale.total, amountPaid: inputVal, surplus: saleSurplus, status: isFullyPaid ? 'paid' : 'partial' };
    sales.unshift(sale); saveData();
    document.getElementById('paymentModal').classList.add('hidden');
    cart = {}; cartPrices = {}; pendingSale = null;
    document.getElementById('client-name').value = "";
    renderProducts(); updateStockUI(); updateCartUI(); updateDailyTotal();
    const panel = document.getElementById('cart-panel');
    if (panel.style.transform === 'translateY(0px)') window.toggleCart();
    showReceiptModal(sale);
};

window.settleDebt = (saleId) => {
    const sale = sales.find(s => s.id == saleId);
    if (!sale) return;
    const reste = sale.total - sale.amountPaid;
    if (confirm(`Solder la dette de ${reste.toLocaleString()} F ?`)) {
        sale.amountPaid = sale.total; sale.status = 'paid';
        saveData(); updateHistoryUI(); updateDailyTotal();
    }
};

window.showReceiptModal = (sale) => {
    document.getElementById('receiptModal').classList.remove('hidden');
    const remaining = sale.total - sale.amountPaid;
    const statusText = sale.status === 'paid' ? '✅ Payé' : `🟠 Acompte: ${sale.amountPaid}F | Reste: ${remaining}F`;
    let text = `🧾 REÇU\n👤 ${sale.client}\n💰 TOTAL: ${sale.total}F\n${statusText}`;
    document.getElementById('btn-whatsapp').href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    document.getElementById('btn-sms').href = `sms:?body=${encodeURIComponent(text)}`;
};
window.closeReceiptModal = () => document.getElementById('receiptModal').classList.add('hidden');

// ==========================================
// 5. AFFICHAGE STOCK & HISTORIQUE
// ==========================================
function updateStockUI() { sortProducts(); const list = document.getElementById('stock-list'); const currentYear = new Date().getFullYear(); const totalBudgetValue = products.reduce((sum, p) => sum + (p.price * (p.totalInput || 0)), 0); let html = `<div class="bg-white dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 mb-4 shadow-lg border border-slate-200 dark:border-slate-700"><p class="text-xs font-bold text-slate-500 uppercase">Valeur Stock Entrant</p><p class="text-2xl font-mono font-bold dark:text-white">${totalBudgetValue.toLocaleString()} F</p></div>`; if (products.length === 0) { html += `<div class="text-center mt-10 opacity-50"><p>Aucun stock.</p></div>`; } else { html += products.map(p => `<div class="bg-white dark:bg-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm mb-3 border border-slate-100 dark:border-transparent"><div class="flex items-center gap-3 flex-1"><div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex-none">${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center"><i class="fa-solid fa-box text-slate-400"></i></div>'}</div><div><div class="flex items-center gap-2"><p class="font-bold dark:text-white leading-tight">${p.name}</p><button onclick="openProductModal(${p.id})" class="text-blue-500 text-xs bg-blue-50 dark:bg-blue-900/30 p-1 rounded"><i class="fa-solid fa-pen"></i></button></div><p class="text-xs text-slate-500">${p.stock} en stock</p></div></div><div class="flex items-center gap-2"><button onclick="adjustStock(${p.id}, -1)" class="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white">-</button><span class="font-bold w-6 text-center dark:text-white">${p.stock}</span><button onclick="adjustStock(${p.id}, 1)" class="w-8 h-8 rounded bg-blue-600 text-white">+</button></div></div>`).join(''); } list.innerHTML = html; }
window.adjustStock = (id, amount) => { const p = products.find(x => x.id == id); p.stock += amount; if (amount > 0) p.totalInput = (p.totalInput || 0) + amount; if (p.stock < 0) p.stock = 0; saveData(); renderProducts(); updateStockUI(); };

function updateHistoryUI() {
    const list = document.getElementById('sales-history');
    const totalCashIn = sales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const debts = sales.reduce((sum, s) => sum + (s.total - (s.amountPaid || 0)), 0);
    let html = `<div class="grid grid-cols-2 gap-3 mb-4"><div class="bg-slate-800 rounded-xl p-3 border border-slate-700"><p class="text-[9px] uppercase font-bold text-slate-400">Caisse</p><p class="text-xl font-mono font-bold text-green-400">${totalCashIn.toLocaleString()} F</p></div><div class="bg-slate-800 rounded-xl p-3 border border-slate-700"><p class="text-[9px] uppercase font-bold text-slate-400">Dettes</p><p class="text-xl font-mono font-bold text-orange-400">${debts.toLocaleString()} F</p></div></div>`;
    html += sales.map(s => {
        const debt = s.total - (s.amountPaid || 0);
        const debtBadge = debt > 0 ? `<div class="mt-2 bg-orange-500/10 p-2 rounded flex justify-between items-center"><span class="text-orange-500 text-xs font-bold">Reste: ${debt}F</span><button onclick="settleDebt(${s.id})" class="text-[10px] bg-orange-500 text-white px-2 py-1 rounded">SOLDER</button></div>` : '';
        return `<div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 ${debt > 0 ? 'border-orange-500' : 'border-blue-500'} mb-3"><div class="flex justify-between mb-1"><span class="font-bold text-sm text-slate-500">${s.date.split(',')[0]}</span><span class="font-bold dark:text-white">${s.total.toLocaleString()} F</span></div><p class="text-sm dark:text-white"><span class="font-bold">${s.client}</span> (${s.items.length} articles)</p>${debtBadge}</div>`;
    }).join('');
    list.innerHTML = html;
}

function updateDailyTotal() {
    const today = new Date().toLocaleDateString();
    const total = sales.filter(s => new Date(s.id).toLocaleDateString() === today).reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    document.getElementById('daily-total').innerText = total.toLocaleString() + ' F';
}

function sortProducts() { products.sort((a, b) => b.id - a.id); }
function saveData() { localStorage.setItem('shop_products', JSON.stringify(products)); localStorage.setItem('shop_sales', JSON.stringify(sales)); }

// ==========================================
// 6. SÉCURITÉ & EXPORT
// ==========================================
window.enterPin = (num) => { if (currentPinInput.length < 4) { currentPinInput += num; updatePinDots(); if (currentPinInput.length === 4) checkPin(); } };
window.clearPin = () => { currentPinInput = ""; updatePinDots(); };
function updatePinDots() { const dots = document.querySelectorAll('.dot'); dots.forEach((dot, index) => { if (index < currentPinInput.length) { dot.classList.add('bg-blue-600'); } else { dot.classList.remove('bg-blue-600'); } }); }
function checkPin() { if (currentPinInput === userPin) { sessionStorage.setItem('is_logged_in', 'true'); document.getElementById('lock-screen').style.display = 'none'; } else { currentPinInput = ""; updatePinDots(); alert("Code Incorrect"); } }

window.exportData = () => { const data = { products: localStorage.getItem('shop_products'), sales: localStorage.getItem('shop_sales'), pin: localStorage.getItem('shop_pin') || "8388", date: new Date().toLocaleDateString() }; const blob = new Blob([JSON.stringify(data)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `backup_inventaire_${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('successMessage').textContent = "Sauvegarde téléchargée !"; document.getElementById('successModal').classList.remove('hidden'); };
window.confirmImport = (input) => { if (input.files && input.files[0]) { fileToImport = input.files[0]; document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('importConfirmModal').classList.remove('hidden'); } input.value = ''; };
window.executeImport = () => { if (!fileToImport) return; const reader = new FileReader(); reader.onload = (e) => { try { const data = JSON.parse(e.target.result); if (data.products && data.sales) { localStorage.setItem('shop_products', data.products); localStorage.setItem('shop_sales', data.sales); if (data.pin) localStorage.setItem('shop_pin', data.pin); document.getElementById('importConfirmModal').classList.add('hidden'); document.getElementById('successMessage').textContent = "Données restaurées !"; document.getElementById('successModal').classList.remove('hidden'); setTimeout(() => window.location.reload(), 1500); } else { alert("❌ Fichier invalide."); } } catch (err) { alert("❌ Erreur de lecture."); } }; reader.readAsText(fileToImport); };
window.closeModal = (modalId) => { document.getElementById(modalId).classList.add('hidden'); if (modalId === 'resetModal') { currentPinInput = ""; updatePinDots(); } };
window.executeReset = () => { localStorage.clear(); document.body.style.opacity = '0'; setTimeout(() => { window.location.reload(); }, 500); };

// ==========================================
// 7. GRAPHIQUES (Protegés par Try/Catch)
// ==========================================
function renderCharts() {
    try {
        // ... (Ton code graphique actuel ici si tu veux, sinon laisse vide ou simple pour éviter crash)
        // Je mets un graphique factice pour ne pas crasher si Chart.js manque
        if (typeof Chart === 'undefined') return;
        
        const last7Days = {}; const daysLabels = [];
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toLocaleDateString(); last7Days[dateStr] = 0; daysLabels.push(dateStr.slice(0, 5)); }
        sales.forEach(s => { const sDate = new Date(s.id).toLocaleDateString(); if (last7Days[sDate] !== undefined) last7Days[sDate] += (s.amountPaid || 0); });
        
        const ctx = document.getElementById('chart-trend');
        if(ctx) {
            if(chartTrend) chartTrend.destroy();
            chartTrend = new Chart(ctx, { type: 'line', data: { labels: daysLabels, datasets: [{ label: 'Ventes', data: Object.values(last7Days), borderColor: '#2563eb' }] } });
        }
    } catch(e) { console.log("Pas de graphiques (Offline mode)"); }
}

