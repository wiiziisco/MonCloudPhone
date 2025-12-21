// --- CONFIGURATION ---
const GITHUB_USERNAME = "wiiziisco"; 
const REPO_NAME = "MonCloudPhone";   
const EMAIL = "wiizzardiisco@gmail.com"; 
const ADMIN_CODE = "28071999"; 

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadGallery();
    setupFileInput(); // Nouveau gestionnaire de fichiers
});

// --- GESTION DES FICHIERS & UPLOAD ---

function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    const previewName = document.getElementById('previewName');
    const previewIcon = document.getElementById('previewIcon');
    const placeholder = document.getElementById('uploadPlaceholder');
    const infoDiv = document.getElementById('filePreviewInfo');
    const typeInput = document.getElementById('fileType');
    const categorySelect = document.getElementById('imgCategory');

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Afficher le nom et l'icône
        placeholder.classList.add('hidden');
        infoDiv.classList.remove('hidden');
        previewName.textContent = file.name;
        document.getElementById('imgTitle').value = file.name.split('.')[0]; // Pré-remplir le titre

        // 2. Détecter le type et suggérer la catégorie
        let iconClass = "fa-file";
        let category = "Documents";
        let type = "doc";

        if (file.type.startsWith('image/')) {
            iconClass = "fa-image";
            category = "Photos";
            type = "image";
        } else if (file.type.startsWith('audio/')) {
            iconClass = "fa-music";
            category = "Audio";
            type = "audio";
        } else if (file.type.startsWith('video/')) {
            iconClass = "fa-video";
            category = "Video";
            type = "video";
        } else if (file.name.endsWith('.apk')) {
            iconClass = "fa-android";
            category = "Documents";
            type = "apk";
        } else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
            iconClass = "fa-file-zipper";
            category = "Documents";
            type = "zip";
        }

        previewIcon.className = `fa-solid ${iconClass} text-4xl text-blue-500 mb-2`;
        categorySelect.value = category;
        typeInput.value = type;

        // 3. Convertir en Base64
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('base64String').value = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// --- AFFICHAGE DE LA GALERIE (Mode Fichiers) ---

function loadGallery() {
    const gallery = document.getElementById('gallery');
    const currentFilter = localStorage.getItem('activeFilter') || 'all';
    
    // Mise à jour des boutons de filtre
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(btn.id === `filter-${currentFilter}`) {
            btn.classList.remove('bg-slate-200', 'dark:bg-slate-800', 'text-slate-600');
            btn.classList.add('bg-blue-600', 'text-white');
        } else {
            btn.classList.add('bg-slate-200', 'dark:bg-slate-800', 'text-slate-600');
            btn.classList.remove('bg-blue-600', 'text-white');
        }
    });

    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    const isAdmin = sessionStorage.getItem('admin_access') === 'true';

    // Filtrage
    const filtered = currentFilter === 'all' 
        ? photos 
        : photos.filter(p => p.category === currentFilter);

    gallery.innerHTML = '';

    // 1. AJOUTER LA TUILE D'AJOUT (Smart Add Button)
    if (isAdmin && currentFilter !== 'all') {
        const addDiv = document.createElement('div');
        addDiv.className = "aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition group";
        addDiv.onclick = () => {
            openModal();
            // Pré-sélectionner la bonne catégorie
            document.getElementById('imgCategory').value = currentFilter;
        };
        addDiv.innerHTML = `
            <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                <i class="fa-solid fa-plus text-blue-600 dark:text-blue-400 text-xl"></i>
            </div>
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Ajouter ${currentFilter}</span>
        `;
        gallery.appendChild(addDiv);
    }

    // 2. AFFICHER LES FICHIERS
    filtered.forEach(photo => {
        const div = document.createElement('div');
        div.className = "relative group break-inside-avoid mb-4 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700";
        
        // Déterminer le visuel selon le type
        let visualContent = '';
        let type = photo.type || 'image'; // Rétrocompatibilité

        if (type === 'image') {
            visualContent = `<img src="${photo.image}" class="w-full h-40 object-cover" loading="lazy">`;
        } else {
            // Pour Audio/Video/Docs : Afficher une belle icône
            let icon = 'fa-file';
            let color = 'text-gray-500';
            if (type === 'audio') { icon = 'fa-music'; color = 'text-pink-500'; }
            if (type === 'video') { icon = 'fa-video'; color = 'text-red-500'; }
            if (type === 'apk') { icon = 'fa-android'; color = 'text-green-500'; }
            if (type === 'zip') { icon = 'fa-file-zipper'; color = 'text-yellow-500'; }
            
            visualContent = `
                <div class="w-full h-40 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                    <i class="fa-solid ${icon} ${color} text-5xl mb-2"></i>
                    <span class="text-[10px] uppercase font-bold text-slate-400">${type}</span>
                </div>
            `;
        }

        div.innerHTML = `
            <div onclick="openFullscreen('${photo.id}')" class="cursor-pointer">
                ${visualContent}
                <div class="p-3">
                    <h3 class="font-bold text-sm truncate dark:text-gray-200">${photo.title}</h3>
                    <p class="text-xs text-gray-400 mt-1 flex justify-between">
                        <span>${photo.category}</span>
                        <span>${photo.date}</span>
                    </p>
                </div>
            </div>
            ${isAdmin ? `
            <button onclick="deletePhoto(${photo.id})" class="absolute top-2 right-2 bg-red-500/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg backdrop-blur-sm">
                <i class="fa-solid fa-trash text-xs"></i>
            </button>` : ''}
        `;
        gallery.appendChild(div);
    });
}

