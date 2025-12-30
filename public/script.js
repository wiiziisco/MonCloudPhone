// --- VARIABLES GLOBALES ---
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

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    sales.forEach(s => { if(s.amountPaid === undefined) { s.amountPaid = s.total; s.status = 'paid'; } });
    products = products.filter(p => p.category !== 'Draps' && p.name !== 'Parure de Draps');
    products.forEach(p => { if (p.totalInput === undefined) p.totalInput = p.stock; });
    saveData();
    sortProducts(); renderProducts(); updateStockUI(); updateHistoryUI(); updateDailyTotal();
    
    if (sessionStorage.getItem('is_logged_in')) {
        const lockScreen = document.getElementById('lock-screen');
        if(lockScreen) lockScreen.style.display = 'none';
    }
});

// --- NAVIGATION ---
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

// --- FIX CRAYON (Renommé + Robustesse) ---
window.openPriceEdit = (idString) => {
    // On convertit tout en nombre pour comparer, ou on compare en string
    // La méthode la plus sûre est de trouver par comparaison souple (==)
    const p = products.find(x => x.id == idString); 
    
    if (!p) {
        alert("Erreur: Produit introuvable (ID: " + idString + ")");
        return;
    }

    const currentPrice = cartPrices[p.id] !== undefined ? cartPrices[p.id] : p.price;
    negotiatingId = p.id;
    
    document.getElementById('price-modal-product').textContent = p.name;
    document.getElementById('negotiated-price').value = currentPrice;
    document.getElementById('priceModal').classList.remove('hidden');
}

window.saveNegotiatedPrice = () => {
    if (!negotiatingId) return;
    const inputVal = document.getElementById('negotiated-price').value;
    const newPrice = parseInt(inputVal);
    
    if (!isNaN(newPrice) && newPrice >= 0) {
        cartPrices[negotiatingId] = newPrice;
        updateCartUI();
        closePriceModal();
    } else {
        alert("Prix invalide");
    }
}

window.closePriceModal = () => { 
    document.getElementById('priceModal').classList.add('hidden'); 
    negotiatingId = null; 
}

// --- GESTION PAIEMENTS ---
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
    if (inputVal > pendingSale.total) return alert("Montant > Total !");

    const clientName = document.getElementById('client-name').value || "Client";
    const saleItems = []; let saleSurplus = 0;
    
    for (const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        const sellingPrice = cartPrices[id] !== undefined ? cartPrices[id] : p.price;
        const itemSurplus = (sellingPrice - p.price) * qty;
        saleSurplus += itemSurplus;
        p.stock -= qty;
        saleItems.push({ name: p.name, qty: qty, price: sellingPrice });
    }
    
    const isFullyPaid = inputVal >= pendingSale.total;
    const sale = {
        id: Date.now(), date: new Date().toLocaleString(), client: clientName, items: saleItems,
        total: pendingSale.total, amountPaid: inputVal, surplus: saleSurplus, status: isFullyPaid ? 'paid' : 'partial'
    };
    
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
    if (confirm(`Confirmer le paiement du solde (${(sale.total - sale.amountPaid).toLocaleString()} F) ?`)) {
        sale.amountPaid = sale.total;
        sale.status = 'paid';
        saveData(); updateHistoryUI(); updateDailyTotal();
    }
};

