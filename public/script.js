// --- CONFIGURATION ---
let products = JSON.parse(localStorage.getItem('shop_products')) || []; 
let sales = JSON.parse(localStorage.getItem('shop_sales')) || [];
let cart = {}; let cartPrices = {}; let currentFilter = 'Tout'; let searchTerm = ""; 
let editingId = null; let negotiatingId = null; let tempImageBase64 = null;
let currentPinInput = ""; const DEFAULT_PIN = "8388"; const RESET_PIN = "1999"; let userPin = localStorage.getItem('shop_pin') || DEFAULT_PIN;

// --- DEMARRAGE ---
document.addEventListener('DOMContentLoaded', () => {
    products = products.filter(p => p.category !== 'Draps');
    products.forEach(p => { if (p.totalInput === undefined) p.totalInput = p.stock; });
    saveData();
    sortProducts(); renderProducts(); updateStockUI(); updateHistoryUI(); updateDailyTotal();
    if (sessionStorage.getItem('is_logged_in')) document.getElementById('lock-screen').style.display = 'none';
});

// --- NAVIGATION ---
window.switchTab = (tabName) => {
    document.querySelectorAll('nav button').forEach(btn => { btn.classList.remove('active-tab'); btn.classList.add('inactive-tab'); });
    document.getElementById(`tab-${tabName}`).classList.add('active-tab');
    document.getElementById(`tab-${tabName}`).classList.remove('inactive-tab');
    ['pos', 'stock', 'history'].forEach(v => document.getElementById(`view-${v}`).style.transform = 'translateX(100%)');
    document.getElementById(`view-${tabName}`).style.transform = 'translateX(0)';
};

// --- STOCK & PRODUIT ---
window.openProductModal = (id = null) => {
    const modal = document.getElementById('productModal');
    tempImageBase64 = null;
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('image-preview-container').classList.remove('opacity-0');
    if (id) {
        const p = products.find(x => x.id == id);
        if(!p) return;
        editingId = id;
        document.getElementById('new-prod-name').value = p.name;
        document.getElementById('new-prod-price').value = p.price;
        document.getElementById('new-prod-stock').value = p.stock;
        document.getElementById('new-prod-cat').value = p.category;
        if(p.image) { tempImageBase64 = p.image; document.getElementById('image-preview').src = p.image; document.getElementById('image-preview').classList.remove('hidden'); document.getElementById('image-preview-container').classList.add('opacity-0'); }
    } else {
        editingId = null;
        document.getElementById('new-prod-name').value = ""; document.getElementById('new-prod-price').value = ""; document.getElementById('new-prod-stock').value = "";
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
            if(p) { p.name = name; p.price = price; p.stock = stock || 0; p.category = cat; if(tempImageBase64) p.image = tempImageBase64; }
        } else {
            products.push({ id: Date.now(), name, price, stock: stock || 0, totalInput: stock || 0, category: cat, image: tempImageBase64 });
        }
        saveData(); document.getElementById('productModal').classList.add('hidden'); renderProducts(); updateStockUI();
    }
};

