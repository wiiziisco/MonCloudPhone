// --- CONFIGURATION & DONNÉES ---
let products = JSON.parse(localStorage.getItem('shop_products')) || [
    { id: 1, name: "Matelas Ortho 2pl", price: 120000, category: "Matelas", stock: 5 },
    { id: 2, name: "Matelas Royal 3pl", price: 250000, category: "Matelas", stock: 2 },
    { id: 3, name: "Oreiller Ergonomique", price: 15000, category: "Oreillers", stock: 20 },
    { id: 4, name: "Parure de Draps", price: 25000, category: "Draps", stock: 10 }
];

let sales = JSON.parse(localStorage.getItem('shop_sales')) || [];
let cart = {}; // { productId: quantity }
let currentFilter = 'Tout';

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateStockUI();
    updateHistoryUI();
    updateDailyTotal();
});

// --- NAVIGATION ---
window.switchTab = (tabName) => {
    // UI Onglets
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active-tab');
        btn.classList.add('inactive-tab');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active-tab');
    document.getElementById(`tab-${tabName}`).classList.remove('inactive-tab');

    // Mouvement des sections
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
    const grid = document.getElementById('product-grid');
    const categories = ['Tout', ...new Set(products.map(p => p.category))];
    
    // Filtres
    const filterContainer = document.getElementById('category-filters');
    filterContainer.innerHTML = categories.map(c => 
        `<button onclick="filter('${c}')" class="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${currentFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}">${c}</button>`
    ).join('');

    // Grille
    grid.innerHTML = products
        .filter(p => currentFilter === 'Tout' || p.category === currentFilter)
        .map(p => {
            const qtyInCart = cart[p.id] || 0;
            return `
            <div onclick="addToCart(${p.id})" class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 active:scale-95 transition relative overflow-hidden group">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">${p.category}</span>
                    <span class="text-[10px] font-bold ${p.stock < 3 ? 'text-red-500' : 'text-green-500'}">Stock: ${p.stock}</span>
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
    renderProducts(); // Met à jour les badges
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
        panel.style.transform = 'translateY(90%)';
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
                    <p class="text-xs text-slate-500">${p.price} x ${qty} = <span class="font-bold text-blue-600">${subtotal.toLocaleString()}</span></p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="removeFromCart(${id})" class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-white font-bold">-</button>
                    <span class="font-bold w-4 text-center">${qty}</span>
                    <button onclick="addToCart(${id})" class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">+</button>
                </div>
            </div>`;
        }
    }

    container.innerHTML = html;
    document.getElementById('cart-count').innerText = count;
    document.getElementById('cart-total-preview').innerText = total.toLocaleString() + ' F';
    document.getElementById('cart-total-final').innerText = total.toLocaleString() + ' FCFA';
    
    // Ouvre le panier auto si on ajoute le premier item
    if (count === 1 && document.getElementById('cart-panel').style.transform !== 'translateY(0px)') {
        window.toggleCart();
    }
}

// --- VALIDATION VENTE ---
window.processSale = () => {
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
        return sum + (products.find(x => x.id == id).price * qty);
    }, 0);

    if (total === 0) return alert("Panier vide !");

    const clientName = document.getElementById('client-name').value || "Client";
    const saleItems = [];
    
    // Déduire du stock
    for (const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        p.stock -= qty;
        saleItems.push({ name: p.name, qty: qty, price: p.price });
    }
    
    // Sauvegarde Vente
    const sale = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        client: clientName,
        items: saleItems,
        total: total
    };
    
    sales.unshift(sale);
    saveData();
    
    // UI Feedback
    showReceiptModal(sale);
    
    // Reset
    cart = {};
    document.getElementById('client-name').value = "";
    renderProducts();
    updateCartUI();
    updateDailyTotal();
    window.toggleCart(); // Fermer panier
};

function showReceiptModal(sale) {
    const modal = document.getElementById('receiptModal');
    modal.classList.remove('hidden');
    
    // Génération Texte WhatsApp
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

// --- GESTION STOCK ---
function updateStockUI() {
    const list = document.getElementById('stock-list');
    list.innerHTML = products.map(p => `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center shadow-sm">
            <div>
                <p class="font-bold dark:text-white">${p.name}</p>
                <p class="text-xs text-slate-500">${p.category} - ${p.price.toLocaleString()} F</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="adjustStock(${p.id}, -1)" class="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center"><i class="fa-solid fa-minus"></i></button>
                <span class="font-mono font-bold w-8 text-center dark:text-white">${p.stock}</span>
                <button onclick="adjustStock(${p.id}, 1)" class="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center"><i class="fa-solid fa-plus"></i></button>
            </div>
        </div>
    `).join('');
}

window.adjustStock = (id, amount) => {
    const p = products.find(x => x.id === id);
    p.stock += amount;
    if (p.stock < 0) p.stock = 0;
    saveData();
    updateStockUI();
};

window.openProductModal = () => document.getElementById('productModal').classList.remove('hidden');

window.saveNewProduct = () => {
    const name = document.getElementById('new-prod-name').value;
    const price = parseInt(document.getElementById('new-prod-price').value);
    const stock = parseInt(document.getElementById('new-prod-stock').value);
    const cat = document.getElementById('new-prod-cat').value;
    
    if (name && price) {
        products.push({ id: Date.now(), name, price, stock, category: cat });
        saveData();
        document.getElementById('productModal').classList.add('hidden');
        // Clean inputs
        document.getElementById('new-prod-name').value = "";
        document.getElementById('new-prod-price').value = "";
        updateStockUI();
    }
};

// --- HISTORIQUE ---
function updateHistoryUI() {
    const list = document.getElementById('sales-history');
    if (sales.length === 0) list.innerHTML = `<p class="text-center text-slate-400 mt-10">Aucune vente enregistrée.</p>`;
    else {
        list.innerHTML = sales.map(s => `
            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
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
    localStorage.setItem('shop_products', JSON.stringify(products));
    localStorage.setItem('shop_sales', JSON.stringify(sales));
}
