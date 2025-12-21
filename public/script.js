document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupFileInput();
});

// --- SYSTÈME DE NOTIFICATION (REMPLACE ALERT) ---
function showNotification(message, type = 'success') {
    const modal = document.getElementById('customAlert');
    const title = document.getElementById('alertTitle');
    const msg = document.getElementById('alertMessage');
    const iconDiv = document.getElementById('alertIconDiv');
    const icon = document.getElementById('alertIcon');

    msg.textContent = message;
    modal.classList.remove('hidden');

    if (type === 'success') {
        title.textContent = "Succès";
        title.className = "text-white font-bold text-lg mb-2";
        iconDiv.className = "w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4";
        icon.className = "fa-solid fa-check text-3xl text-green-500";
    } else if (type === 'error') {
        title.textContent = "Erreur";
        title.className = "text-red-500 font-bold text-lg mb-2";
        iconDiv.className = "w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4";
        icon.className = "fa-solid fa-xmark text-3xl text-red-500";
    } else {
        title.textContent = "Info";
        title.className = "text-blue-400 font-bold text-lg mb-2";
        iconDiv.className = "w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4";
        icon.className = "fa-solid fa-info text-3xl text-blue-500";
    }
}

function closeCustomAlert() {
    document.getElementById('customAlert').classList.add('hidden');
}

// --- AUTHENTIFICATION ---
let isRegistering = false;

function checkAuth() {
    if (localStorage.getItem('is_logged_in') === 'true') {
        showApp();
    }
}

function toggleAuthMode() {
    isRegistering = !isRegistering;
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('auth-toggle-text');
    
    if (isRegistering) {
        btn.innerText = "S'INSCRIRE";
        toggle.innerText = "Retour à la connexion";
    } else {
        btn.innerText = "ENTRER";
        toggle.innerText = "Première visite ? Créer un accès";
    }
}

function handleAuth() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (!user || !pass) return showNotification("Veuillez remplir tous les champs.", "error");

    if (isRegistering) {
        if (localStorage.getItem('user_account')) {
            return showNotification("Un compte existe déjà sur cet appareil.", "error");
        }
        localStorage.setItem('user_account', JSON.stringify({ u: user, p: pass }));
        localStorage.setItem('is_logged_in', 'true');
        showNotification("Bienvenue " + user + " ! Votre espace est prêt.", "success");
        showApp();
    } else {
        const stored = JSON.parse(localStorage.getItem('user_account'));
        if (!stored) return showNotification("Aucun compte trouvé. Veuillez vous inscrire.", "error");
        
        if (user === stored.u && pass === stored.p) {
            localStorage.setItem('is_logged_in', 'true');
            showApp();
        } else {
            showNotification("Identifiants incorrects.", "error");
        }
    }
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    if (!localStorage.getItem('activeFilter') || localStorage.getItem('activeFilter') === 'all') {
        localStorage.setItem('activeFilter', 'Documents');
    }
    loadGallery();
}

function logoutUser() {
    if(confirm("Se déconnecter ?")) { // On garde confirm() ici car c'est une action système
        localStorage.removeItem('is_logged_in');
        location.reload();
    }
}

// --- GESTION FICHIERS ---
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const currentFolder = localStorage.getItem('activeFilter');
        
        // Validation visuelle avec les nouvelles notifications
        if (currentFolder === 'Photos' && !file.type.startsWith('image/')) return showNotification("Ici, seulement les PHOTOS !", "error");
        if (currentFolder === 'Video' && !file.type.startsWith('video/')) return showNotification("Ici, seulement les VIDÉOS !", "error");
        if (currentFolder === 'Audio' && !file.type.startsWith('audio/')) return showNotification("Ici, seulement l'AUDIO !", "error");
        
        document.getElementById('uploadPlaceholder').classList.add('hidden');
        document.getElementById('filePreviewInfo').classList.remove('hidden');
        document.getElementById('previewName').textContent = file.name;
        document.getElementById('imgTitle').value = file.name.split('.')[0];

        let icon = "fa-file";
        let type = "doc";
        if (file.type.startsWith('image/')) { icon = "fa-image"; type = "image"; }
        else if (file.type.startsWith('audio/')) { icon = "fa-music"; type = "audio"; }
        else if (file.type.startsWith('video/')) { icon = "fa-video"; type = "video"; }
        else if (file.name.endsWith('.apk')) { icon = "fa-android"; type = "apk"; }
        else if (file.name.endsWith('.zip')) { icon = "fa-file-zipper"; type = "zip"; }

        document.getElementById('previewIcon').className = `fa-solid ${icon} text-4xl text-blue-500 mb-2`;
        document.getElementById('fileType').value = type;

        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('base64String').value = e.target.result;
        reader.readAsDataURL(file);
    });
}

