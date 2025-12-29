// --- CONFIGURATION & DONNÉES ---
let products = JSON.parse(localStorage.getItem('shop_products')) || [
    { id: 1, name: "Matelas ortho 3plcs ph2", price: 120000, category: "Matelas", stock: 5 },
    { id: 2, name: "Matelas ortho 2plcs ph2", price: 250000, category: "Matelas", stock: 2 },
    { id: 3, name: "Oreillers ortho", price: 15000, category: "Oreillers", stock: 20 }
];

let sales = JSON.parse(localStorage.getItem('shop_sales')) || [];
let cart = {}; 
let currentFilter = 'Tout';
let editingId = null;

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    products = products.filter(p => p.category !== 'Draps' && p.name !== 'Parure de Draps');
    sortProducts(); 
    renderProducts();
    updateStockUI();
    updateHistoryUI();
    updateDailyTotal();
});

// --- TRI INTELLIGENT ---
function sortProducts() {
    products.sort((a, b) => {
        if (a.stock === 0 && b.stock > 0) return 1;
        if (a.stock > 0 && b.stock === 0) return -1;
        return b.id - a.id;
    });
}

// --- NAVIGATION ---
window.switchTab = (tabName) => {
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active-tab');
        btn.classList.add('inactive-tab');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active-tab');
    document.getElementById(`tab-${tabName}`).classList.remove('inactive-tab');

    const pos = document.getElementById('view-pos');
    const stock = document.getElementById('view-stock');
    const hist = document.getElementById('view-history');

    if (tabName === 'pos') {
        pos.style.transform = 'translateX(0)';
        stock.style.transform = 'translateX(100%)';
        hist.style.transform = 'translateX(100%)';
    } else if (tabName === 'stock') {
        pos.style.transform = 'translateX(-100%)';
        stock.style.transform = 'translateX(0)';
        hist.style.transform = 'translateX(100%)';
        updateStockUI();
    } else {
        pos.style.transform = 'translateX(-100%)';
        stock.style.transform = 'translateX(-100%)';
        hist.style.transform = 'translateX(0)';
        updateHistoryUI();
    }
};

// --- LOGIQUE CAISSE ---
function renderProducts() {
    sortProducts(); 
    
    const grid = document.getElementById('product-grid');
    const categories = ['Tout', ...new Set(products.map(p => p.category))];
    
    const filterContainer = document.getElementById('category-filters');
    filterContainer.innerHTML = categories.map(c => 
        `<button onclick="filter('${c}')" class="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${currentFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}">${c}</button>`
    ).join('');

    if (products.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center mt-10 p-4 border-2 border-dashed border-slate-300 rounded-xl"><p class="text-slate-500 font-bold mb-2">Stock Vide</p><button onclick="switchTab('stock'); openProductModal()" class="text-blue-600 text-sm font-bold underline">Ajouter un premier article</button></div>`;
        return;
    }

    grid.innerHTML = products
        .filter(p => currentFilter === 'Tout' || p.category === currentFilter)
        .map(p => {
            const qtyInCart = cart[p.id] || 0;
            const isOutOfStock = p.stock === 0;
            return `
            <div onclick="${isOutOfStock ? '' : `addToCart(${p.id})`}" class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border ${isOutOfStock ? 'border-red-200 bg-red-50 dark:bg-red-900/10 opacity-60 grayscale-[50%]' : 'border-slate-200 dark:border-white/5 active:scale-95'} transition relative overflow-hidden group">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">${p.category}</span>
                    <span class="text-[10px] font-bold ${p.stock < 3 ? 'text-red-500' : 'text-green-500'}">${isOutOfStock ? 'RUPTURE' : 'Stock: ' + p.stock}</span>
                </div>
                <h3 class="font-bold text-slate-800 dark:text-white leading-tight mb-1">${p.name}</h3>
                <p class="text-blue-600 dark:text-cyberBlue font-mono font-bold">${p.price.toLocaleString()} F</p>
                ${qtyInCart > 0 ? `<div class="absolute top-0 right-0 bg-blue-600 text-white w-6 h-6 rounded-bl-xl flex items-center justify-center text-xs font-bold shadow-lg">${qtyInCart}</div>` : ''}
            </div>`;
        }).join('');
}

window.filter = (cat) => { currentFilter = cat; renderProducts(); };

window.addToCart = (id) => {
    const p = products.find(x => x.id === id);
    if (p.stock <= (cart[id] || 0)) return alert("Stock insuffisant !");
    
    cart[id] = (cart[id] || 0) + 1;
    renderProducts(); 
    updateCartUI();
};

