document.addEventListener('DOMContentLoaded', () => {
    checkAuth(); // Vérifie si on est connecté au chargement
    setupFileInput();
});

// --- SYSTÈME D'AUTHENTIFICATION ---
let isRegistering = false; // Mode actuel (Connexion par défaut)

function checkAuth() {
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    if (isLoggedIn) {
        showApp(); // Si connecté, montrer l'app direct
    } else {
        // Sinon, rester sur l'écran de login
    }
}

function toggleAuthMode() {
    isRegistering = !isRegistering;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('auth-toggle-text');

    if (isRegistering) {
        title.innerText = "Créer un compte";
        btn.innerText = "S'INSCRIRE";
        toggle.innerText = "Déjà un compte ? Se connecter";
    } else {
        title.innerText = "Connexion";
        btn.innerText = "ENTRER";
        toggle.innerText = "Pas de compte ? Créer un compte";
    }
}

function handleAuth() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (!user || !pass) return alert("Veuillez tout remplir !");

    if (isRegistering) {
        // --- INSCRIPTION ---
        if (localStorage.getItem('user_account')) {
            return alert("Un compte existe déjà sur cet appareil !");
        }
        const account = { u: user, p: pass };
        localStorage.setItem('user_account', JSON.stringify(account));
        localStorage.setItem('is_logged_in', 'true');
        alert("Compte créé avec succès ! Bienvenue " + user);
        showApp();
    } else {
        // --- CONNEXION ---
        const stored = JSON.parse(localStorage.getItem('user_account'));
        if (!stored) return alert("Aucun compte trouvé. Veuillez vous inscrire.");
        
        if (user === stored.u && pass === stored.p) {
            localStorage.setItem('is_logged_in', 'true');
            showApp();
        } else {
            alert("Identifiants incorrects !");
        }
    }
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden'); // Cache le login
    const app = document.getElementById('main-app');
    app.classList.remove('hidden'); // Montre l'app
    app.classList.add('fade-in'); // Petite animation
    
    // Initialise l'app
    if (!localStorage.getItem('activeFilter') || localStorage.getItem('activeFilter') === 'all') {
        localStorage.setItem('activeFilter', 'Documents');
    }
    loadGallery();
}

function logoutUser() {
    if(confirm("Se déconnecter ?")) {
        localStorage.removeItem('is_logged_in');
        location.reload(); // Recharge la page pour revenir au login
    }
}

// --- RESTE DU CODE (GESTION FICHIERS) ---
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const currentFolder = localStorage.getItem('activeFilter');

        if (currentFolder === 'Photos' && !file.type.startsWith('image/')) return alert("Seules les PHOTOS sont autorisées ici !");
        if (currentFolder === 'Video' && !file.type.startsWith('video/')) return alert("Seules les VIDÉOS sont autorisées ici !");
        if (currentFolder === 'Audio' && !file.type.startsWith('audio/')) return alert("Seul l'AUDIO est autorisé ici !");
        
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
        else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) { icon = "fa-file-zipper"; type = "zip"; }

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

    if (currentFolder === 'Photos') {
        input.accept = "image/*";
        instruction.innerText = "Ajouter une PHOTO";
        allowed.innerText = "JPG, PNG, GIF...";
    } else if (currentFolder === 'Video') {
        input.accept = "video/*";
        instruction.innerText = "Ajouter une VIDÉO";
        allowed.innerText = "MP4, MOV...";
    } else if (currentFolder === 'Audio') {
        input.accept = "audio/*";
        instruction.innerText = "Ajouter un AUDIO";
        allowed.innerText = "MP3, WAV...";
    } else {
        input.accept = ".pdf,.doc,.docx,.txt,.zip,.rar,.apk,.exe,.html,.css,.js";
        instruction.innerText = "Ajouter un DOCUMENT";
        allowed.innerText = "PDF, ZIP, APK, TXT...";
    }
    modal.classList.remove('hidden'); 
}

