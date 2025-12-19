const API_URL = '/photos';
const gallery = document.getElementById('gallery');
const ADMIN_CODE_KEY = 'monCodeAdmin'; 
const EXPECTED_CODE = "Mali2025"; 

let allPhotos = [];
let currentCategory = 'all'; 
let currentIndex = 0;
let currentConfirmCallback = null;

checkAdminStatus();
loadGallery();

// --- ADMIN & AUTH ---
function checkAdminStatus() {
    const storedCode = localStorage.getItem(ADMIN_CODE_KEY);
    const isAdmin = (storedCode === EXPECTED_CODE);
    if (isAdmin) {
        document.getElementById('btnAdd').classList.remove('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');
        document.getElementById('btnLogin').classList.add('hidden');
    } else {
        document.getElementById('btnAdd').classList.add('hidden');
        document.getElementById('btnLogout').classList.add('hidden');
        document.getElementById('btnLogin').classList.remove('hidden');
    }
    return isAdmin;
}
function loginAdmin() {
    document.getElementById('loginModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('adminCodeInput').focus(), 100);
    document.getElementById('adminCodeInput').onkeydown = (e) => { if(e.key === "Enter") confirmLogin(); }
}
function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('adminCodeInput').value = '';
}
function confirmLogin() {
    const input = document.getElementById('adminCodeInput');
    if (input.value.trim() === EXPECTED_CODE) {
        localStorage.setItem(ADMIN_CODE_KEY, input.value.trim());
        closeLoginModal();
        checkAdminStatus();
        loadGallery(); 
    } else {
        input.classList.add('border-red-500', 'animate-pulse');
        setTimeout(() => input.classList.remove('border-red-500', 'animate-pulse'), 500);
    }
}
function logoutAdmin() {
    showConfirm("Se déconnecter ?", () => {
        localStorage.removeItem(ADMIN_CODE_KEY);
        location.reload();
    });
}

// --- SYSTÈME DE MODALS (SUCCESS/CONFIRM) ---
function showSuccessModal(msg) {
    document.getElementById('successMessage').textContent = msg;
    document.getElementById('successModal').classList.remove('hidden');
}
function closeSuccessModal() { document.getElementById('successModal').classList.add('hidden'); }

function showConfirm(msg, callback) {
    document.getElementById('confirmMessage').textContent = msg;
    currentConfirmCallback = callback;
    document.getElementById('confirmModal').classList.remove('hidden');
}
function closeConfirmModal() { document.getElementById('confirmModal').classList.add('hidden'); }
function executeConfirm() { if(currentConfirmCallback) currentConfirmCallback(); closeConfirmModal(); }

// --- GESTION GALERIE ---
function filterGallery(category) {
    currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-slate-200', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-400');
    });
    const activeBtn = document.getElementById(`filter-${category}`);
    if(activeBtn) {
        activeBtn.classList.remove('bg-slate-200', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-400');
        activeBtn.classList.add('bg-blue-600', 'text-white');
    }
    displayPhotos();
}

async function loadGallery() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Erreur");
        allPhotos = await res.json();
        displayPhotos();
    } catch (err) { gallery.innerHTML = `<p class="text-red-500 text-center col-span-full">${err.message}</p>`; }
}

function displayPhotos() {
    const isAdmin = checkAdminStatus();
    gallery.innerHTML = '';

    const photosToShow = currentCategory === 'all' 
        ? allPhotos 
        : allPhotos.filter(p => p.category === currentCategory);

    if (photosToShow.length === 0) {
        gallery.innerHTML = '<p class="text-center text-slate-400 col-span-full mt-10">Aucune photo ici.</p>';
        return;
    }

    photosToShow.forEach((photo) => {
        const realIndex = allPhotos.indexOf(photo);
        const div = document.createElement('div');
        div.className = 'break-inside-avoid mb-4 relative group rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-md dark:shadow-lg transition-colors duration-300';
        
        let adminBtns = '';
        if (isAdmin) {
            adminBtns = `
            <div class="flex gap-2">
                <button onclick="event.stopPropagation(); openEditModal('${photo._id}')" class="bg-white/80 dark:bg-black/60 text-yellow-500 p-2 rounded-full backdrop-blur-md hover:bg-yellow-500 hover:text-white transition shadow-sm">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button onclick="event.stopPropagation(); deletePhoto('${photo._id}')" class="bg-white/80 dark:bg-black/60 text-red-500 p-2 rounded-full backdrop-blur-md hover:bg-red-600 hover:text-white transition shadow-sm">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>`;
        }

        const catBadge = photo.category && photo.category !== 'Autre' 
            ? `<span class="absolute top-2 left-2 bg-blue-600/80 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm z-10">${photo.category}</span>`
            : '';

        div.innerHTML = `
            ${catBadge}
            <div class="cursor-pointer" onclick="openFullscreen(${realIndex})">
                <img src="${photo.url}" alt="${photo.title}" class="w-full h-auto object-cover transform transition duration-500 group-hover:scale-105" loading="lazy">
            </div>
            <div class="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                <a href="${photo.url}" download="photo.png" onclick="event.stopPropagation()" class="bg-white/80 dark:bg-black/60 text-blue-600 p-2 rounded-full backdrop-blur-md hover:bg-blue-600 hover:text-white transition shadow-sm"><i class="fa-solid fa-download"></i></a>
                ${adminBtns}
            </div>
            <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 pointer-events-none">
                <h3 class="font-bold text-white text-xs truncate">${photo.title || 'Sans titre'}</h3>
            </div>
        `;
        gallery.appendChild(div);
    });
}