window.removeFromCart = (id) => {
    if (cart[id]) {
        cart[id]--;
        if (cart[id] === 0) delete cart[id];
        renderProducts();
        updateCartUI();
    }
};

window.toggleCart = () => {
    const panel = document.getElementById('cart-panel');
    const chevron = document.getElementById('cart-chevron');
    if (panel.style.transform === 'translateY(0px)') {
        panel.style.transform = 'translateY(88%)';
        chevron.style.transform = 'rotate(0deg)';
    } else {
        panel.style.transform = 'translateY(0px)';
        chevron.style.transform = 'rotate(180deg)';
    }
};

function updateCartUI() {
    const container = document.getElementById('cart-items');
    let total = 0;
    let count = 0;
    let html = '';

    for (const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        if (p) {
            const subtotal = p.price * qty;
            total += subtotal;
            count += qty;
            html += `
            <div class="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                <div>
                    <p class="font-bold text-sm text-slate-800 dark:text-white">${p.name}</p>
                    <p class="text-xs text-slate-500">${p.price.toLocaleString()} x ${qty} = <span class="font-bold text-blue-600">${subtotal.toLocaleString()}</span></p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="removeFromCart(${id})" class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-white font-bold">-</button>
                    <span class="font-bold w-4 text-center dark:text-white">${qty}</span>
                    <button onclick="addToCart(${id})" class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">+</button>
                </div>
            </div>`;
        }
    }

    container.innerHTML = html;
    
    const badge = document.getElementById('cart-badge');
    badge.innerText = count;
    if (count > 0) badge.classList.remove('scale-0');
    else badge.classList.add('scale-0');

    document.getElementById('cart-total-preview').innerText = total.toLocaleString() + ' F';
    document.getElementById('cart-total-final').innerText = total.toLocaleString() + ' FCFA';
    
    if (count === 1 && document.getElementById('cart-panel').style.transform !== 'translateY(0px)') {
        window.toggleCart();
    }
}

// --- VALIDATION VENTE (RÈGLE DE SOUSTRACTION) ---
window.processSale = () => {
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
        return sum + (products.find(x => x.id == id).price * qty);
    }, 0);

    if (total === 0) return alert("Panier vide !");

    const clientName = document.getElementById('client-name').value || "Client";
    const saleItems = [];
    
    // RÈGLE AUTOMATIQUE : On déduit le stock ici
    for (const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        p.stock -= qty; // Soustraction
        saleItems.push({ name: p.name, qty: qty, price: p.price });
    }
    
    const sale = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        client: clientName,
        items: saleItems,
        total: total
    };
    
    sales.unshift(sale);
    saveData();
    
    showReceiptModal(sale);
    
    cart = {};
    document.getElementById('client-name').value = "";
    renderProducts();
    updateStockUI(); // La valeur du stock baissera automatiquement
    updateCartUI();
    updateDailyTotal(); // Le total vendu augmentera automatiquement
    window.toggleCart();
};

function showReceiptModal(sale) {
    const modal = document.getElementById('receiptModal');
    modal.classList.remove('hidden');
    
    let text = `🧾 *REÇU F4Ma MATELAS*\n`;
    text += `📅 ${sale.date}\n`;
    text += `👤 Client: ${sale.client}\n`;
    text += `----------------\n`;
    sale.items.forEach(i => {
        text += `${i.qty}x ${i.name} (${i.price.toLocaleString()}F)\n`;
    });
    text += `----------------\n`;
    text += `💰 *TOTAL: ${sale.total.toLocaleString()} FCFA*\n`;
    text += `✅ Payé`;

    const encoded = encodeURIComponent(text);
    document.getElementById('btn-whatsapp').href = `https://wa.me/?text=${encoded}`;
}

window.closeReceiptModal = () => document.getElementById('receiptModal').classList.add('hidden');

