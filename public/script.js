document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupFileInput();
});

// --- NOTIFICATIONS ---
function showNotification(msg, type = 'success') {
    const m = document.getElementById('customAlert');
    document.getElementById('alertMessage').textContent = msg;
    document.getElementById('alertTitle').textContent = type === 'error' ? 'Erreur' : (type === 'success' ? 'Succès' : 'Info');
    document.getElementById('alertIcon').className = `fa-solid ${type === 'error' ? 'fa-xmark text-red-500' : (type === 'success' ? 'fa-check text-green-500' : 'fa-info text-blue-500')} text-3xl`;
    m.classList.remove('hidden');
}
function closeCustomAlert() { document.getElementById('customAlert').classList.add('hidden'); }

// --- AUTHENTIFICATION ---
let isRegistering = false;
function checkAuth() { if (localStorage.getItem('is_logged_in') === 'true') showApp(); }

function toggleAuthMode() {
    isRegistering = !isRegistering;
    document.getElementById('auth-btn').innerText = isRegistering ? "S'INSCRIRE" : "ENTRER";
    document.getElementById('auth-toggle-text').innerText = isRegistering ? "Retour à la connexion" : "Première visite ? Créer un accès";
}

function handleAuth() {
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    if (!u || !p) return showNotification("Champs vides !", "error");

    if (isRegistering) {
        if (localStorage.getItem('user_account')) return showNotification("Compte déjà existant.", "error");
        localStorage.setItem('user_account', JSON.stringify({ u, p }));
        localStorage.setItem('is_logged_in', 'true');
        showNotification("Compte créé !", "success");
        showApp();
    } else {
        const acc = JSON.parse(localStorage.getItem('user_account'));
        if (acc && u === acc.u && p === acc.p) {
            localStorage.setItem('is_logged_in', 'true');
            showApp();
        } else {
            showNotification("Erreur d'identification", "error");
        }
    }
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-wrapper').classList.remove('hidden');
    if (!localStorage.getItem('activeFilter') || localStorage.getItem('activeFilter') === 'all') {
        localStorage.setItem('activeFilter', 'Documents');
    }
    loadGallery();
}

// --- NOUVELLE GESTION DÉCONNEXION ---
function logoutUser() {
    // Affiche la belle modal au lieu de confirm()
    document.getElementById('logoutModal').classList.remove('hidden');
}

function confirmLogout() {
    localStorage.removeItem('is_logged_in');
    location.reload();
}

function cancelLogout() {
    document.getElementById('logoutModal').classList.add('hidden');
}

// --- LOGIQUE FICHIERS ---
function setupFileInput() {
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const cat = localStorage.getItem('activeFilter');
        
        if (cat === 'Photos' && !file.type.startsWith('image/')) return showNotification("Photos uniquement !", "error");
        if (cat === 'Video' && !file.type.startsWith('video/')) return showNotification("Vidéos uniquement !", "error");
        if (cat === 'Audio' && !file.type.startsWith('audio/')) return showNotification("Audio uniquement !", "error");

        document.getElementById('uploadPlaceholder').classList.add('hidden');
        document.getElementById('filePreviewInfo').classList.remove('hidden');
        document.getElementById('previewName').textContent = file.name;
        document.getElementById('imgTitle').value = file.name.split('.')[0];
        
        let type = 'doc';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.name.endsWith('.apk')) type = 'apk';
        else if (file.name.endsWith('.zip')) type = 'zip';
        
        document.getElementById('fileType').value = type;

        const reader = new FileReader();
        reader.onload = (ev) => document.getElementById('base64String').value = ev.target.result;
        reader.readAsDataURL(file);
    });
}

function filterGallery(cat) {
    localStorage.setItem('activeFilter', cat);
    loadGallery();
}