// --- AUTRES FONCTIONS ---
window.showReceiptModal = (sale) => {
    document.getElementById('receiptModal').classList.remove('hidden');
    const remaining = sale.total - sale.amountPaid;
    const statusText = sale.status === 'paid' ? '✅ Payé' : `🟠 Acompte: ${sale.amountPaid.toLocaleString()}F\n🛑 Reste: ${remaining.toLocaleString()}F`;
    let text = `🧾 *REÇU*\n📅 ${sale.date}\n👤 Client: ${sale.client}\n----------------\n`;
    sale.items.forEach(i => text += `${i.qty}x ${i.name} (${i.price.toLocaleString()}F)\n`);
    text += `----------------\n💰 *TOTAL: ${sale.total.toLocaleString()} FCFA*\n${statusText}\n🔗 Suivi : ${window.location.origin}`;
    const encoded = encodeURIComponent(text);
    document.getElementById('btn-whatsapp').href = `https://wa.me/?text=${encoded}`;
    document.getElementById('btn-sms').href = `sms:?body=${encoded}`;
};
window.closeReceiptModal = () => document.getElementById('receiptModal').classList.add('hidden');

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
            // Utilisation de '${p.id}' pour passer en string explicitement au addToCart si besoin, mais ici ID numérique OK
            return `<div onclick="${isOutOfStock ? '' : `addToCart(${p.id})`}" class="aspect-[4/5] relative rounded-2xl shadow-sm overflow-hidden group border border-slate-200 dark:border-white/5 active:scale-95 transition bg-white dark:bg-slate-800">${imgHtml}<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent dark:from-black/90 dark:via-black/40"></div><div class="absolute top-2 right-2 z-10">${qtyInCart > 0 ? `<div class="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">${qtyInCart}</div>` : ''}</div><div class="absolute top-2 left-2 z-10"><span class="text-[9px] font-bold px-2 py-1 rounded bg-white/90 dark:bg-black/50 text-slate-800 dark:text-white backdrop-blur-sm border border-slate-200 dark:border-white/10 uppercase tracking-wider shadow-sm">${p.category}</span></div><div class="absolute bottom-0 w-full p-3 z-10"><div class="flex justify-between items-end"><div><h3 class="font-bold text-white text-sm leading-tight mb-1 shadow-black drop-shadow-md">${p.name}</h3><p class="text-cyberBlue font-mono font-bold text-lg drop-shadow-md">${p.price.toLocaleString()} <span class="text-xs">F</span></p></div></div>${isOutOfStock ? '<div class="absolute inset-0 bg-white/80 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center"><span class="text-red-500 font-bold border-2 border-red-500 px-3 py-1 rounded rotate-12 bg-white dark:bg-transparent">RUPTURE</span></div>' : ''}</div></div>`;
        }).join('');
}
window.filter = (cat) => { currentFilter = cat; renderProducts(); };
window.addToCart = (id) => { const p = products.find(x => x.id == id); if (p.stock <= (cart[id] || 0)) return alert("Stock insuffisant !"); if (!cart[id]) cartPrices[id] = p.price; cart[id] = (cart[id] || 0) + 1; renderProducts(); updateCartUI(); };
window.removeFromCart = (id) => { if (cart[id]) { cart[id]--; if (cart[id] === 0) { delete cart[id]; delete cartPrices[id]; } renderProducts(); updateCartUI(); } };
window.toggleCart = () => { const panel = document.getElementById('cart-panel'); const chevron = document.getElementById('cart-chevron'); if (panel.style.transform === 'translateY(0px)') { panel.style.transform = 'translateY(88%)'; chevron.style.transform = 'rotate(0deg)'; } else { panel.style.transform = 'translateY(0px)'; chevron.style.transform = 'rotate(180deg)'; } };

function updateCartUI() {
    const container = document.getElementById('cart-items'); let total = 0; let count = 0; let html = '';
    for (const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        if (p) {
            const sellingPrice = cartPrices[id] !== undefined ? cartPrices[id] : p.price; const subtotal = sellingPrice * qty; total += subtotal; count += qty; const isModified = sellingPrice !== p.price; const priceColor = isModified ? (sellingPrice > p.price ? 'text-green-500' : 'text-orange-500') : 'text-blue-600';
            // ICI: On utilise openPriceEdit('${id}') avec des QUOTES pour passer l'ID en string
            html += `<div class="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-3 rounded-xl"><div class="flex-1"><p class="font-bold text-sm text-slate-800 dark:text-white">${p.name}</p><div class="flex items-center gap-2 mt-1"><button onclick="openPriceEdit('${id}')" class="text-xs bg-white dark:bg-white/10 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-lg font-mono font-bold flex items-center gap-1 ${priceColor}">${sellingPrice.toLocaleString()} F <i class="fa-solid fa-pen text-[10px] opacity-50"></i></button><span class="text-xs text-slate-400">x ${qty} = ${subtotal.toLocaleString()}</span></div></div><div class="flex items-center gap-3 ml-2"><button onclick="removeFromCart(${id})" class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-white font-bold">-</button><span class="font-bold w-4 text-center dark:text-white">${qty}</span><button onclick="addToCart(${id})" class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">+</button></div></div>`;
        }
    }
    container.innerHTML = html; const badge = document.getElementById('cart-badge'); badge.innerText = count; if (count > 0) badge.classList.remove('scale-0'); else badge.classList.add('scale-0'); document.getElementById('cart-total-preview').innerText = total.toLocaleString() + ' F'; document.getElementById('cart-total-final').innerText = total.toLocaleString() + ' FCFA'; if (count === 1 && document.getElementById('cart-panel').style.transform !== 'translateY(0px)') { window.toggleCart(); }
}

