// CONFIGURATION
const ADMIN_CODE = "28071999"; 

document.addEventListener('DOMContentLoaded', () => {
    // Force la vue Documents si aucune n'est définie (supprime 'all')
    if (!localStorage.getItem('activeFilter') || localStorage.getItem('activeFilter') === 'all') {
        localStorage.setItem('activeFilter', 'Documents');
    }
    loadGallery();
    setupFileInput();
});

// --- GESTION UPLOAD ---
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('uploadPlaceholder').classList.add('hidden');
        document.getElementById('filePreviewInfo').classList.remove('hidden');
        document.getElementById('previewName').textContent = file.name;
        document.getElementById('imgTitle').value = file.name.split('.')[0];

        // Auto-détection du type
        let category = "Documents";
        let type = "doc";
        let icon = "fa-file";

        if (file.type.startsWith('image/')) { category = "Photos"; type = "image"; icon = "fa-image"; }
        else if (file.type.startsWith('audio/')) { category = "Audio"; type = "audio"; icon = "fa-music"; }
        else if (file.type.startsWith('video/')) { category = "Video"; type = "video"; icon = "fa-video"; }
        else if (file.name.endsWith('.apk')) { category = "Documents"; type = "apk"; icon = "fa-android"; }
        else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) { category = "Documents"; type = "zip"; icon = "fa-file-zipper"; }

        document.getElementById('previewIcon').className = `fa-solid ${icon} text-4xl text-blue-500 mb-2`;
        document.getElementById('imgCategory').value = category;
        document.getElementById('fileType').value = type;

        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('base64String').value = e.target.result;
        reader.readAsDataURL(file);
    });
}

// --- AFFICHAGE GALERIE ---
function loadGallery() {
    const gallery = document.getElementById('gallery');
    const currentFilter = localStorage.getItem('activeFilter') || 'Documents';
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    const isAdmin = sessionStorage.getItem('admin_access') === 'true';

    // Mise à jour des boutons filtres
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

    // 1. BOUTON D'AJOUT PERSONNALISÉ (Visible pour tous !)
    const addDiv = document.createElement('div');
    addDiv.className = "aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition group";
    
    // Personnalisation de l'icône selon le dossier
    let addIcon = "fa-plus";
    let addText = "Ajouter";
    
    if (currentFilter === 'Photos') { addIcon = "fa-camera"; addText = "Photo"; }
    else if (currentFilter === 'Audio') { addIcon = "fa-microphone"; addText = "Audio"; }
    else if (currentFilter === 'Video') { addIcon = "fa-video-plus"; addText = "Vidéo"; }
    else if (currentFilter === 'Documents') { addIcon = "fa-file-circle-plus"; addText = "Fichier"; }

    addDiv.innerHTML = `
        <div class="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition shadow-sm">
            <i class="fa-solid ${addIcon} text-blue-600 dark:text-blue-400 text-2xl"></i>
        </div>
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${addText}</span>
    `;
    
    addDiv.onclick = () => {
        openModal();
        document.getElementById('imgCategory').value = currentFilter;
    };
    gallery.appendChild(addDiv);

    // 2. LISTE DES FICHIERS
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
            ${isAdmin ? `<button onclick="deletePhoto(${photo.id})" class="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition shadow"><i class="fa-solid fa-trash text-xs"></i></button>` : ''}
        `;
        gallery.appendChild(div);
    });
}

// FONCTIONS UTILITAIRES
function filterGallery(cat) { localStorage.setItem('activeFilter', cat); loadGallery(); }
function processAndUpload() {
    const file = document.getElementById('base64String').value;
    const title = document.getElementById('imgTitle').value;
    const cat = document.getElementById('imgCategory').value;
    const type = document.getElementById('fileType').value;
    if(!file) return alert("Erreur");
    
    const photos = JSON.parse(localStorage.getItem('my_gallery_data') || '[]');
    photos.unshift({ id: Date.now(), image: file, title: title, category: cat, type: type, date: new Date().toLocaleDateString() });
    localStorage.setItem('my_gallery_data', JSON.stringify(photos));
    
    closeModal();
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('filePreviewInfo').classList.add('hidden');
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
function openModal() { document.getElementById('uploadModal').classList.remove('hidden'); }
function loginAdmin() { document.getElementById('loginModal').classList.remove('hidden'); }
function closeLoginModal() { document.getElementById('loginModal').classList.add('hidden'); }
function closeFullscreen() { document.getElementById('fullscreenModal').classList.add('hidden'); document.getElementById('fullscreenContent').innerHTML = ''; }
function confirmLogin() { if(document.getElementById('adminCodeInput').value === ADMIN_CODE) { sessionStorage.setItem('admin_access', 'true'); closeLoginModal(); loadGallery(); } else alert("Erreur"); }
function logoutAdmin() { sessionStorage.removeItem('admin_access'); loadGallery(); }
