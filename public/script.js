
const API_URL = '/photos';

// Chargement initial de la galerie
loadGallery();

// --- 1. FONCTION D'AFFICHAGE (VISITEURS) ---
async function loadGallery() {
    const gallery = document.getElementById('gallery');
    try {
        const res = await fetch(API_URL);
        const photos = await res.json();
        gallery.innerHTML = ''; 

        if (photos.length === 0) {
            gallery.innerHTML = '<p class="text-center text-gray-500 w-full col-span-full mt-10">La galerie est vide. Sois le premier à poster !</p>';
            return;
        }

        photos.forEach(photo => {
            const div = document.createElement('div');
            // 'relative' et 'group' permettent d'afficher les boutons quand on touche l'image
            div.className = 'break-inside-avoid mb-4 relative group rounded-xl overflow-hidden bg-slate-800 shadow-lg';
            
            // On nettoie le titre pour créer un nom de fichier propre (ex: "Mon Titre" -> "Mon_Titre.png")
            const fileName = (photo.title ? photo.title.replace(/[^a-z0-9]/gi, '_') : 'image') + '.png';

            div.innerHTML = `
                <img src="${photo.url}" alt="${photo.title}" class="w-full h-auto object-cover transform transition duration-500 group-hover:scale-105" loading="lazy">
                
                <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    
                    <a href="${photo.url}" download="${fileName}" class="bg-slate-900/80 text-blue-400 p-2 rounded-full hover:bg-blue-600 hover:text-white hover:scale-110 transition shadow-lg backdrop-blur-sm" title="Télécharger l'image">
                        <i class="fa-solid fa-download"></i>
                    </a>

                    <button onclick="deletePhoto('${photo._id}')" class="bg-slate-900/80 text-red-400 p-2 rounded-full hover:bg-red-600 hover:text-white hover:scale-110 transition shadow-lg backdrop-blur-sm" title="Supprimer">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>

                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
                    <h3 class="font-bold text-white text-sm">${photo.title || 'Sans titre'}</h3>
                    <p class="text-xs text-gray-400">${new Date(photo.date).toLocaleDateString()}</p>
                </div>
            `;
            gallery.appendChild(div);
        });
    } catch (err) {
        console.error("Erreur chargement galerie:", err);
    }
}

// --- 2. FONCTION DE SUPPRESSION (SÉCURISÉE) ---
async function deletePhoto(id) {
    // Demande le mot de passe
    const password = prompt("⚠️ ZONE ADMIN ⚠️\nEntrez le code secret pour supprimer cette photo :");
    
    if (!password) return; // Si on annule, on arrête tout

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password }) // On envoie le code au serveur
        });

        if (res.status === 401) {
            alert("⛔ Code incorrect ! Suppression refusée.");
        } else if (res.ok) {
            // Si c'est bon, on recharge la page pour voir le résultat
            loadGallery(); 
        } else {
            alert("Erreur lors de la suppression.");
        }
    } catch (err) {
        alert("Problème de connexion internet.");
    }
}

// --- 3. FONCTION D'ENVOI (UPLOAD) ---
async function processAndUpload() {
    const url = document.getElementById('base64String').value;
    const title = document.getElementById('imgTitle').value;
    const password = document.getElementById('adminPass').value;

    if (!url) return alert("Veuillez choisir une photo !");
    if (!password) return alert("Mot de passe requis !");

    // On désactive le bouton pour éviter de cliquer 2 fois
    const btn = document.querySelector('button[onclick="processAndUpload()"]');
    const originalText = btn.innerText;
    btn.innerText = "Envoi en cours...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, title, password })
        });

        if (res.status === 401) {
            alert("⛔ Mot de passe incorrect !");
        } else if (res.ok) {
            alert("✅ Photo publiée avec succès !");
            
            // On ferme et on nettoie le formulaire
            document.getElementById('uploadModal').classList.add('hidden');
            document.getElementById('fileInput').value = '';
            document.getElementById('base64String').value = '';
            document.getElementById('imgTitle').value = '';
            document.getElementById('adminPass').value = '';
            document.getElementById('uploadPlaceholder').classList.remove('hidden');
            document.getElementById('imagePreview').classList.add('hidden');
            
            // On rafraîchit la galerie
            loadGallery();
        } else {
            alert("Erreur : L'image est peut-être trop lourde.");
        }
    } catch (err) {
        alert("Erreur de connexion au serveur.");
    }

    // On remet le bouton normal
    btn.innerText = originalText