function loadGallery() {
    const gallery = document.getElementById('gallery');
    const currentFilter = localStorage.getItem('activeFilter') || 'Documents';
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    // Note: On affiche pour tout le monde car l'accès au site est déjà protégé par le login
    const isUserLoggedIn = true; 

    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(btn.id === `filter-${currentFilter}`) {
            btn.classList.remove('bg-slate-200', 'dark:bg-slate-800', 'text-slate-600');
            btn.classList.add('bg-blue-600', 'text-white');
        } else {
            btn.classList.add('bg-slate-200', 'dark:bg-slate-800', 'text-slate-600');
            btn.classList.remove('bg-blue-600', 'text-white');
        }
    });

    gallery.innerHTML = '';
    const filtered = photos.filter(p => p.category === currentFilter);

    const addDiv = document.createElement('div');
    addDiv.className = "aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition group";
    
    let addIcon = "fa-plus";
    if (currentFilter === 'Photos') addIcon = "fa-camera";
    else if (currentFilter === 'Audio') addIcon = "fa-microphone";
    else if (currentFilter === 'Video') addIcon = "fa-video-plus";
    else if (currentFilter === 'Documents') addIcon = "fa-file-circle-plus";

    addDiv.innerHTML = `
        <div class="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition shadow-sm">
            <i class="fa-solid ${addIcon} text-blue-600 dark:text-blue-400 text-2xl"></i>
        </div>
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ajouter</span>
    `;
    addDiv.onclick = openModal;
    gallery.appendChild(addDiv);

    filtered.forEach(photo => {
        const div = document.createElement('div');
        div.className = "relative group break-inside-avoid mb-4 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700";
        
        let visual = '';
        if (photo.type === 'image') visual = `<img src="${photo.image}" class="w-full h-40 object-cover">`;
        else {
            let icon = 'fa-file';
            let color = 'text-gray-500';
            if (photo.type === 'audio') { icon = 'fa-music'; color = 'text-pink-500'; }
            if (photo.type === 'video') { icon = 'fa-video'; color = 'text-red-500'; }
            if (photo.type === 'apk') { icon = 'fa-android'; color = 'text-green-500'; }
            if (photo.type === 'zip') { icon = 'fa-file-zipper'; color = 'text-yellow-500'; }
            visual = `<div class="w-full h-40 flex items-center justify-center bg-slate-50 dark:bg-slate-900"><i class="fa-solid ${icon} ${color} text-5xl"></i></div>`;
        }

        div.innerHTML = `
            <div onclick="openFullscreen('${photo.id}')" class="cursor-pointer">
                ${visual}
                <div class="p-3">
                    <h3 class="font-bold text-sm truncate dark:text-gray-200">${photo.title}</h3>
                    <p class="text-[10px] text-gray-400 uppercase">${photo.type}</p>
                </div>
            </div>
            <button onclick="deletePhoto(${photo.id})" class="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition shadow"><i class="fa-solid fa-trash text-xs"></i></button>
        `;
        gallery.appendChild(div);
    });
}

function filterGallery(cat) { localStorage.setItem('activeFilter', cat); loadGallery(); }
function processAndUpload() {
    const file = document.getElementById('base64String').value;
    const title = document.getElementById('imgTitle').value;
    const cat = document.getElementById('imgCategory').value;
    const type = document.getElementById('fileType').value;
    
    if(!file) return alert("Fichier manquant !");
    
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    photos.unshift({ id: Date.now(), image: file, title: title, category: cat, type: type, date: new Date().toLocaleDateString() });
    localStorage.setItem('my_gallery_data', JSON.stringify(photos));
    
    closeModal();
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('filePreviewInfo').classList.add('hidden');
    document.getElementById('fileInput').value = "";
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
    else if (p.type === 'audio') c.innerHTML = `<div class="bg-slate-800 p-8 rounded-xl text-center"><i class="fa-solid fa-music text-6xl text-pink-500 mb-4"></i><h3 class="text-white mb-4">${p.title}</h3><audio controls autoplay src="${p.image}"></audio></div>`;
    else c.innerHTML = `<div class="bg-slate-800 p-8 rounded-xl text-center"><i class="fa-solid fa-download text-6xl text-blue-500 mb-4"></i><h3 class="text-white mb-4">${p.title}</h3><a href="${p.image}" download="${p.title}" class="bg-blue-600 text-white px-4 py-2 rounded">Télécharger</a></div>`;
}

function deletePhoto(id) {
    if(!confirm("Supprimer ?")) return;
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]').filter(p => p.id !== id);
    localStorage.setItem('my_gallery_data', JSON.stringify(photos));
    loadGallery();
}

function closeModal() { document.getElementById('uploadModal').classList.add('hidden'); }
function closeFullscreen() { document.getElementById('fullscreenModal').classList.add('hidden'); document.getElementById('fullscreenContent').innerHTML = ''; }
