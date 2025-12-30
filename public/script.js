// --- SÉCURITÉ (PIN CODE) ---
let currentPinInput = "";
// CODES MODIFIÉS ICI
const DEFAULT_PIN = "8388"; 
const RESET_PIN = "1999"; 

let userPin = localStorage.getItem('shop_pin') || DEFAULT_PIN;

if (!sessionStorage.getItem('is_logged_in')) {
    // Lock screen visible par défaut
} else {
    const lockScreen = document.getElementById('lock-screen');
    if(lockScreen) lockScreen.style.display = 'none';
}

window.enterPin = (num) => {
    if (currentPinInput.length < 4) {
        currentPinInput += num;
        updatePinDots();
        
        if (currentPinInput.length === 4) {
            checkPin();
        }
    }
};

window.clearPin = () => {
    currentPinInput = "";
    updatePinDots();
};

function updatePinDots() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        if (index < currentPinInput.length) {
            dot.classList.remove('bg-slate-700');
            dot.classList.add('bg-blue-500');
        } else {
            dot.classList.remove('bg-blue-500');
            dot.classList.add('bg-slate-700');
        }
    });
}

function checkPin() {
    // CAS SPÉCIAL : CODE RESET TOTAL
    if (currentPinInput === RESET_PIN) {
        document.getElementById('resetModal').classList.remove('hidden');
        return;
    }

    // VÉRIFICATION NORMALE
    if (currentPinInput === userPin) {
        sessionStorage.setItem('is_logged_in', 'true');
        const lockScreen = document.getElementById('lock-screen');
        lockScreen.style.opacity = '0';
        setTimeout(() => {
            lockScreen.style.display = 'none';
        }, 300);
    } else {
        navigator.vibrate(200);
        const dots = document.querySelectorAll('.dot');
        dots.forEach(d => d.classList.add('bg-red-500'));
        setTimeout(() => {
            currentPinInput = "";
            updatePinDots();
            dots.forEach(d => d.classList.remove('bg-red-500'));
        }, 500);
    }
}

// --- NOUVELLES FONCTIONS RESET ---
window.closeResetModal = () => {
    document.getElementById('resetModal').classList.add('hidden');
    currentPinInput = ""; 
    updatePinDots(); 
};

window.executeReset = () => {
    localStorage.clear();
    document.body.style.opacity = '0';
    setTimeout(() => {
        window.location.reload();
    }, 500);
};

// --- CONFIGURATION & DONNÉES ---
let products = JSON.parse(localStorage.getItem('shop_products')) || []; 
let sales = JSON.parse(localStorage.getItem('shop_sales')) || [];

let cart = {}; 
let cartPrices = {}; 
let currentFilter = 'Tout';
let editingId = null;
let negotiatingId = null;
let tempImageBase64 = null;

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    products = products.filter(p => p.category !== 'Draps' && p.name !== 'Parure de Draps');
    products.forEach(p => {
        if (p.totalInput === undefined) p.totalInput = p.stock;
    });
    saveData();

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

