const API_URL = '/photos';
const gallery = document.getElementById('gallery');
const ADMIN_CODE_KEY = 'monCodeAdmin'; 
const EXPECTED_CODE = "Mali2025"; 

let allPhotos = [];
let currentIndex = 0;

checkAdminStatus();
loadGallery();

// --- ADMIN & LOGIN ---

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
    const modal = document.getElementById('loginModal');
    const input = document.getElementById('adminCodeInput');
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 100);
    input.onkeydown = (e) => { if(e.key === "Enter") confirmLogin(); }
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('adminCodeInput').value = '';
}

function confirmLogin() {
    const input = document.getElementById('adminCodeInput');
    const code = input.value;

    if (code && code.trim() === EXPECTED_CODE) {
        localStorage.setItem(ADMIN_CODE_KEY, code.trim());
        input.classList.remove('border-slate-300', 'dark:border-slate-700', 'focus:border-blue-500');
        input.classList.add('border-green-500', 'text-green-600', 'dark:text-green-400');
        setTimeout(() => {
            closeLoginModal();
            input.classList.remove('border-green-500', 'text-green-600', 'dark:text-green-400');
            input.classList.add('border-slate-300', 'dark:border-slate-700');
            checkAdminStatus();
            loadGallery();
        }, 300);
    } else {
        input.classList.add('border-red-500', 'animate-pulse');
        setTimeout(() => input.classList.remove('border-red-500', 'animate-pulse'), 500);
    }
}

function logoutAdmin() {
    if(confirm("Se déconnecter ?")) {
        localStorage.removeItem(ADMIN_CODE_KEY);
        location.reload();
    }
}

// --- GALERIE ---

async function loadGallery() {
    const isAdmin = checkAdminStatus();
    
    gallery.innerHTML = `
        <div class="col-span-full text-center mt-10">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
            <p class="text-slate-500 dark:text-gray-500 text-sm mt-2">Chargement...</p>
        </div>`;

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Serveur indisponible");
        
        allPhotos = await res.json();
        gallery.innerHTML = ''; 

        if (allPhotos.length === 0) {
            gallery.innerHTML = '<p class="text-center text-slate-500 dark:text-gray-500 w-full col-span-full mt-10">Aucune photo.</p>';
            return;
        }

        allPhotos.forEach((photo, index) => {
            const div = document.createElement('div');
            // C'EST ICI LA MAGIE : bg-white le jour, bg-slate-800 la nuit
            div.className = 'break-inside-avoid mb-4 relative group rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-md dark:shadow-lg transition-colors duration-300';
            
            const cleanTitle = (photo.title || 'image').replace(/[^a-z0-9]/gi, '_');

            let deleteBtn = '';
            if (isAdmin) {
                deleteBtn = `
                <button onclick="event.stopPropagation(); deletePhoto('${photo._id}')" class="bg-white/80 dark:bg-black/60 text-red-500 dark:text-red-400 p-2 rounded-full backdrop-blur-md hover:bg-red-600 hover:text-white transition shadow-sm">
                    <i class="fa-solid fa-trash"></i>
                </button>`;
            }

            div.innerHTML = `
                <div class="cursor-pointer" onclick="openFullscreen(${index})">
                    <img src="${photo.url}" alt="${photo.title}" class="w-full h-auto object-cover transform transition duration-500 group-hover:scale-105" loading="lazy">
                </div>
                
                <div class="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                    <a href="${photo.url}" download="${cleanTitle}.png" onclick="event.stopPropagation()" class="bg-white/80 dark:bg-black/60 text-blue-600 dark:text-blue-400 p-2 rounded-full backdrop-blur-md hover:bg-blue-600 hover:text-white transition shadow-sm">
                        <i class="fa-solid fa-download"></i>
                    </a>
                    ${deleteBtn}
                </div>

                <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 pointer-events-none">
                    <h3 class="font-bold text-white text-xs truncate drop-shadow-md">${photo.title || 'Sans titre'}</h3>
                </div>
            `;
            gallery.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        gallery.innerHTML = `<p class="text-red-500 text-center col-span-full">Erreur : ${err.message}</p>`;
    }
}

// --- LIGHTBOX ---

function openFullscreen(index) {
    currentIndex = index;
    updateFullscreenImage();
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
        titleEl.innerText = (currentIndex + 1) + '/' + allPhotos.length + ' - ' + (photo.title || '');
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
    }, 150);
}

function nextImage() {
    currentIndex = (currentIndex + 1) % allPhotos.length;
    updateFullscreenImage();
}

function prevImage() {
    currentIndex = (currentIndex - 1 + allPhotos.length) % allPhotos.length;
    updateFullscreenImage();
}

function handleKeyNavigation(e) {
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "Escape") closeFullscreen();
}

// --- ACTIONS ---

async function deletePhoto(id) {
    if(!confirm("Supprimer cette photo ?")) return;
    const password = localStorage.getItem(ADMIN_CODE_KEY);
    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password })
        });
        if (res.ok) loadGallery();
        else alert("Erreur session.");
    } catch (e) { alert("Erreur connexion"); }
}

const fileInput = document.getElementById('fileInput');
if(fileInput) {
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if(file.size > 4 * 1024 * 1024) alert("⚠️ Image lourde.");
            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('uploadPlaceholder').classList.add('hidden');
                document.getElementById('imagePreview').src = evt.target.result;
                document.getElementById('imagePreview').classList.remove('hidden');
                document.getElementById('base64String').value = evt.target.result;
            }
            reader.readAsDataURL(file);
        }
    });
}

function openModal() { document.getElementById('uploadModal').classList.remove('hidden'); }
function closeModal() { document.getElementById('uploadModal').classList.add('hidden'); }

async function processAndUpload() {
    const url = document.getElementById('base64String').value;
    const title = document.getElementById('imgTitle').value;
    const password = localStorage.getItem(ADMIN_CODE_KEY);

    if (!url || !password) return alert("Image ou connexion manquante !");

    const btn = document.querySelector('button[onclick="processAndUpload()"]');
    const oldText = btn.innerText;
    btn.innerText = "Envoi...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url, title, password })
        });
        if (res.ok) {
            alert("✅ Publié !");
            closeModal();
            document.getElementById('fileInput').value = '';
            document.getElementById('base64String').value = '';
            document.getElementById('imgTitle').value = '';
            document.getElementById('uploadPlaceholder').classList.remove('hidden');
            document.getElementById('imagePreview').classList.add('hidden');
            loadGallery();
        } else {
            alert("Erreur (Trop lourd ?)");
        }
    } catch (e) { alert("Erreur connexion"); }
    btn.innerText = oldText;
    btn.disabled = false;
}

