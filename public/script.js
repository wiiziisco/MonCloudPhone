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
function checkAuth() { 
    if (localStorage.getItem('is_logged_in') === 'true') {
        document.documentElement.classList.add('logged-in'); 
        showApp(); 
    }
}

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

// --- DÉCONNEXION ---
function logoutUser() { document.getElementById('logoutModal').classList.remove('hidden'); }
function confirmLogout() { localStorage.removeItem('is_logged_in'); location.reload(); }
function cancelLogout() { document.getElementById('logoutModal').classList.add('hidden'); }

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

function filterGallery(cat) { localStorage.setItem('activeFilter', cat); loadGallery(); }

// --- GESTION SÉLECTION MULTIPLE ---
let isSelectionMode = false;
let selectedItems = new Set();

function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    selectedItems.clear(); // Réinitialiser la sélection
    loadGallery(); // Recharger pour afficher/masquer les checkboxes
}

function toggleItemSelection(id) {
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    loadGallery(); // Mettre à jour l'affichage (compteur suppressions)
}

function deleteSelectedItems() {
    if (selectedItems.size === 0) return;
    if (!confirm(`Supprimer ces ${selectedItems.size} éléments ?`)) return;

    let photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    photos = photos.filter(p => !selectedItems.has(p.id));
    localStorage.setItem('my_gallery_data', JSON.stringify(photos));
    
    toggleSelectionMode(); // Quitter le mode sélection après suppression
    showNotification("Éléments supprimés", "success");
}

