const API_URL = '/photos';

// Chargement initial
loadGallery();

async function loadGallery() {
    const gallery = document.getElementById('gallery');
    try {
        const res = await fetch(API_URL);
        const photos = await res.json();

        gallery.innerHTML = ''; 

        if (photos.length === 0) {
            gallery.innerHTML = '<p class="text-center text-gray-500 w-full col-span-full mt-10">La galerie est vide.</p>';
            return;
        }

        photos.forEach(photo => {
            // Création de la carte image
            const div = document.createElement('div');
            div.className = 'break-inside-avoid mb-4 relative group rounded-xl overflow-hidden bg-slate-800 shadow-lg';
            
            div.innerHTML = `
                <img src="${photo.url}" alt="${photo.title}" class="w-full h-auto object-cover transform transition duration-500 group-hover:scale-105" loading="lazy" onerror="this.src='https://placehold.co/600x400?text=Image+Cassée'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <h3 class="font-bold text-white text-sm">${photo.title || 'Sans titre'}</h3>
                    <p class="text-xs text-gray-400">${new Date(photo.date).toLocaleDateString()}</p>
                </div>
            `;
            gallery.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function uploadPhoto() {
    const url = document.getElementById('imgUrl').value;
    const title = document.getElementById('imgTitle').value;
    const password = document.getElementById('adminPass').value;

    if (!url || !password) return alert("Lien et mot de passe obligatoires !");

    const btn = document.querySelector('button[onclick="uploadPhoto()"]');
    const originalText = btn.innerText;
    btn.innerText = "Envoi en cours...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, title, password })
        });

        const data = await res.json();

        if (res.status === 401) {
            alert("⛔ Mot de passe incorrect !");
        } else if (res.ok) {
            // Succès
            closeModal();
            document.getElementById('imgUrl').value = '';
            document.getElementById('imgTitle').value = '';
            document.getElementById('adminPass').value = ''; // On vide le mot de passe
            loadGallery();
        } else {
            alert("Erreur : " + (data.error || "Inconnue"));
        }
    } catch (err) {
        alert("Erreur de connexion au serveur.");
    }

    btn.innerText = originalText;
    btn.disabled = false;
}
