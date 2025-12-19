const API_URL = '/photos';
const gallery = document.getElementById('gallery');
const ADMIN_CODE_KEY = 'monCodeAdmin'; // La mémoire du téléphone
const EXPECTED_CODE = "Mali2025"; // Code attendu pour débloquer l'interface

// 1. Démarrage : On vérifie si tu es admin et on charge les photos
checkAdminStatus();
loadGallery();

// --- GESTION DU MODE ADMIN ---

function checkAdminStatus() {
    // On regarde si le code est enregistré dans le téléphone
    const storedCode = localStorage.getItem(ADMIN_CODE_KEY);
    const isAdmin = (storedCode === EXPECTED_CODE);

    // On affiche ou cache les boutons selon le statut
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
    const code = prompt("🔐 Entrez le code Admin :");
    // .trim() enlève les espaces parasites du clavier mobile
    if (code && code.trim() === EXPECTED_CODE) {
        localStorage.setItem(ADMIN_CODE_KEY, code.trim());
        alert("✅ Mode Admin activé !");
        checkAdminStatus();
        loadGallery(); // On recharge pour afficher les poubelles
    } else {
        alert("⛔ Code incorrect.");
    }
}

function logoutAdmin() {
    if(confirm("Se déconnecter ?")) {
        localStorage.removeItem(ADMIN_CODE_KEY);
        location.reload(); // On recharge la page pour redevenir visiteur
    }
}

// --- CHARGEMENT DE LA GALERIE ---

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
            
            // Titre propre pour le nom de fichier
            const cleanTitle = (photo.title || 'image').replace(/[^a-z0-9]/gi, '_');

            // Bouton Poubelle (Seulement si Admin)
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

// --- FONCTIONS ACTIONS ---

async function deletePhoto(id) {
    if(!confirm("Supprimer cette photo ?")) return;
    
    // Le mot de passe est pris automatiquement de la mémoire
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
            alert("Impossible de supprimer (Session expirée ?)");
        }
    } catch (e) { alert("Erreur de connexion"); }
}

// --- GESTION UPLOAD ---

// Prévisualisation de l'image quand on en choisit une
const fileInput = document.getElementById('fileInput');
if(fileInput) {
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Avertissement si image > 4Mo
            if(file.size > 4 * 1024 * 1024) {
                alert("⚠️ Attention : Image lourde. Le chargement sera lent.");
            }
            
            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('uploadPlaceholder').classList.add('hidden');
                const img = document.getElementById('imagePreview');
                img.src = evt.target.result;
                img.classList.remove('hidden');
                // On garde le code Base64 dans un champ caché
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
    const password = localStorage.getItem(ADMIN_CODE_KEY); // Mot de passe auto

    if (!url) return alert("Choisis une image d'abord !");
    if (!password) return alert("Tu n'es pas connecté en Admin !");

    const btn = document.querySelector('button[onclick="processAndUpload()"]');
    const oldText = btn.innerText;
    btn.innerText = "Envoi en cours...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url, title, password })
        });
        
        if (res.ok) {
            alert("✅ Photo publiée !");
            closeModal();
            // Reset formulaire
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