// --- GESTION STOCK (AVEC VALEUR TOTALE) ---
function updateStockUI() {
    sortProducts(); 
    const list = document.getElementById('stock-list');
    
    // CALCUL DE LA VALEUR DU STOCK
    const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalItems = products.reduce((sum, p) => sum + p.stock, 0);

    // Header Statistique pour le stock
    let html = `
    <div class="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 mb-4 shadow-lg text-white border border-slate-700">
        <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Valeur du Stock</p>
        <p class="text-3xl font-mono font-bold text-blue-400 mb-1">${totalStockValue.toLocaleString()} <span class="text-sm text-slate-500">FCFA</span></p>
        <div class="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 w-full opacity-50"></div>
        </div>
        <p class="text-right text-[10px] font-bold text-slate-400 mt-1">${totalItems} articles en réserve</p>
    </div>
    `;

    if (products.length === 0) {
        html += `<p class="text-center text-slate-400 mt-4">Inventaire vide. Cliquez sur + pour commencer.</p>`;
    } else {
        html += products.map(p => `
            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center shadow-sm ${p.stock === 0 ? 'opacity-60 border border-red-200' : 'mb-3'}">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <p class="font-bold dark:text-white leading-tight ${p.stock === 0 ? 'line-through decoration-red-500' : ''}">${p.name}</p>
                        <button onclick="openProductModal(${p.id})" class="text-blue-500 hover:text-blue-600 p-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-xs"><i class="fa-solid fa-pen"></i></button>
                    </div>
                    <p class="text-xs text-slate-500">${p.category} - ${p.price.toLocaleString()} F</p>
                    ${p.stock === 0 ? '<span class="text-[10px] font-bold text-red-500 uppercase">Rupture de stock</span>' : ''}
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="adjustStock(${p.id}, -1)" class="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center"><i class="fa-solid fa-minus"></i></button>
                    <span class="font-mono font-bold w-8 text-center dark:text-white">${p.stock}</span>
                    <button onclick="adjustStock(${p.id}, 1)" class="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
        `).join('');
    }
    
    list.innerHTML = html;
}

window.adjustStock = (id, amount) => {
    const p = products.find(x => x.id === id);
    p.stock += amount;
    if (p.stock < 0) p.stock = 0;
    saveData();
    renderProducts();
    updateStockUI(); // Met à jour le total automatiquement
};

// --- MODAL ---
window.openProductModal = (id = null) => {
    const modal = document.getElementById('productModal');
    const title = modal.querySelector('h3');
    
    if (id) {
        const p = products.find(x => x.id === id);
        editingId = id;
        title.textContent = "Modifier Produit";
        document.getElementById('new-prod-name').value = p.name;
        document.getElementById('new-prod-price').value = p.price;
        document.getElementById('new-prod-stock').value = p.stock;
        document.getElementById('new-prod-cat').value = p.category;
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
    
    if (name && price >= 0) {
        if (editingId) {
            const p = products.find(x => x.id === editingId);
            p.name = name;
            p.price = price;
            p.stock = stock || 0;
            p.category = cat;
        } else {
            products.push({ id: Date.now(), name, price, stock: stock || 0, category: cat });
        }
        
        saveData();
        document.getElementById('productModal').classList.add('hidden');
        renderProducts();
        updateStockUI();
    }
};

// --- HISTORIQUE (AVEC TOTAL VENDU) ---
function updateHistoryUI() {
    const list = document.getElementById('sales-history');
    
    // CALCUL DU TOTAL VENDU (Historique Complet)
    const totalAllTime = sales.reduce((sum, s) => sum + s.total, 0);

    let html = `
    <div class="bg-gradient-to-r from-green-800 to-green-900 rounded-xl p-4 mb-4 shadow-lg text-white border border-green-700">
        <p class="text-[10px] uppercase font-bold text-green-300 tracking-wider">Chiffre d'Affaires Total</p>
        <p class="text-3xl font-mono font-bold text-white mb-1">${totalAllTime.toLocaleString()} <span class="text-sm text-green-200">FCFA</span></p>
        <div class="h-1 w-full bg-green-700 rounded-full overflow-hidden">
            <div class="h-full bg-green-400 w-full opacity-50"></div>
        </div>
        <p class="text-right text-[10px] font-bold text-green-200 mt-1">${sales.length} ventes réalisées</p>
    </div>
    `;

    if (sales.length === 0) {
        html += `<p class="text-center text-slate-400 mt-10">Aucune vente enregistrée.</p>`;
    } else {
        html += sales.map(s => `
            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 border-blue-500 mb-3">
                <div class="flex justify-between mb-2">
                    <span class="font-bold text-sm text-slate-600 dark:text-slate-400">${s.date.split(',')[0]}</span>
                    <span class="font-bold text-green-600">${s.total.toLocaleString()} F</span>
                </div>
                <div class="text-sm dark:text-white">
                    <span class="font-bold">${s.client}</span> a acheté ${s.items.length} article(s).
                </div>
            </div>
        `).join('');
    }
    list.innerHTML = html;
}

function updateDailyTotal() {
    const today = new Date().toLocaleDateString();
    const total = sales
        .filter(s => new Date(s.id).toLocaleDateString() === today)
        .reduce((sum, s) => sum + s.total, 0);
    document.getElementById('daily-total').innerText = total.toLocaleString() + ' F';
}

// --- PERSISTANCE ---
function saveData() {
    sortProducts(); 
    localStorage.setItem('shop_products', JSON.stringify(products));
    localStorage.setItem('shop_sales', JSON.stringify(sales));
}