// --- GESTION IMAGE ---
window.handleImageUpload = (input) => {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 200;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                tempImageBase64 = canvas.toDataURL('image/jpeg', 0.6);
                const preview = document.getElementById('image-preview');
                preview.src = tempImageBase64;
                preview.classList.remove('hidden');
                document.getElementById('image-preview-container').classList.add('opacity-0');
            }
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
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
    
    if (categories.length <= 1 && products.length === 0) {
        filterContainer.innerHTML = '';
    } else {
        filterContainer.innerHTML = categories.map(c => 
            `<button onclick="filter('${c}')" class="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${currentFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}">${c}</button>`
        ).join('');
    }

    if (products.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center mt-20 p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl opacity-50">
            <i class="fa-solid fa-box-open text-4xl text-slate-400 mb-4"></i>
            <p class="text-slate-500 dark:text-slate-400 font-bold mb-4">Prêt au décollage !</p>
            <button onclick="switchTab('stock'); openProductModal()" class="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30">Créer le 1er Article</button>
        </div>`;
        return;
    }

    grid.innerHTML = products
        .filter(p => currentFilter === 'Tout' || p.category === currentFilter)
        .map(p => {
            const qtyInCart = cart[p.id] || 0;
            const isOutOfStock = p.stock === 0;
            const imgHtml = p.image 
                ? `<img src="${p.image}" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition duration-500">`
                : `<div class="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center"><i class="fa-solid fa-box-open text-4xl text-slate-600"></i></div>`;
            const overlay = `<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>`;

            return `
            <div onclick="${isOutOfStock ? '' : `addToCart(${p.id})`}" class="aspect-[4/5] relative rounded-2xl shadow-sm overflow-hidden group border border-white/5 active:scale-95 transition">
                ${imgHtml}
                ${overlay}
                <div class="absolute top-2 right-2 z-10">
                    ${qtyInCart > 0 ? `<div class="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">${qtyInCart}</div>` : ''}
                </div>
                <div class="absolute top-2 left-2 z-10">
                    <span class="text-[9px] font-bold px-2 py-1 rounded bg-black/50 text-white backdrop-blur-sm border border-white/10 uppercase tracking-wider">${p.category}</span>
                </div>
                <div class="absolute bottom-0 w-full p-3 z-10">
                    <div class="flex justify-between items-end">
                        <div>
                            <h3 class="font-bold text-white text-sm leading-tight mb-1 shadow-black drop-shadow-md">${p.name}</h3>
                            <p class="text-cyberBlue font-mono font-bold text-lg drop-shadow-md">${p.price.toLocaleString()} <span class="text-xs">F</span></p>
                        </div>
                    </div>
                    ${isOutOfStock ? '<div class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"><span class="text-red-500 font-bold border border-red-500 px-3 py-1 rounded rotate-12">RUPTURE</span></div>' : ''}
                </div>
            </div>`;
        }).join('');
}

window.filter = (cat) => { currentFilter = cat; renderProducts(); };

window.addToCart = (id) => {
    const p = products.find(x => x.id === id);
    if (p.stock <= (cart[id] || 0)) return alert("Stock insuffisant !");
    if (!cart[id]) cartPrices[id] = p.price;
    cart[id] = (cart[id] || 0) + 1;
    renderProducts(); 
    updateCartUI();
};

window.removeFromCart = (id) => {
    if (cart[id]) {
        cart[id]--;
        if (cart[id] === 0) {
            delete cart[id];
            delete cartPrices[id];
        }
        renderProducts();
        updateCartUI();
    }
};

