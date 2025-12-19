
const API_URL = '/photos';
const gallery = document.getElementById('gallery');

// Lancement immédiat
loadGallery();

async function loadGallery() {
    // Étape 1 : On signale que ça démarre
    gallery.innerHTML = `
        <div class="col-span-full text-center mt-10">
            <i class="fa-solid fa-satellite-dish text-4xl text-blue-500 mb-4 animate-pulse"></i>
            <p class="text-white font-bold">Connexion au serveur...</p>
            <p class="text-xs text-gray-500" id="statusLog">En attente...</p>
        </div>`;

    const statusLog = document.getElementById('statusLog');

    try {
        // Étape 2 : Téléchargement
        statusLog.innerText = "Téléchargement des données...";
        const res = await fetch(API_URL);
        
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);

        // Étape 3 : Lecture des données (C'est là que ça peut être long)
        statusLog.innerText = "Lecture des images (lourd)...";
        const photos = await res.json();

        // Étape 4 : Affichage
        statusLog.innerText = `${photos.length} photos trouvées. Affichage...`;
        gallery.innerHTML = ''; // On nettoie

        if (photos.length === 0) {
            gallery.innerHTML = '<p class="text-center text-gray-500 w-full col-span-full mt-10">Galerie vide.</p>';
            return;
        }

        photos.forEach(photo => {
            const div = document.createElement('div');
            div.className = 'break-inside-avoid mb-4 relative group rounded-xl overflow-hidden bg-slate-800 shadow-lg';
            
            // On sécurise le nom de fichier
            const cleanTitle = (photo.title || 'image').replace(/[^a-z0-9]/gi, '_');

            div.innerHTML = `
                <img src="${photo.url}" alt="${photo.title}" class="w-full h-auto object-cover" loading="lazy">
                
                <div class="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                    <a href="${photo.url}" download="${cleanTitle}.png" class="bg-black/60 text-blue-400 p-2 rounded-full backdrop-blur-md">
                        <i class="fa-solid fa-download"></i>
                    </a>
                    <button onclick="deletePhoto('${photo._id}')" class="bg-black/60 text-red-400 p-2 rounded-full backdrop-blur-md">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>

                <div class="absolute bottom-0 inset-x-0 bg-black/60 p-2">
                    <h3 class="font-bold text-white text-xs truncate">${photo.title || 'Sans titre'}</h3>
                </div>
            `;
            gallery.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        gallery.innerHTML = `
            <div class="col-span-full text-center text-red-500 p-4 border border-red-500 rounded-lg">
                <h3 class="font-bold text-lg">ERREUR</h3>
                <p>${err.message}</p>
                <button onclick="location.reload()" class="mt-4 bg-red-600 text-white px-4 py-2 rounded">Réessayer</button>
            </div>`;
    }
}

// --- FONCTIONS ACTIONS ---

async function deletePhoto(id) {
    if(!confirm("Supprimer cette photo ?")) return;
    const password = prompt("Code secret Admin :");
    if (!password) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password })
        });
        if (res.ok) loadGallery();
        else alert("Code incorrect !");
    } catch (e) { alert("Erreur connexion"); }
}

async function processAndUpload() {
    const fileInput = document.getElementById('fileInput');
    const title = document.getElementById('imgTitle').value;
    const password = document.getElementById('adminPass').value;
    
    // Vérification de la taille du fichier (Max 4Mo conseillé pour Base64)
    if (fileInput.files[0] && fileInput.files[0].size > 4 * 1024 * 1024) {
        return alert("⚠️ Image trop lourde ! Choisis une image de moins de 4Mo ou rogne-la.");
    }

    const url = document.getElementById('base64String').value;

    if (!url || !password) return alert("Image et mot de passe requis");

    const btn = document.querySelector('button[onclick="processAndUpload()"]');
    btn.innerText = "Envoi (Patience)...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url, title, password })
        });
        
        if (res.ok) {
            alert("Envoyé !");
            document.getElementById('uploadModal').classList.add('hidden');
            loadGallery();
        } else {
            alert("Erreur (Fichier trop lourd ?)");
        }
    } catch (e) {
        alert("Erreur d'envoi : " + e.message);
    }
    btn.innerText = "Publier la photo";
    btn.disabled = false;
}
