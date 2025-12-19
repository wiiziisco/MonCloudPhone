const API_URL = '/photos';

// On lance le chargement dès le début
loadGallery();

// --- 1. FONCTION D'AFFICHAGE AVEC DÉBOGAGE ---
async function loadGallery() {
    const gallery = document.getElementById('gallery');
    
    // On affiche un message d'attente visible
    gallery.innerHTML = '<div class="col-span-full text-center mt-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i><p class="text-gray-400 mt-2">Réveil du serveur en cours... (peut prendre 1 min)</p></div>';

    try {
        const res = await fetch(API_URL);
        
        // Si le serveur répond une erreur (ex: 500 ou 404)
        if (!res.ok) {
            throw new Error(`Erreur Serveur: ${res.status}`);
        }

        const photos = await res.json();
        gallery.innerHTML = ''; // On vide le message de chargement

        if (photos.length === 0) {
            gallery.innerHTML = '<p class="text-center text-gray-500 w-full col-span-full mt-10">La galerie est vide.</p>';
            return;
        }

        photos.forEach(photo => {
            const div = document.createElement('div');
            div.className = 'break-inside-avoid mb-4 relative group rounded-xl overflow-hidden bg-slate-800 shadow-lg';
            
            // Nom de fichier propre pour le téléchargement
            const fileName = (photo.title ? photo.title.replace(/[^a-z0-9]/gi, '_') : 'image') + '.png';

            div.innerHTML = `
                <img src="${photo.url}" alt="${photo.title}" class="w-full h-auto object-cover transform transition duration-500 group-hover:scale-105" loading="lazy">
                
                <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <a href="${photo.url}" download="${fileName}" class="bg-slate-900/80 text-blue-400 p-2 rounded-full hover:bg-blue-600 hover:text-white transition backdrop-blur-sm">
                        <i class="fa-solid fa-download"></i>
                    </a>
                    <button onclick="deletePhoto('${photo._id}')" class="bg-slate-900/80 text-red-400 p-2 rounded-full hover:bg-red-600 hover:text-white transition backdrop-blur-sm">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>

                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
                    <h3 class="font-bold text-white text-sm">${photo.title || 'Sans titre'}</h3>
                    