function openModal() { 
    const modal = document.getElementById('uploadModal');
    const currentFolder = localStorage.getItem('activeFilter') || 'Documents';
    const input = document.getElementById('fileInput');
    const instruction = document.getElementById('uploadInstruction');
    const allowed = document.getElementById('allowedTypes');
    const categorySelect = document.getElementById('imgCategory');

    categorySelect.value = currentFolder;
    
    // Définition stricte des types acceptés par l'explorateur de fichiers
    if (currentFolder === 'Photos') {
        input.accept = "image/*";
        instruction.innerText = "Ajouter une PHOTO";
        allowed.innerText = "JPG, PNG, GIF...";
    } else if (currentFolder === 'Video') {
        input.accept = "video/*";
        instruction.innerText = "Ajouter une VIDÉO";
        allowed.innerText = "MP4, MKV, AVI...";
    } else if (currentFolder === 'Audio') {
        input.accept = "audio/*";
        instruction.innerText = "Ajouter un AUDIO";
        allowed.innerText = "MP3, WAV, M4A...";
    } else {
        input.accept = ".pdf,.doc,.docx,.txt,.zip,.rar,.apk,.exe";
        instruction.innerText = "Ajouter un DOCUMENT";
        allowed.innerText = "PDF, ZIP, APK, TXT...";
    }
    modal.classList.remove('hidden'); 
}

function loadGallery() {
    const gallery = document.getElementById('gallery');
    const currentFilter = localStorage.getItem('activeFilter') || 'Documents';
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');

    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(btn.id === `filter-${currentFilter}`) {
            btn.classList.remove('bg-slate-800', 'text-gray-400');
            btn.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
        } else {
            btn.classList.add('bg-slate-800', 'text-gray-400');
            btn.classList.remove('bg-blue-600', 'text-white', 'shadow-lg');
        }
    });

    gallery.innerHTML = '';
    const filtered = photos.filter(p => p.category === currentFilter);

    // Bouton Ajout
    const addDiv = document.createElement('div');
    addDiv.className = "aspect-square rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 flex flex-col items-center justify-center cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition group";
    
    let addIcon = "fa-plus";
    if (currentFilter === 'Photos') addIcon = "fa-camera";
    else if (currentFilter === 'Audio') addIcon = "fa-microphone";
    else if (currentFilter === 'Video') addIcon = "fa-video-plus";
    else if (currentFilter === 'Documents') addIcon = "fa-file-circle-plus";

    addDiv.innerHTML = `
        <div class="w-12 h-12 rounded-full bg-slate-700 group-hover:bg-blue-600 flex items-center justify-center mb-2 transition shadow-lg">
            <i class="fa-solid ${addIcon} text-blue-400 group-hover:text-white text-xl transition"></i>
        </div>
        <span class="text-[10px] font-bold text-gray-400 group-hover:text-white uppercase tracking-wider">Ajouter</span>
    `;
    addDiv.onclick = openModal;
    gallery.appendChild(addDiv);

    // Fichiers
    filtered.forEach(photo => {
        const div = document.createElement('div');
        div.className = "relative group aspect-square rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shadow-lg";
        
        let visual = '';
        if (photo.type === 'image') visual = `<img src="${photo.image}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition">`;
        else {
            let icon = 'fa-file';
            let color = 'text-gray-500';
            if (photo.type === 'audio') { icon = 'fa-music'; color = 'text-pink-500'; }
            if (photo.type === 'video') { icon = 'fa-video'; color = 'text-red-500'; }
            if (photo.type === 'apk') { icon = 'fa-android'; color = 'text-green-500'; }
            if (photo.type === 'zip') { icon = 'fa-file-zipper'; color = 'text-yellow-500'; }
            visual = `<div class="w-full h-full flex items-center justify-center bg-slate-900"><i class="fa-solid ${icon} ${color} text-4xl"></i></div>`;
        }

        div.innerHTML = `
            <div onclick="openFullscreen('${photo.id}')" class="cursor-pointer w-full h-full">
                ${visual}
                <div class="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2">
                    <h3 class="font-bold text-xs text-white truncate text-center">${photo.title}</h3>
                </div>
            </div>
            <button onclick="deletePhoto(${photo.id})" class="absolute top-2 right-2 bg-red-500/80 text-white w-8 h-8 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg backdrop-blur-sm"><i class="fa-solid fa-trash text-xs"></i></button>
        `;
        gallery.appendChild(div);
    });
}