// --- MODIFICATION & UPLOAD ---

function openEditModal(id) {
    const photo = allPhotos.find(p => p._id === id);
    if(!photo) return;
    document.getElementById('editPhotoId').value = id;
    document.getElementById('editTitle').value = photo.title || '';
    document.getElementById('editCategory').value = photo.category || 'Autre';
    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() { document.getElementById('editModal').classList.add('hidden'); }

async function submitEdit() {
    const id = document.getElementById('editPhotoId').value;
    const title = document.getElementById('editTitle').value;
    const category = document.getElementById('editCategory').value;
    const password = localStorage.getItem(ADMIN_CODE_KEY);

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title, category, password })
        });
        if (res.ok) {
            showSuccessModal("✅ Photo modifiée !");
            closeEditModal();
            loadGallery();
        } else alert("Erreur serveur.");
    } catch (e) { alert("Erreur connexion"); }
}

function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const elem = document.createElement('canvas');
                let width = img.width; let height = img.height;
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                elem.width = width; elem.height = height;
                const ctx = elem.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(elem.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

const fileInput = document.getElementById('fileInput');
if(fileInput) {
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('compressionInfo').classList.remove('hidden');
            document.getElementById('compressionInfo').innerText = "⏳ Optimisation...";
            try {
                const compressed = await compressImage(file, 1200, 0.8);
                document.getElementById('uploadPlaceholder').classList.add('hidden');
                document.getElementById('imagePreview').src = compressed;
                document.getElementById('imagePreview').classList.remove('hidden');
                document.getElementById('base64String').value = compressed;
                document.getElementById('compressionInfo').innerText = "✅ Optimisé !";
            } catch (err) { alert("Erreur image"); }
        }
    });
}

async function processAndUpload() {
    const url = document.getElementById('base64String').value;
    const title = document.getElementById('imgTitle').value;
    const category = document.getElementById('imgCategory').value;
    const password = localStorage.getItem(ADMIN_CODE_KEY);

    if (!url || !password) return alert("Image manquante !");
    
    const btn = document.querySelector('button[onclick="processAndUpload()"]');
    btn.innerText = "Envoi..."; btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url, title, category, password })
        });
        if (res.ok) {
            showSuccessModal("✅ Publié !");
            closeModal();
            document.getElementById('fileInput').value = '';
            document.getElementById('base64String').value = '';
            document.getElementById('imgTitle').value = '';
            document.getElementById('uploadPlaceholder').classList.remove('hidden');
            document.getElementById('imagePreview').classList.add('hidden');
            loadGallery();
        } else alert("Erreur serveur.");
    } catch (e) { alert("Erreur connexion."); }
    btn.innerText = "Publier"; btn.disabled = false;
}

function openModal() { document.getElementById('uploadModal').classList.remove('hidden'); }
function closeModal() { document.getElementById('uploadModal').classList.add('hidden'); }

async function deletePhoto(id) {
    showConfirm("Supprimer cette photo ?", async () => {
        const password = localStorage.getItem(ADMIN_CODE_KEY);
        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ password })
            });
            loadGallery();
        } catch (e) { alert("Erreur"); }
    });
}

// --- LIGHTBOX ---
function openFullscreen(index) {
    currentIndex = index; updateFullscreenImage();
    document.getElementById('fullscreenModal').classList.remove('hidden');
    document.addEventListener('keydown', handleKeyNavigation);
}
function closeFullscreen() {
    document.getElementById('fullscreenModal').classList.add('hidden');
    document.removeEventListener('keydown', handleKeyNavigation);
}
function updateFullscreenImage() {
    const photo = allPhotos[currentIndex];
    const imgEl = document.getElementById('fullscreenImage');
    const titleEl = document.getElementById('fullscreenTitle');
    imgEl.style.opacity = '0.5';
    setTimeout(() => {
        imgEl.src = photo.url;
        titleEl.innerText = `${currentIndex + 1}/${allPhotos.length} - ${photo.title || ''}`;
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
    }, 150);
}
function nextImage() { currentIndex = (currentIndex + 1) % allPhotos.length; updateFullscreenImage(); }
function prevImage() { currentIndex = (currentIndex - 1 + allPhotos.length) % allPhotos.length; updateFullscreenImage(); }
function handleKeyNavigation(e) {
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "Escape") closeFullscreen();
}