// --- FONCTIONS SYSTÈME (Login, Upload, Fullscreen) ---

function filterGallery(category) {
    localStorage.setItem('activeFilter', category);
    loadGallery();
}

function processAndUpload() {
    const fileBase64 = document.getElementById('base64String').value;
    const title = document.getElementById('imgTitle').value;
    const category = document.getElementById('imgCategory').value;
    const type = document.getElementById('fileType').value || 'doc';

    if (!fileBase64 || !title) return alert("Fichier manquant !");

    const newFile = {
        id: Date.now(),
        image: fileBase64, // Contient les données du fichier
        title: title,
        category: category,
        type: type, // Important : on stocke le type
        date: new Date().toLocaleDateString()
    };

    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    photos.unshift(newFile);
    localStorage.setItem('my_gallery_data', JSON.stringify(photos));

    closeModal();
    // Reset form
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('filePreviewInfo').classList.add('hidden');
    
    // Afficher un succès
    const successModal = document.getElementById('successModal');
    successModal.classList.remove('hidden');
    setTimeout(() => successModal.classList.add('hidden'), 1500);

    loadGallery();
}

// Visualiseur adapté aux types
function openFullscreen(id) {
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    const file = photos.find(p => p.id == id);
    if (!file) return;

    const modal = document.getElementById('fullscreenModal');
    const container = document.getElementById('fullscreenContent');
    modal.classList.remove('hidden');
    
    // Nettoyer
    container.innerHTML = '';

    if (file.type === 'image' || !file.type) {
        container.innerHTML = `<img src="${file.image}" class="max-h-full max-w-full object-contain rounded-lg shadow-2xl">`;
    } else if (file.type === 'video') {
        container.innerHTML = `<video controls autoplay class="max-h-full max-w-full rounded-lg shadow-2xl"><source src="${file.image}"></video>`;
    } else if (file.type === 'audio') {
        container.innerHTML = `
            <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl flex flex-col items-center">
                <i class="fa-solid fa-music text-6xl text-pink-500 mb-4 animate-pulse"></i>
                <h3 class="text-xl font-bold mb-4 dark:text-white">${file.title}</h3>
                <audio controls autoplay src="${file.image}"></audio>
            </div>`;
    } else {
        // Pour les autres fichiers (ZIP, APK...), on propose le téléchargement
        container.innerHTML = `
            <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl flex flex-col items-center text-center">
                <i class="fa-solid fa-file-arrow-down text-6xl text-blue-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2 dark:text-white">${file.title}</h3>
                <p class="text-gray-400 mb-6">Type: ${file.type}</p>
                <a href="${file.image}" download="${file.title}" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2">
                    <i class="fa-solid fa-download"></i> Télécharger le fichier
                </a>
            </div>`;
    }
}

function closeFullscreen() {
    document.getElementById('fullscreenModal').classList.add('hidden');
    // Arrêter les médias si nécessaire
    document.getElementById('fullscreenContent').innerHTML = '';
}

// Modals
function openModal() { document.getElementById('uploadModal').classList.remove('hidden'); }
function closeModal() { document.getElementById('uploadModal').classList.add('hidden'); }
function loginAdmin() { document.getElementById('loginModal').classList.remove('hidden'); }
function closeLoginModal() { document.getElementById('loginModal').classList.add('hidden'); }

function confirmLogin() {
    if (document.getElementById('adminCodeInput').value === ADMIN_CODE) {
        sessionStorage.setItem('admin_access', 'true');
        closeLoginModal();
        loadGallery();
    } else {
        alert("Code incorrect");
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('admin_access');
    loadGallery();
}

function deletePhoto(id) {
    if(!confirm("Supprimer ce fichier ?")) return;
    let photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    photos = photos.filter(p => p.id !== id);
    localStorage.setItem('my_gallery_data', JSON.stringify(photos));
    loadGallery();
}