function loadGallery() {
    const gallery = document.getElementById('gallery');
    const currentFilter = localStorage.getItem('activeFilter') || 'Documents';
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');

    document.querySelectorAll('.filter-btn').forEach(btn => {
        const isActive = btn.id === `filter-${currentFilter}`;
        btn.className = `filter-btn px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap border ${isActive ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`;
    });

    gallery.innerHTML = '';
    const filtered = photos.filter(p => p.category === currentFilter);

    // Bouton Ajout
    const addDiv = document.createElement('div');
    addDiv.className = "aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-500 transition flex flex-col items-center justify-center cursor-pointer group";
    
    let addIcon = "fa-plus";
    let addLabel = "Ajouter";
    
    if (currentFilter === 'Photos') { addIcon = "fa-camera"; addLabel = "Photo"; }
    else if (currentFilter === 'Audio') { addIcon = "fa-microphone"; addLabel = "Audio"; }
    else if (currentFilter === 'Video') { addIcon = "fa-film"; addLabel = "Vidéo"; }
    else { addIcon = "fa-file-circle-plus"; addLabel = "Fichier"; }

    addDiv.innerHTML = `
        <div class="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-600 flex items-center justify-center mb-2 transition shadow-lg">
            <i class="fa-solid ${addIcon} text-blue-500 dark:text-blue-400 group-hover:text-white text-xl"></i>
        </div>
        <span class="text-[10px] font-bold text-slate-500 dark:text-gray-500 group-hover:text-slate-800 dark:group-hover:text-white uppercase tracking-wider">${addLabel}</span>
    `;
    addDiv.onclick = openModal;
    gallery.appendChild(addDiv);

    // Liste Fichiers
    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = "relative group aspect-square rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md";
        
        let visual = '';
        if (p.type === 'image') visual = `<img src="${p.image}" class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition">`;
        else {
            let icon = 'fa-file';
            let col = 'text-gray-500';
            if (p.type === 'video') { icon = 'fa-video'; col = 'text-red-500'; }
            if (p.type === 'audio') { icon = 'fa-music'; col = 'text-pink-500'; }
            if (p.type === 'apk') { icon = 'fa-android'; col = 'text-green-500'; }
            if (p.type === 'zip') { icon = 'fa-file-zipper'; col = 'text-yellow-500'; }
            visual = `<div class="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900"><i class="fa-solid ${icon} ${col} text-4xl"></i></div>`;
        }

        div.innerHTML = `
            <div onclick="openFullscreen('${p.id}')" class="w-full h-full cursor-pointer">
                ${visual}
                <div class="absolute bottom-0 left-0 w-full bg-white/90 dark:bg-black/60 backdrop-blur-sm p-1.5 text-center border-t border-slate-100 dark:border-transparent">
                    <p class="text-[10px] font-bold text-slate-700 dark:text-white truncate">${p.title}</p>
                </div>
            </div>
            <button onclick="deletePhoto(${p.id})" class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"><i class="fa-solid fa-trash text-[10px]"></i></button>
        `;
        gallery.appendChild(div);
    });
}

function openModal() {
    const modal = document.getElementById('uploadModal');
    const cat = localStorage.getItem('activeFilter') || 'Documents';
    const input = document.getElementById('fileInput');
    const instr = document.getElementById('uploadInstruction');
    
    document.getElementById('imgCategory').value = cat;
    
    if (cat === 'Photos') { input.accept = "image/*"; instr.textContent = "Ajouter PHOTO"; }
    else if (cat === 'Video') { input.accept = "video/*"; instr.textContent = "Ajouter VIDÉO"; }
    else if (cat === 'Audio') { input.accept = "audio/*"; instr.textContent = "Ajouter AUDIO"; }
    else { input.accept = "*"; instr.textContent = "Ajouter DOC"; }
    
    modal.classList.remove('hidden');
}

function processAndUpload() {
    const file = document.getElementById('base64String').value;
    const title = document.getElementById('imgTitle').value || 'Sans titre';
    const cat = document.getElementById('imgCategory').value;
    const type = document.getElementById('fileType').value;
    
    if(!file) return showNotification("Fichier manquant", "error");
    
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    photos.unshift({ id: Date.now(), image: file, title, category: cat, type, date: new Date().toLocaleDateString() });
    localStorage.setItem('my_gallery_data', JSON.stringify(photos));
    
    closeModal();
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('filePreviewInfo').classList.add('hidden');
    document.getElementById('fileInput').value = "";
    document.getElementById('imgTitle').value = "";
    
    showNotification("Fichier ajouté !", "success");
    loadGallery();
}

function deletePhoto(id) {
    if(!confirm("Supprimer ?")) return;
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    const newPhotos = photos.filter(p => p.id !== id);
    localStorage.setItem('my_gallery_data', JSON.stringify(newPhotos));
    loadGallery();
}

function openFullscreen(id) {
    const p = JSON.parse(localStorage.getItem('my_gallery_data') || '[]').find(x => x.id == id);
    if(!p) return;
    const c = document.getElementById('fullscreenContent');
    const m = document.getElementById('fullscreenModal');
    m.classList.remove('hidden');
    
    if (p.type === 'image') c.innerHTML = `<img src="${p.image}" class="max-h-full max-w-full rounded-lg">`;
    else if (p.type === 'video') c.innerHTML = `<video controls autoplay src="${p.image}" class="max-h-full max-w-full rounded-lg"></video>`;
    else if (p.type === 'audio') c.innerHTML = `<div class="bg-slate-800 p-8 rounded-2xl text-center"><i class="fa-solid fa-music text-6xl text-pink-500 mb-4 animate-pulse"></i><h3 class="text-white text-xl font-bold mb-4">${p.title}</h3><audio controls autoplay src="${p.image}" class="w-full"></audio></div>`;
    else c.innerHTML = `<div class="bg-slate-800 p-8 rounded-2xl text-center"><i class="fa-solid fa-download text-6xl text-blue-500 mb-4"></i><h3 class="text-white text-xl font-bold mb-4">${p.title}</h3><a href="${p.image}" download="${p.title}" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Télécharger</a></div>`;
}

function closeModal() { document.getElementById('uploadModal').classList.add('hidden'); }
function closeFullscreen() { document.getElementById('fullscreenModal').classList.add('hidden'); document.getElementById('fullscreenContent').innerHTML = ''; }