function processAndUpload() {
    const file = document.getElementById('base64String').value;
    const title = document.getElementById('imgTitle').value;
    const cat = document.getElementById('imgCategory').value;
    const type = document.getElementById('fileType').value;
    
    if(!file) return showNotification("Fichier manquant !", "error");
    
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    photos.unshift({ id: Date.now(), image: file, title: title, category: cat, type: type, date: new Date().toLocaleDateString() });
    localStorage.setItem('my_gallery_data', JSON.stringify(photos));
    
    closeModal();
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('filePreviewInfo').classList.add('hidden');
    document.getElementById('fileInput').value = "";
    showNotification("Fichier ajouté avec succès !", "success");
    loadGallery();
}

function openFullscreen(id) {
    const p = JSON.parse(localStorage.getItem('my_gallery_data') || '[]').find(x => x.id == id);
    if(!p) return;
    const c = document.getElementById('fullscreenContent');
    const m = document.getElementById('fullscreenModal');
    m.classList.remove('hidden');
    
    if (p.type === 'image') c.innerHTML = `<img src="${p.image}" class="max-h-full max-w-full rounded-lg shadow-2xl">`;
    else if (p.type === 'video') c.innerHTML = `<video controls autoplay src="${p.image}" class="max-h-full max-w-full rounded-lg shadow-2xl"></video>`;
    else if (p.type === 'audio') c.innerHTML = `<div class="bg-slate-800 p-8 rounded-2xl text-center border border-slate-700 shadow-2xl"><i class="fa-solid fa-music text-6xl text-pink-500 mb-6 animate-pulse"></i><h3 class="text-white text-xl font-bold mb-6">${p.title}</h3><audio controls autoplay src="${p.image}" class="w-64"></audio></div>`;
    else c.innerHTML = `<div class="bg-slate-800 p-8 rounded-2xl text-center border border-slate-700 shadow-2xl"><i class="fa-solid fa-download text-6xl text-blue-500 mb-6"></i><h3 class="text-white text-xl font-bold mb-6">${p.title}</h3><a href="${p.image}" download="${p.title}" class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg">Télécharger le fichier</a></div>`;
}

function deletePhoto(id) {
    if(!confirm("Vraiment supprimer ?")) return;
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]').filter(p => p.id !== id);
    localStorage.setItem('my_gallery_data', JSON.stringify(photos));
    loadGallery();
    showNotification("Fichier supprimé.", "info");
}

function closeModal() { document.getElementById('uploadModal').classList.add('hidden'); }
function closeFullscreen() { document.getElementById('fullscreenModal').classList.add('hidden'); document.getElementById('fullscreenContent').innerHTML = ''; }
