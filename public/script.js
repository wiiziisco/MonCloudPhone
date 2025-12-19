const API_URL = '/photos';

loadGallery();

async function loadGallery() {
    const gallery = document.getElementById('gallery');
    try {
        const res = await fetch(API_URL);
        const photos = await res.json();
        gallery.innerHTML = ''; 

        if (photos.length === 0) {
            gallery.innerHTML = '<p class="text-center text-gray-500 w-full col-span-full mt-10">Aucune photo pour l\'instant.</p>';
            return;
        }

        photos.forEach(photo => {
            const div = document.createElement('div');
            div.className = 'break-inside-avoid mb-4 relative group rounded-xl overflow-hidden bg-slate-800 shadow-lg';
            div.innerHTML = `
                <img src="${photo.url}" alt="${photo.title}" class="w-full h-auto object-cover transform transition duration-500 group-hover:scale-105" loading="lazy">
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

async function processAndUpload() {
    // On récupère le code Base64 généré automatiquement
    const url = document.getElementById('base64String').value;
    const title = document.getElementById('imgTitle').value;
    const password = document.getElementById('adminPass').value;

    if (!url) return alert("Choisis une photo d'abord !");
    if (!password) return alert("Mot de passe requis !");

    const btn = document.querySelector('button[onclick="processAndUpload()"]');
    const originalText = btn.innerText;
    btn.innerText = "Envoi en cours (patience)...";
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
            alert("✅ Photo publiée !");
            closeModal();
            // Reset du formulaire
            document.getElementById('fileInput').value = '';
            document.getElementById('base64String').value = '';
            document.getElementById('imgTitle').value = '';
            document.getElementById('adminPass').value = '';
            document.getElementById('uploadPlaceholder').classList.remove('hidden');
            document.getElementById('imagePreview').classList.add('hidden');
            
            loadGallery();
        } else {
            alert("Erreur serveur : Fichier peut-être trop lourd ?");
        }
    } catch (err) {
        alert("Erreur de connexion.");
    }

    btn.innerText = originalText;
    btn.disabled = false;
}