// --- RESTE DU CODE (Export, PIN, Stats...) ---
function renderCharts() { if (sales.length === 0) return; const last7Days = {}; const daysLabels = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toLocaleDateString(); last7Days[dateStr] = 0; daysLabels.push(dateStr.slice(0, 5)); } sales.forEach(s => { const sDate = new Date(s.id).toLocaleDateString(); if (last7Days[sDate] !== undefined) last7Days[sDate] += (s.amountPaid || 0); }); const catStats = {}; sales.forEach(s => { s.items.forEach(item => { const prod = products.find(p => p.name === item.name); const cat = prod ? prod.category : 'Autre'; catStats[cat] = (catStats[cat] || 0) + item.qty; }); }); const bestSale = Math.max(...sales.map(s => s.total)); const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0); const avgCart = Math.round(totalRevenue / sales.length); document.getElementById('stat-best-sale').innerText = bestSale.toLocaleString() + ' F'; document.getElementById('stat-avg-cart').innerText = avgCart.toLocaleString() + ' F'; const ctxTrend = document.getElementById('chart-trend'); if (ctxTrend) { if (chartTrend) chartTrend.destroy(); chartTrend = new Chart(ctxTrend.getContext('2d'), { type: 'line', data: { labels: daysLabels, datasets: [{ label: 'Cash', data: Object.values(last7Days), borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderWidth: 3, tension: 0.4, fill: true, pointRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { ticks: { display: true } , grid: { display: false } } } } }); } const ctxPie = document.getElementById('chart-pie'); if (ctxPie) { if (chartPie) chartPie.destroy(); chartPie = new Chart(ctxPie.getContext('2d'), { type: 'doughnut', data: { labels: Object.keys(catStats), datasets: [{ data: Object.values(catStats), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '70%' } }); } }
window.exportData = () => { const data = { products: localStorage.getItem('shop_products'), sales: localStorage.getItem('shop_sales'), pin: localStorage.getItem('shop_pin') || "8388", date: new Date().toLocaleDateString() }; const blob = new Blob([JSON.stringify(data)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `backup_inventaire_${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('successMessage').textContent = "Sauvegarde téléchargée !"; document.getElementById('successModal').classList.remove('hidden'); };
window.confirmImport = (input) => { if (input.files && input.files[0]) { fileToImport = input.files[0]; document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('importConfirmModal').classList.remove('hidden'); } input.value = ''; };
window.executeImport = () => { if (!fileToImport) return; const reader = new FileReader(); reader.onload = (e) => { try { const data = JSON.parse(e.target.result); if (data.products && data.sales) { localStorage.setItem('shop_products', data.products); localStorage.setItem('shop_sales', data.sales); if (data.pin) localStorage.setItem('shop_pin', data.pin); document.getElementById('importConfirmModal').classList.add('hidden'); document.getElementById('successMessage').textContent = "Données restaurées !"; document.getElementById('successModal').classList.remove('hidden'); setTimeout(() => window.location.reload(), 1500); } else { alert("❌ Fichier invalide."); } } catch (err) { alert("❌ Erreur de lecture."); } }; reader.readAsText(fileToImport); };
window.closeModal = (modalId) => { document.getElementById(modalId).classList.add('hidden'); if (modalId === 'resetModal') { currentPinInput = ""; updatePinDots(); } };
window.executeReset = () => { localStorage.clear(); document.body.style.opacity = '0'; setTimeout(() => { window.location.reload(); }, 500); };
function updateStockUI() { sortProducts(); const list = document.getElementById('stock-list'); const currentYear = new Date().getFullYear(); const annualProducts = products.filter(p => new Date(p.id).getFullYear() === currentYear); const currentStockValue = annualProducts.reduce((sum, p) => sum + (p.price * p.stock), 0); const totalBudgetValue = annualProducts.reduce((sum, p) => sum + (p.price * (p.totalInput || 0)), 0); const ristourne = Math.round(totalBudgetValue * 0.09); let html = `<div class="bg-white dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 mb-4 shadow-lg border border-slate-200 dark:border-slate-700 relative overflow-hidden text-slate-900 dark:text-white"><div class="relative z-10"><div class="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-white/10"><div><p class="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Entrées (${currentYear})</p><p class="text-2xl font-mono font-bold text-slate-800 dark:text-white">${totalBudgetValue.toLocaleString()} <span class="text-xs text-slate-500">F</span></p></div><div class="bg-slate-100 dark:bg-white/5 p-2 rounded-lg"><i class="fa-solid fa-truck-ramp-box text-xl text-slate-400"></i></div></div><div class="flex justify-between items-end"><div><p class="text-[9px] uppercase font-bold text-blue-500 dark:text-cyan-400 tracking-wider">Valeur Restante</p><p class="text-xl font-mono font-bold text-blue-600 dark:text-cyan-400">${currentStockValue.toLocaleString()} <span class="text-xs text-blue-400 dark:text-cyan-600">F</span></p></div><div class="text-right"><p class="text-[8px] uppercase text-orange-500/80 font-bold mb-1">Ristourne (Sur Achats)</p><div class="inline-flex items-center gap-2 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded border border-orange-200 dark:border-orange-500/20"><span class="text-orange-600 dark:text-orange-400 text-xs font-bold">9%</span><span class="text-orange-600 dark:text-orange-400 font-mono font-bold text-sm">${ristourne.toLocaleString()} F</span></div></div></div></div></div>`; if (products.length === 0) { html += `<div class="text-center mt-10 opacity-50"><i class="fa-solid fa-wind text-4xl text-slate-600 mb-2"></i><p class="text-slate-500 text-sm">Le stock est vide.</p></div>`; } else { html += products.map(p => `<div class="bg-white dark:bg-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm border border-slate-100 dark:border-transparent ${p.stock === 0 ? 'opacity-60 border-red-200' : 'mb-3'}"><div class="flex items-center gap-3 flex-1"><div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex-none">${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-slate-400"><i class="fa-solid fa-image"></i></div>'}</div><div class="flex-1"><div class="flex items-center gap-2 mb-0.5"><p class="font-bold text-slate-800 dark:text-white leading-tight ${p.stock === 0 ? 'line-through decoration-red-500' : ''}">${p.name}</p><button onclick="openProductModal(${p.id})" class="text-blue-500 hover:text-blue-600 p-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-xs"><i class="fa-solid fa-pen"></i></button></div><p class="text-xs text-slate-500">${p.category} - ${p.price.toLocaleString()} F</p></div></div><div class="flex items-center gap-2 ml-2"><button onclick="adjustStock(${p.id}, -1)" class="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center"><i class="fa-solid fa-minus"></i></button><span class="font-mono font-bold w-6 text-center text-slate-800 dark:text-white text-sm">${p.stock}</span><button onclick="adjustStock(${p.id}, 1)" class="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center"><i class="fa-solid fa-plus"></i></button></div></div>`).join(''); } list.innerHTML = html; }
function updateHistoryUI() { const list = document.getElementById('sales-history'); const totalAllTime = sales.reduce((sum, s) => sum + s.total, 0); const totalCashIn = sales.reduce((sum, s) => sum + (s.amountPaid || 0), 0); const debtsPending = totalAllTime - totalCashIn; let html = `<div class="grid grid-cols-2 gap-3 mb-4"><div class="bg-slate-800 rounded-xl p-3 border border-slate-700"><p class="text-[9px] text-slate-400 font-bold uppercase mb-1">Caisse Réelle</p><p class="text-xl font-mono font-bold text-green-400">${totalCashIn.toLocaleString()} <span class="text-xs">F</span></p></div><div class="bg-slate-800 rounded-xl p-3 border border-slate-700"><p class="text-[9px] text-slate-400 font-bold uppercase mb-1">Dettes Dehors</p><p class="text-xl font-mono font-bold text-orange-400">${debtsPending.toLocaleString()} <span class="text-xs">F</span></p></div></div>`; if (sales.length === 0) { html += `<div class="text-center mt-10 opacity-50"><i class="fa-solid fa-file-invoice text-4xl text-slate-600 mb-2"></i><p class="text-slate-500 text-sm">Aucune vente.</p></div>`; } else { html += sales.map(s => { const surplusText = s.surplus > 0 ? `<span class="text-xs font-bold text-green-500 dark:text-green-400 ml-2">(+${s.surplus.toLocaleString()})</span>` : ''; const remaining = s.total - (s.amountPaid || 0); const isDebt = remaining > 0; const borderClass = isDebt ? 'border-l-orange-500' : 'border-l-blue-500'; const statusBadge = isDebt ? `<div class="mt-2 flex justify-between items-center bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg"><span class="text-xs font-bold text-orange-600 dark:text-orange-400">Reste: ${remaining.toLocaleString()} F</span><button onclick="settleDebt(${s.id})" class="bg-orange-500 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-sm hover:bg-orange-600 transition">SOLDER</button></div>` : ''; return `<div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-transparent border-l-4 ${borderClass} mb-3"><div class="flex justify-between mb-1"><span class="font-bold text-sm text-slate-600 dark:text-slate-400">${s.date.split(',')[0]}</span><div><span class="font-bold text-slate-800 dark:text-slate-200">${s.total.toLocaleString()} F</span>${surplusText}</div></div><div class="text-sm text-slate-700 dark:text-white mb-1"><span class="font-bold">${s.client}</span> (${s.items.length} articles)</div>${statusBadge}</div>`; }).join(''); } list.innerHTML = html; }
function updateDailyTotal() { const today = new Date().toLocaleDateString(); const total = sales.filter(s => new Date(s.id).toLocaleDateString() === today).reduce((sum, s) => sum + (s.amountPaid || 0), 0); document.getElementById('daily-total').innerText = total.toLocaleString() + ' F'; }
function sortProducts() { products.sort((a, b) => { if (a.stock === 0 && b.stock > 0) return 1; if (a.stock > 0 && b.stock === 0) return -1; return b.id - a.id; }); }
function saveData() { sortProducts(); localStorage.setItem('shop_products', JSON.stringify(products)); localStorage.setItem('shop_sales', JSON.stringify(sales)); }
window.enterPin = (num) => { if (currentPinInput.length < 4) { currentPinInput += num; updatePinDots(); if (currentPinInput.length === 4) checkPin(); } };
window.clearPin = () => { currentPinInput = ""; updatePinDots(); };
function updatePinDots() { const dots = document.querySelectorAll('.dot'); dots.forEach((dot, index) => { if (index < currentPinInput.length) { dot.classList.remove('bg-slate-300', 'dark:bg-slate-700'); dot.classList.add('bg-blue-600', 'dark:bg-blue-400'); } else { dot.classList.remove('bg-blue-600', 'dark:bg-blue-400'); dot.classList.add('bg-slate-300', 'dark:bg-slate-700'); } }); }
function checkPin() { if (currentPinInput === RESET_PIN) { document.getElementById('resetModal').classList.remove('hidden'); return; } if (currentPinInput === userPin) { sessionStorage.setItem('is_logged_in', 'true'); const lockScreen = document.getElementById('lock-screen'); lockScreen.style.opacity = '0'; setTimeout(() => { lockScreen.style.display = 'none'; }, 300); } else { if(navigator.vibrate) navigator.vibrate(200); const dots = document.querySelectorAll('.dot'); dots.forEach(d => d.classList.add('bg-red-500')); setTimeout(() => { currentPinInput = ""; updatePinDots(); dots.forEach(d => d.classList.remove('bg-red-500')); }, 500); } }