function loadGallery() {
    const gallery = document.getElementById('gallery');
    const currentFilter = localStorage.getItem('activeFilter') || 'Documents';
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');

    // Mise à jour de la barre de filtres (Ajout bouton SELECT)
    const filterContainer = document.querySelector('.hide-scroll');
    // On nettoie les anciens boutons Select s'ils existent (pour éviter les doublons lors des rechargements)
    const existingSelBtn = document.getElementById('btn-select-mode');
    if(existingSelBtn) existingSelBtn.remove();
    const existingDelBtn = document.getElementById('btn-delete-selected');
    if(existingDelBtn) existingDelBtn.remove();

    // Bouton SELECTION
    const selBtn = document.createElement('button');
    selBtn.id = 'btn-select-mode';
    selBtn.className = `px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap border ml-2 ${isSelectionMode ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700'}`;
    selBtn.innerHTML = isSelectionMode ? '<i class="fa-solid fa-xmark mr-1"></i> Annuler' : '<i class="fa-regular fa-square-check mr-1"></i> Sélect.';
    selBtn.onclick = toggleSelectionMode;
    filterContainer.appendChild(selBtn);

    // Bouton SUPPRIMER (Si mode sélection actif et items > 0)
    if (isSelectionMode && selectedItems.size > 0) {
        const delBtn = document.createElement('button');
        delBtn.id = 'btn-delete-selected';
        delBtn.className = "px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap border ml-2 bg-red-600 text-white border-red-600 animate-pulse";
        delBtn.innerHTML = `<i class="fa-solid fa-trash mr-1"></i> Supprimer (${selectedItems.size})`;
        delBtn.onclick = deleteSelectedItems;
        filterContainer.appendChild(delBtn);
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        const isActive = btn.id === `filter-${currentFilter}`;
        btn.className = `filter-btn px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap border ${isActive ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`;
    });

    gallery.innerHTML = '';
    const filtered = photos.filter(p => p.category === currentFilter);

    // Bouton Ajout (Caché en mode sélection)
    if (!isSelectionMode) {
        const addDiv = document.createElement('div');
        addDiv.className = "aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-500 transition flex flex-col items-center justify-center cursor-pointer group";
        
        let addIcon = "fa-plus"; let addLabel = "Ajouter";
        if (currentFilter === 'Photos') { addIcon = "fa-camera"; addLabel = "Photo"; }
        else if (currentFilter === 'Audio') { addIcon = "fa-microphone"; addLabel = "Audio"; }
        else if (currentFilter === 'Video') { addIcon = "fa-film"; addLabel = "Vidéo"; }
        else { addIcon = "fa-file-circle-plus"; addLabel = "Fichier"; }

        addDiv.innerHTML = `<div class="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-600 flex items-center justify-center mb-2 transition shadow-lg"><i class="fa-solid ${addIcon} text-blue-500 dark:text-blue-400 group-hover:text-white text-xl"></i></div><span class="text-[10px] font-bold text-slate-500 dark:text-gray-500 group-hover:text-slate-800 dark:group-hover:text-white uppercase tracking-wider">${addLabel}</span>`;
        addDiv.onclick = openModal;
        gallery.appendChild(addDiv);
    }

    // Liste Fichiers
    filtered.forEach(p => {
        const div = document.createElement('div');
        // Bordure change si sélectionné
        const isSel = selectedItems.has(p.id);
        div.className = `relative group aspect-square rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border transition-all shadow-md ${isSel ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`;
        
        let visual = '';
        if (p.type === 'image') visual = `<img src="${p.image}" class="w-full h-full object-cover transition ${isSelectionMode ? 'opacity-70' : 'opacity-90 group-hover:opacity-100'}">`;
        else {
            let icon = 'fa-file'; let col = 'text-gray-500';
            if (p.type === 'video') { icon = 'fa-video'; col = 'text-red-500'; }
            if (p.type === 'audio') { icon = 'fa-music'; col = 'text-pink-500'; }
            if (p.type === 'apk') { icon = 'fa-android'; col = 'text-green-500'; }
            if (p.type === 'zip') { icon = 'fa-file-zipper'; col = 'text-yellow-500'; }
            visual = `<div class="w-full h-full flex items-center justify-center ${isSel ? 'bg-transparent' : 'bg-slate-50 dark:bg-slate-900'}"><i class="fa-solid ${icon} ${col} text-4xl"></i></div>`;
        }

        // Action au clic : Sélection ou Ouverture
        const clickAction = isSelectionMode ? `toggleItemSelection(${p.id})` : `openFullscreen('${p.id}')`;

        div.innerHTML = `
            <div onclick="${clickAction}" class="w-full h-full cursor-pointer">
                ${visual}
                <div class="absolute bottom-0 left-0 w-full bg-white/90 dark:bg-black/60 backdrop-blur-sm p-1.5 text-center border-t border-slate-100 dark:border-transparent">
                    <p class="text-[10px] font-bold text-slate-700 dark:text-white truncate">${p.title}</p>
                </div>
                
                ${isSelectionMode ? `
                    <div class="absolute top-2 right-2 w-6 h-6 rounded-full border-2 ${isSel ? 'bg-blue-500 border-blue-500' : 'bg-white/20 border-white'} flex items-center justify-center transition-colors">
                        ${isSel ? '<i class="fa-solid fa-check text-white text-xs"></i>' : ''}
                    </div>
                ` : ''}
            </div>
            ${!isSelectionMode ? `<button onclick="deletePhoto(${p.id})" class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"><i class="fa-solid fa-trash text-[10px]"></i></button>` : ''}
        `;
        gallery.appendChild(div);
    });
}

// --- MODALES & UPLOAD ---
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

function closeModal() { document.getElementById('uploadModal').classList.add('hidden'); }

// --- LECTEUR MULTIMÉDIA CYBERPUNK ---
let mediaInterval;

function openFullscreen(id) {
    const p = JSON.parse(localStorage.getItem('my_gallery_data') || '[]').find(x => x.id == id);
    if(!p) return;
    
    const c = document.getElementById('fullscreenContent');
    const m = document.getElementById('fullscreenModal');
    m.classList.remove('hidden');

    if (p.type === 'image') {
        c.innerHTML = `<img src="${p.image}" class="max-h-full max-w-full rounded-lg shadow-2xl">`;
    } 
    else if (p.type === 'video' || p.type === 'audio') {
        const isVideo = p.type === 'video';
        const tag = isVideo ? 'video' : 'audio';
        const audioVisual = isVideo ? '' : `<div class="text-center mb-8"><i class="fa-solid fa-music text-6xl text-cyan-400 animate-pulse"></i><h3 class="text-white text-xl mt-4 font-bold tracking-widest">${p.title}</h3></div>`;
        
        c.innerHTML = `
            <div class="relative w-full max-w-4xl group">
                ${audioVisual}
                <${tag} id="customPlayer" src="${p.image}" class="w-full rounded-lg shadow-[0_0_30px_rgba(0,243,255,0.2)] bg-black" ${isVideo ? 'playsinline' : ''}></${tag}>
                <div class="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-cyan-500/30 flex flex-col gap-2 shadow-2xl transition-opacity duration-300 ${isVideo ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}">
                    <input type="range" id="progressBar" value="0" step="0.1" class="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:h-2 transition-all" oninput="seekMedia()">
                    <div class="flex items-center justify-between mt-1">
                        <div class="flex items-center gap-4">
                            <button onclick="togglePlay()" class="text-cyan-400 hover:text-white transition text-xl w-8"><i id="playIcon" class="fa-solid fa-play"></i></button>
                            <span id="timeDisplay" class="text-xs font-mono text-cyan-400/80">00:00 / 00:00</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <button onclick="toggleMute()" class="text-slate-400 hover:text-white transition"><i id="volIcon" class="fa-solid fa-volume-high"></i></button>
                            ${isVideo ? '<button onclick="toggleFS()" class="text-slate-400 hover:text-white transition"><i class="fa-solid fa-expand"></i></button>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const player = document.getElementById('customPlayer');
        const progressBar = document.getElementById('progressBar');
        player.onloadedmetadata = () => { progressBar.max = player.duration; updateTimeDisplay(); };
        player.ontimeupdate = () => { if (!document.getElementById('progressBar').matches(':active')) { progressBar.value = player.currentTime; } updateTimeDisplay(); };
        player.onended = () => { document.getElementById('playIcon').className = "fa-solid fa-rotate-right"; };
        player.play().then(() => { document.getElementById('playIcon').className = "fa-solid fa-pause"; }).catch(e => console.log("Autoplay bloqué"));
    } 
    else {
        c.innerHTML = `<div class="bg-slate-800 p-8 rounded-2xl text-center border border-slate-700"><i class="fa-solid fa-download text-6xl text-blue-500 mb-4"></i><h3 class="text-white text-xl font-bold mb-4">${p.title}</h3><a href="${p.image}" download="${p.title}" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-500 transition">Télécharger</a></div>`;
    }
}

function closeFullscreen() { 
    const player = document.getElementById('customPlayer');
    if(player) player.pause();
    document.getElementById('fullscreenModal').classList.add('hidden'); 
    document.getElementById('fullscreenContent').innerHTML = ''; 
}

function togglePlay() { const p = document.getElementById('customPlayer'); const i = document.getElementById('playIcon'); if (p.paused) { p.play(); i.className = "fa-solid fa-pause"; } else { p.pause(); i.className = "fa-solid fa-play"; } }
function seekMedia() { const p = document.getElementById('customPlayer'); const bar = document.getElementById('progressBar'); p.currentTime = bar.value; }
function updateTimeDisplay() { const p = document.getElementById('customPlayer'); const display = document.getElementById('timeDisplay'); const fmt = (s) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`; }; if(p.duration) display.textContent = `${fmt(p.currentTime)} / ${fmt(p.duration)}`; }
function toggleMute() { const p = document.getElementById('customPlayer'); const i = document.getElementById('volIcon'); p.muted = !p.muted; i.className = p.muted ? "fa-solid fa-volume-xmark text-red-500" : "fa-solid fa-volume-high"; }
function toggleFS() { const p = document.getElementById('customPlayer'); if (p.requestFullscreen) p.requestFullscreen(); }