window.handleImageUpload = (input) => {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
            const MAX = 150; const scale = MAX / img.width;
            canvas.width = MAX; canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            tempImageBase64 = canvas.toDataURL('image/jpeg', 0.5);
            document.getElementById('image-preview').src = tempImageBase64;
            document.getElementById('image-preview').classList.remove('hidden');
            document.getElementById('image-preview-container').classList.add('opacity-0');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// --- CAISSE ---
window.searchProducts = (val) => { searchTerm = val; renderProducts(); }
function renderProducts() {
    sortProducts();
    const filtered = products.filter(p => currentFilter === 'Tout' || p.category === currentFilter).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const grid = document.getElementById('product-grid');
    if (filtered.length === 0) { grid.innerHTML = `<div class="col-span-2 text-center mt-10 text-slate-400 text-sm">Aucun produit.</div>`; return; }
    
    // Filtres
    const cats = ['Tout', ...new Set(products.map(p => p.category))];
    document.getElementById('category-filters').innerHTML = cats.map(c => `<button onclick="window.currentFilter='${c}';renderProducts()" class="px-4 py-1 rounded-full text-xs font-bold border ${currentFilter===c ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}">${c}</button>`).join('');

    grid.innerHTML = filtered.map(p => {
        const inCart = cart[p.id] || 0;
        return `
        <div onclick="addToCart(${p.id})" class="aspect-[4/5] relative rounded-2xl shadow-sm overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 active:scale-95 transition">
            ${p.image ? `<img src="${p.image}" class="absolute inset-0 w-full h-full object-cover">` : `<div class="absolute inset-0 flex items-center justify-center text-slate-300"><i class="fa-solid fa-box text-3xl"></i></div>`}
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div class="absolute top-2 right-2">${inCart>0 ? `<div class="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow">${inCart}</div>` : ''}</div>
            <div class="absolute bottom-0 w-full p-3">
                <h3 class="font-bold text-white text-sm leading-tight">${p.name}</h3>
                <p class="text-cyan-400 font-mono font-bold">${p.price.toLocaleString()} F</p>
            </div>
            ${p.stock===0 ? `<div class="absolute inset-0 bg-white/80 dark:bg-black/60 flex items-center justify-center font-bold text-red-500 rotate-12 border-2 border-red-500 rounded">RUPTURE</div>` : ''}
        </div>`;
    }).join('');
}

window.addToCart = (id) => { const p = products.find(x => x.id == id); if(p.stock <= (cart[id]||0)) return alert('Stock insuffisant'); cart[id] = (cart[id]||0)+1; renderProducts(); updateCartUI(); };
window.removeFromCart = (id) => { if(cart[id]) { cart[id]--; if(cart[id]===0) { delete cart[id]; delete cartPrices[id]; } renderProducts(); updateCartUI(); } };
window.toggleCart = () => { const p = document.getElementById('cart-panel'); p.style.transform = p.style.transform === 'translateY(0px)' ? 'translateY(88%)' : 'translateY(0px)'; };

function updateCartUI() {
    const list = document.getElementById('cart-items');
    let total = 0; let count = 0; let html = '';
    for(const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        if(p) {
            const price = cartPrices[id] || p.price;
            total += price * qty; count += qty;
            html += `
            <div class="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                <div class="flex-1"><p class="font-bold text-sm dark:text-white">${p.name}</p><button onclick="openPriceEdit('${id}')" class="text-xs text-blue-500 border px-1 rounded">${price} F <i class="fa-solid fa-pen"></i></button></div>
                <div class="flex items-center gap-3"><button onclick="removeFromCart(${id})" class="w-8 h-8 rounded-full bg-slate-200">-</button><span class="font-bold w-4 text-center dark:text-white">${qty}</span><button onclick="addToCart(${id})" class="w-8 h-8 rounded-full bg-blue-600 text-white">+</button></div>
            </div>`;
        }
    }
    list.innerHTML = html;
    document.getElementById('cart-badge').innerText = count; document.getElementById('cart-badge').style.transform = count>0 ? 'scale(1)' : 'scale(0)';
    document.getElementById('cart-total-preview').innerText = total.toLocaleString() + ' F';
    document.getElementById('cart-total-final').innerText = total.toLocaleString() + ' FCFA';
}

window.openPriceEdit = (id) => { const p = products.find(x => x.id == id); if(!p) return; negotiatingId = p.id; document.getElementById('price-modal-product').textContent = p.name; document.getElementById('negotiated-price').value = cartPrices[p.id] || p.price; document.getElementById('priceModal').classList.remove('hidden'); };
window.saveNegotiatedPrice = () => { const val = parseInt(document.getElementById('negotiated-price').value); if(!isNaN(val) && val >= 0) { cartPrices[negotiatingId] = val; updateCartUI(); document.getElementById('priceModal').classList.add('hidden'); } };
window.closePriceModal = () => document.getElementById('priceModal').classList.add('hidden');

window.processSale = () => {
    const total = Object.entries(cart).reduce((sum, [id, qty]) => sum + (cartPrices[id] || products.find(x => x.id == id).price) * qty, 0);
    if(total === 0) return alert("Panier vide");
    
    const client = document.getElementById('client-name').value || "Client";
    const items = [];
    for(const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        p.stock -= qty;
        items.push({ name: p.name, qty, price: cartPrices[id] || p.price });
    }
    const sale = { id: Date.now(), date: new Date().toLocaleString(), client, items, total };
    sales.unshift(sale); saveData();
    cart = {}; cartPrices = {}; document.getElementById('client-name').value = "";
    renderProducts(); updateStockUI(); updateCartUI(); updateDailyTotal();
    
    document.getElementById('receiptModal').classList.remove('hidden');
    const txt = `REÇU\n${sale.date}\n${client}\nTotal: ${total}F`;
    document.getElementById('btn-whatsapp').href = `https://wa.me/?text=${encodeURIComponent(txt)}`;
};
window.closeReceiptModal = () => document.getElementById('receiptModal').classList.add('hidden');

// --- PIN & DATA ---
window.enterPin = (n) => { if(currentPinInput.length<4) { currentPinInput+=n; updateDots(); if(currentPinInput.length===4) checkPin(); } };
window.clearPin = () => { currentPinInput=""; updateDots(); };
function updateDots() { document.querySelectorAll('.dot').forEach((d,i) => { if(i<currentPinInput.length) d.classList.add('bg-blue-600'); else d.classList.remove('bg-blue-600'); }); }
function checkPin() { 
    if(currentPinInput===userPin) { sessionStorage.setItem('is_logged_in','true'); document.getElementById('lock-screen').style.display='none'; }
    else if(currentPinInput===RESET_PIN) { document.getElementById('resetModal').classList.remove('hidden'); }
    else { currentPinInput=""; updateDots(); alert('Code Faux'); }
}
window.executeReset = () => { localStorage.clear(); location.reload(); };
window.exportData = () => { const data = { products: localStorage.getItem('shop_products'), sales: localStorage.getItem('shop_sales'), pin: localStorage.getItem('shop_pin') || "8388", date: new Date().toLocaleDateString() }; const blob = new Blob([JSON.stringify(data)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `backup_inventaire_${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('successMessage').textContent = "Sauvegarde téléchargée !"; document.getElementById('successModal').classList.remove('hidden'); };
window.confirmImport = (input) => { if (input.files && input.files[0]) { fileToImport = input.files[0]; document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('importConfirmModal').classList.remove('hidden'); } input.value = ''; };
window.executeImport = () => { if (!fileToImport) return; const reader = new FileReader(); reader.onload = (e) => { try { const data = JSON.parse(e.target.result); if (data.products && data.sales) { localStorage.setItem('shop_products', data.products); localStorage.setItem('shop_sales', data.sales); if (data.pin) localStorage.setItem('shop_pin', data.pin); document.getElementById('importConfirmModal').classList.add('hidden'); document.getElementById('successMessage').textContent = "Données restaurées !"; document.getElementById('successModal').classList.remove('hidden'); setTimeout(() => window.location.reload(), 1500); } else { alert("❌ Fichier invalide."); } } catch (err) { alert("❌ Erreur de lecture."); } }; reader.readAsText(fileToImport); };
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

// --- HELPERS ---
function sortProducts() { products.sort((a,b) => b.id - a.id); }
function saveData() { localStorage.setItem('shop_products', JSON.stringify(products)); localStorage.setItem('shop_sales', JSON.stringify(sales)); }
function updateDailyTotal() { const t = new Date().toLocaleDateString(); const tot = sales.filter(s => new Date(s.id).toLocaleDateString() === t).reduce((sum,s) => sum + s.total, 0); document.getElementById('daily-total').innerText = tot.toLocaleString() + ' F'; }
function updateStockUI() { sortProducts(); document.getElementById('stock-list').innerHTML = products.map(p => `<div class="bg-white dark:bg-slate-800 p-3 rounded-xl flex justify-between mb-2 shadow-sm border border-slate-100 dark:border-white/5"><div class="flex gap-3 items-center"><div class="w-10 h-10 rounded bg-slate-100 dark:bg-white/10 overflow-hidden">${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : ''}</div><div><div class="font-bold dark:text-white">${p.name}</div><div class="text-xs text-slate-500">${p.stock} en stock</div></div></div><button onclick="openProductModal(${p.id})" class="text-blue-500"><i class="fa-solid fa-pen"></i></button></div>`).join(''); }
function updateHistoryUI() { document.getElementById('sales-history').innerHTML = sales.map(s => `<div class="bg-white dark:bg-slate-800 p-3 rounded-xl mb-2 shadow-sm border-l-4 border-blue-500"><div class="flex justify-between"><span class="font-bold dark:text-white">${s.total} F</span><span class="text-xs text-slate-500">${s.date.split(' ')[0]}</span></div><div class="text-sm">${s.client}</div></div>`).join(''); }