window.editCartPrice = (id) => {
    const p = products.find(x => x.id === id);
    const currentPrice = cartPrices[id] || p.price;
    negotiatingId = id;
    document.getElementById('price-modal-product').textContent = p.name;
    document.getElementById('negotiated-price').value = currentPrice;
    document.getElementById('priceModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('negotiated-price').focus(), 100);
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
            const sellingPrice = cartPrices[id] !== undefined ? cartPrices[id] : p.price;
            const subtotal = sellingPrice * qty;
            total += subtotal;
            count += qty;
            const isModified = sellingPrice !== p.price;
            const priceColor = isModified ? (sellingPrice > p.price ? 'text-green-500' : 'text-orange-500') : 'text-blue-600';

            html += `
            <div class="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                <div class="flex-1">
                    <p class="font-bold text-sm text-slate-800 dark:text-white">${p.name}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <button onclick="editCartPrice(${id})" class="text-xs bg-white dark:bg-white/10 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-lg font-mono font-bold flex items-center gap-1 ${priceColor}">
                            ${sellingPrice.toLocaleString()} F
                            <i class="fa-solid fa-pen text-[10px] opacity-50"></i>
                        </button>
                        <span class="text-xs text-slate-400">x ${qty} = ${subtotal.toLocaleString()}</span>
                    </div>
                </div>
                <div class="flex items-center gap-3 ml-2">
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

window.processSale = () => {
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
        const sellingPrice = cartPrices[id] !== undefined ? cartPrices[id] : products.find(x => x.id == id).price;
        return sum + (sellingPrice * qty);
    }, 0);

    if (total === 0) return alert("Panier vide !");

    const clientName = document.getElementById('client-name').value || "Client";
    const saleItems = [];
    
    for (const [id, qty] of Object.entries(cart)) {
        const p = products.find(x => x.id == id);
        const sellingPrice = cartPrices[id] !== undefined ? cartPrices[id] : p.price;
        p.stock -= qty;
        saleItems.push({ name: p.name, qty: qty, price: sellingPrice });
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
    cartPrices = {};
    document.getElementById('client-name').value = "";
    renderProducts();
    updateStockUI();
    updateCartUI();
    updateDailyTotal();
    window.toggleCart();
};

function showReceiptModal(sale) {
    const modal = document.getElementById('receiptModal');
    modal.classList.remove('hidden');
    let text = `🧾 *REÇU INVENTAIRE*\n`;
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

// --- GESTION STOCK (HAUSSE + RISTOURNE) ---
function updateStockUI() {
    sortProducts(); 
    const list = document.getElementById('stock-list');
    const currentYear = new Date().getFullYear();

    const annualProducts = products.filter(p => new Date(p.id).getFullYear() === currentYear);
    const currentStockValue = annualProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalBudgetValue = annualProducts.reduce((sum, p) => sum + (p.price * (p.totalInput || 0)), 0);
    const ristourne = Math.round(totalBudgetValue * 0.09);

    let html = `
    <div class="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 mb-4 shadow-lg text-white border border-slate-700 relative overflow-hidden">
        <div class="relative z-10">
            <div class="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                <div>
                    <p class="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Entrées (${currentYear})</p>
                    <p class="text-2xl font-mono font-bold text-white">${totalBudgetValue.toLocaleString()} <span class="text-xs text-slate-500">F</span></p>
                </div>
                <div class="bg-white/5 p-2 rounded-lg"><i class="fa-solid fa-truck-ramp-box text-xl text-slate-400"></i></div>
            </div>
            <div class="flex justify-between items-end">
                <div>
                    <p class="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">Valeur Restante</p>
                    <p class="text-xl font-mono font-bold text-cyan-400">${currentStockValue.toLocaleString()} <span class="text-xs text-cyan-600">F</span></p>
                </div>
                <div class="text-right">
                    <p class="text-[8px] uppercase text-orange-400/80 font-bold mb-1">Ristourne (Sur Achats)</p>
                    <div class="inline-flex items-center gap-2 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                        <span class="text-orange-400 text-xs font-bold">9%</span>
                        <span class="text-orange-400 font-mono font-bold text-sm">${ristourne.toLocaleString()} F</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    if (products.length === 0) {
        html += `<div class="text-center mt-10 opacity-50"><i class="fa-solid fa-wind text-4xl text-slate-600 mb-2"></i><p class="text-slate-500 text-sm">Le stock est vide.</p></div>`;
    } else {
        html += products.map(p => `
            <div class="bg-white dark:bg-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm ${p.stock === 0 ? 'opacity-60 border border-red-200' : 'mb-3'}">
                <div class="flex items-center gap-3 flex-1">
                    <div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex-none">
                         ${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-slate-400"><i class="fa-solid fa-image"></i></div>'}
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-0.5">
                            <p class="font-bold dark:text-white leading-tight ${p.stock === 0 ? 'line-through decoration-red-500' : ''}">${p.name}</p>
                            <button onclick="openProductModal(${p.id})" class="text-blue-500 hover:text-blue-600 p-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-xs"><i class="fa-solid fa-pen"></i></button>
                        </div>
                        <p class="text-xs text-slate-500">${p.category} - ${p.price.toLocaleString()} F</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 ml-2">
                    <button onclick="adjustStock(${p.id}, -1)" class="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center"><i class="fa-solid fa-minus"></i></button>
                    <span class="font-mono font-bold w-6 text-center dark:text-white text-sm">${p.stock}</span>
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
    if (amount > 0) p.totalInput = (p.totalInput || 0) + amount;
    if (p.stock < 0) p.stock = 0;
    saveData();
    renderProducts();
    updateStockUI();
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
        const p = products.find(x => x.id === id);
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
    if (name && price >= 0) {
        if (editingId) {
            const p = products.find(x => x.id === editingId);
            p.name = name;
            p.price = price;
            p.stock = stock || 0;
            p.category = cat;
            if (tempImageBase64) p.image = tempImageBase64;
        } else {
            products.push({ 
                id: Date.now(), 
                name, 
                price, 
                stock: stock || 0, 
                totalInput: stock || 0, 
                category: cat,
                image: tempImageBase64 
            });
        }
        saveData();
        document.getElementById('productModal').classList.add('hidden');
        renderProducts();
        updateStockUI();
    }
};

function updateHistoryUI() {
    const list = document.getElementById('sales-history');
    const currentYear = new Date().getFullYear();
    const totalAllTime = sales.reduce((sum, s) => sum + s.total, 0);
    const totalYear = sales.filter(s => new Date(s.id).getFullYear() === currentYear).reduce((sum, s) => sum + s.total, 0);

    let html = `
    <div class="bg-gradient-to-r from-blue-800 to-indigo-900 rounded-xl p-4 mb-4 shadow-lg text-white border border-blue-700 relative overflow-hidden">
        <div class="relative z-10">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-[10px] uppercase font-bold text-blue-300 tracking-wider">CA Annuel (${currentYear})</p>
                    <p class="text-3xl font-mono font-bold text-white mb-1">${totalYear.toLocaleString()} <span class="text-sm text-blue-200">F</span></p>
                </div>
                <div class="bg-white/10 p-2 rounded-lg backdrop-blur-sm"><i class="fa-solid fa-chart-line text-2xl text-blue-300"></i></div>
            </div>
        </div>
        <i class="fa-solid fa-coins absolute -bottom-4 -right-4 text-8xl text-white/5 rotate-12"></i>
    </div>
    <div class="bg-slate-800 rounded-xl p-3 flex justify-between items-center border border-slate-700 mb-4">
        <span class="text-xs text-slate-400 font-bold uppercase">Total Global (Historique)</span>
        <span class="font-mono font-bold text-slate-200">${totalAllTime.toLocaleString()} F</span>
    </div>`;

    if (sales.length === 0) {
        html += `<div class="text-center mt-10 opacity-50"><i class="fa-solid fa-file-invoice text-4xl text-slate-600 mb-2"></i><p class="text-slate-500 text-sm">Aucune vente.</p></div>`;
    } else {
        html += sales.map(s => `
            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 border-blue-500 mb-3">
                <div class="flex justify-between mb-2"><span class="font-bold text-sm text-slate-600 dark:text-slate-400">${s.date.split(',')[0]}</span><span class="font-bold text-green-600">${s.total.toLocaleString()} F</span></div>
                <div class="text-sm dark:text-white"><span class="font-bold">${s.client}</span> a acheté ${s.items.length} article(s).</div>
            </div>`).join('');
    }
    list.innerHTML = html;
}

function updateDailyTotal() {
    const today = new Date().toLocaleDateString();
    const total = sales.filter(s => new Date(s.id).toLocaleDateString() === today).reduce((sum, s) => sum + s.total, 0);
    document.getElementById('daily-total').innerText = total.toLocaleString() + ' F';
}

function saveData() {
    sortProducts(); 
    localStorage.setItem('shop_products', JSON.stringify(products));
    localStorage.setItem('shop_sales', JSON.stringify(sales));
}
