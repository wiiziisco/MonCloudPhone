const API_URL = '/photos';
const gallery = document.getElementById('gallery');
const ADMIN_CODE_KEY = 'monCodeAdmin'; // La mémoire du téléphone
const EXPECTED_CODE = "Mali2025"; // Le code secret

// Démarrage
checkAdminStatus();
loadGallery();

// --- GESTION DU MODE ADMIN & LOGIN ---

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

// 1. Ouvrir la nouvelle fenêtre de connexion
function loginAdmin() {
    const modal = document.getElementById('loginModal');
    const input = document.getElementById('adminCodeInput');
    
    modal.classList.remove('hidden');
    // Petit délai pour l'animation
    setTimeout(() => input.focus(), 100);
    
    // Touche Entrée pour valider
    input.onkeydown = (e) => {
        if(e.key === "Enter") confirmLogin();
    }
}

// 2. Fermer la fenêtre
function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('adminCodeInput').value = '';
}

// 3. Vérifier le code (Animation succès/erreur)
function confirmLogin() {
    const input = document.getElementById('adminCodeInput');
    const code = input.value;

    if (code && code.trim() === EXPECTED_CODE) {
        localStorage.setItem(ADMIN_CODE_KEY, code.trim());
        
        // Effet vert (Succès)
        input.classList.remove('border-slate-700', 'focus:border-cyan-400');
        input.classList.add('border-green-500', 'text-green-400');
        
        setTimeout(() => {
            closeLoginModal();
            // Reset du style
            input.classList.remove('border-green-500', 'text-green-400');
            input.classList.add('border-slate-700');
            
            checkAdminStatus();
            loadGallery();
        }, 300);
        
    } else {
        // Effet rouge (Erreur)
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
            <p class="text-gray-500 text-sm mt-2">Chargement...</p>
        </div>`;

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Serveur indisponible");
        
        const photos = await res.json();
        gallery.innerHTML = ''; 

        if (photos.length === 0) {
            gallery.innerHTML = '<p class="text-center text-gray-500 w-full col-span-full mt-10">Aucune photo.</p>';
            return;
        }

        photos.forEach(photo => {
            const div = document.createElement('div');
            div.className = 'break-inside-avoid mb-4 relative group rounded-xl overflow-hidden bg-slate-800 shadow-lg';
            
            const cleanTitle = (photo.title || 'image').replace(/[^a-z0-9]/gi, '_');

            // Bouton Poubelle (Admin seulement)
            let deleteBtn = '';
            if (isAdmin) {
                deleteBtn = `
                <button onclick="deletePhoto('${photo._id}')" class="bg-black/60 text-red-400 p-2 rounded-full backdrop-blur-md hover:bg-red-600 hover:text-white transition">
                    <i class="fa-solid fa-trash"></i>
                </button>`;
            }

            div.innerHTML = `
                <img src="${photo.url}" alt="${photo.title}" class="w-full h-auto object-cover" loading="lazy">
                
                <div class="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                    <a href="${photo.url}" download="${cleanTitle}.png" class="bg-black/60 text-blue-400 p-2 rounded-full backdrop-blur-md hover:bg-blue-600 hover:text-white transition">
                        <i class="fa-solid fa-download"></i>
                    </a>
                    ${deleteBtn}
                </div>

                <div class="absolute bottom-0 inset-x-0 bg-black/60 p-2 pointer-events-none">
                    <h3 class="font-bold text-white text-xs truncate">${photo.title || 'Sans titre'}</h3>
                </div>
            `;
            gallery.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        gallery.innerHTML = `<p class="text-red-500 text-center col-span-full">Erreur : ${err.message}</p>`;
    }
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
        
        if (res.ok) {
            loadGallery();
        } else {
            alert("Erreur (Session expirée ? Reconnecte-toi)");
        }
    } catch (e) { alert("Erreur de connexion"); }
}

// --- UPLOAD ---

const fileInput = document.getElementById('fileInput');
if(fileInput) {
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if(file.size > 4 * 1024 * 1024) alert("⚠️ Image un peu lourde, ça va prendre du temps.");
            
            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('uploadPlaceholder').classList.add('hidden');
                const img = document.getElementById('imagePreview');
                img.src = evt.target.result;
                img.classList.remove('hidden');
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

    if (!url) return alert("Choisis une image !");
    if (!password) return alert("Tu n'es pas connecté !");

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
            alert("Erreur serveur (Image trop lourde ?)");
        }
    } catch (e) {
        alert("Erreur connexion : " + e.message);
    }
    btn.innerText = oldText;
    btn.disabled = false;
}

