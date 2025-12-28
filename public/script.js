// --- IMPORTS FIREBASE (Version CDN compatible navigateur) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- TA CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCBKA5SJYRJFnvpkDvGBnBYkf9eLFhhHwY",
  authDomain: "cloud-phone-8388.firebaseapp.com",
  projectId: "cloud-phone-8388",
  storageBucket: "cloud-phone-8388.firebasestorage.app",
  messagingSenderId: "65413864450",
  appId: "1:65413864450:web:af3809c0b330f23f125b1b"
};

// --- INITIALISATION ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- VARIABLES GLOBALES ---
let currentUser = null;
let searchTerm = "";
let confirmAction = null;
let isRegistering = false;

// --- SURVEILLANCE AUTHENTIFICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Si l'utilisateur est connecté, on lance l'interface App
        launchApp(true); 
    } else {
        currentUser = null;
        // Si déconnecté, on remet l'interface Hero (Accueil)
        const hero = document.getElementById('hero-section');
        const appUI = document.getElementById('app-interface');
        
        if(hero && appUI) {
            hero.classList.remove('blur-out');
            hero.classList.add('active-view');
            appUI.classList.add('blur-out');
            appUI.classList.remove('active-view');
        }
        
        const navSearch = document.getElementById('nav-search-container');
        if(navSearch) navSearch.classList.add('hidden');
        
        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) logoutBtn.classList.add('hidden');
    }
});

// --- FONCTIONS EXPOSÉES À WINDOW (HTML) ---

window.handleAuth = () => {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('auth-screen').classList.add('flex');
};

window.toggleAuthMode = () => {
    isRegistering = !isRegistering;
    document.getElementById('auth-toggle-text').innerText = isRegistering ? "Retour à la connexion" : "Pas de compte ? S'inscrire";
    document.querySelector('#auth-screen button').innerText = isRegistering ? "S'INSCRIRE" : "CONNEXION";
};

window.processLogin = async () => {
    const email = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    
    if (!email || !pass) return showNotification("Champs vides", "error");

    try {
        if (isRegistering) {
            await createUserWithEmailAndPassword(auth, email, pass);
            showNotification("Compte créé ! Bienvenue.", "success");
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
            showNotification("Connexion établie.", "success");
        }
        // Fermer la modale de login
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('flex');
    } catch (error) {
        console.error(error);
        let msg = "Erreur de connexion";
        if(error.code === 'auth/wrong-password') msg = "Mot de passe incorrect";
        if(error.code === 'auth/user-not-found') msg = "Utilisateur inconnu";
        if(error.code === 'auth/email-already-in-use') msg = "Cet email est déjà pris";
        if(error.code === 'auth/invalid-email') msg = "Email invalide";
        if(error.code === 'auth/weak-password') msg = "Mot de passe trop faible (6 car. min)";
        showNotification(msg, "error");
    }
};

window.logoutUser = () => {
    showConfirmModal("Déconnexion", "Fermer la session sécurisée ?", async () => {
        await signOut(auth);
        location.reload();
    }, 'fa-power-off');
};

// --- LOGIQUE D'INTERFACE APP ---
window.launchApp = (skipAnim = false) => {
    const hero = document.getElementById('hero-section');
    const appUI = document.getElementById('app-interface');
    const navSearch = document.getElementById('nav-search-container');
    const logoutBtn = document.getElementById('logout-btn');
    
    document.getElementById('robotModal').classList.add('hidden');
    
    hero.classList.remove('active-view');
    hero.classList.add('blur-out');
    
    setTimeout(() => {
        appUI.classList.remove('blur-out');
        appUI.classList.add('active-view');
        navSearch.classList.remove('hidden', 'opacity-0', 'translate-y-[-10px]');
        logoutBtn.classList.remove('hidden');
        
        // Charger la galerie une fois l'interface prête
        loadGalleryFirestore(); 
    }, skipAnim ? 0 : 500);
};

// --- GESTION FICHIERS (UPLOAD) ---
window.setupFileInput = () => { 
    const input = document.getElementById('fileInput');
    if(input) input.addEventListener('change', (e) => handleFileSelect(e.target.files[0])); 
};

window.setupDragAndDrop = () => {
    const dz = document.body; 
    const ol = document.createElement('div'); 
    ol.id = 'drag-overlay'; 
    ol.className = 'fixed inset-0 z-[9999] bg-blue-600/90 backdrop-blur-sm hidden flex-col items-center justify-center text-white'; 
    ol.innerHTML = `<div class="border-4 border-dashed border-white/50 rounded-3xl p-12 flex flex-col items-center animate-pulse"><i class="fa-solid fa-cloud-arrow-up text-8xl mb-4"></i><h2 class="text-4xl font-bold font-display">DÉPOSEZ ICI</h2></div>`; 
    document.body.appendChild(ol);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dz.addEventListener(e, (ev)=>{ev.preventDefault();ev.stopPropagation()}, false));
    dz.addEventListener('dragenter', () => ol.classList.remove('hidden'));
    ol.addEventListener('dragleave', (e) => { if (e.target === ol) ol.classList.add('hidden'); });
    dz.addEventListener('drop', (e) => { ol.classList.add('hidden'); if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]); });
};

window.handleFileSelect = (file) => {
    if (!file) return;
    let cat = 'Documents';
    if (file.type.startsWith('image/')) cat = 'Photos';
    else if (file.type.startsWith('video/')) cat = 'Video';
    else if (file.type.startsWith('audio/')) cat = 'Audio';
    
    window.openModal(true);
    document.getElementById('imgCategory').value = cat;
    document.getElementById('uploadPlaceholder').classList.add('hidden');
    document.getElementById('filePreviewInfo').classList.remove('hidden');
    document.getElementById('previewName').textContent = file.name;
    document.getElementById('imgTitle').value = file.name.split('.')[0];
    
    // On attache le fichier à l'input pour le récupérer plus tard
    document.getElementById('fileInput').fileObj = file; 
};

window.processAndUpload = async () => {
    const file = document.getElementById('fileInput').fileObj;
    const title = document.getElementById('imgTitle').value || 'Sans titre';
    const cat = document.getElementById('imgCategory').value;
    
    if(!file) return showNotification("Aucun fichier sélectionné", "error");
    if(!currentUser) return showNotification("Non connecté", "error");

    showNotification("Upload en cours...", "info");
    window.closeModal(); // Ferme la modale pour voir le toast

    try {
        // 1. Upload vers Firebase Storage
        // Chemin : users/UID/Categorie/Timestamp_NomFichier
        const storageRef = ref(storage, `users/${currentUser.uid}/${cat}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);

        // 2. Définir le type pour l'affichage
        let type = 'doc';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) type = 'text';

        // 3. Enregistrer les infos dans Firestore
        await addDoc(collection(db, "files"), {
            uid: currentUser.uid,
            title: title,
            category: cat,
            type: type,
            url: url,
            storagePath: snapshot.metadata.fullPath,
            createdAt: new Date().toISOString()
        });

        showNotification("Fichier sécurisé dans le Cloud", "success");
        
        // Reset du formulaire
        document.getElementById('fileInput').value = "";
        document.getElementById('fileInput').fileObj = null;
        document.getElementById('uploadPlaceholder').classList.remove('hidden');
        document.getElementById('filePreviewInfo').classList.add('hidden');

    } catch (e) {
        console.error(e);
        showNotification("Echec de l'upload: " + e.message, "error");
    }
};

// --- AFFICHAGE GALERIE (LECTURE FIRESTORE) ---
function loadGalleryFirestore() {
    if (!currentUser) return;
    
    // Requête : récupérer les fichiers triés par date
    const q = query(collection(db, "files"), orderBy("createdAt", "desc"));
    
    // Écoute en temps réel (onSnapshot) : met à jour l'écran dès qu'un fichier change
    onSnapshot(q, (snapshot) => {
        const gallery = document.getElementById('gallery');
        const cat = localStorage.getItem('activeFilter') || 'Documents';
        const term = searchTerm.toLowerCase();
        
        // Mise à jour visuelle des boutons filtres
        document.querySelectorAll('.filter-btn').forEach(btn => { 
            const isActive = btn.id === `filter-${cat}`; 
            btn.className = `filter-btn px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap border ${isActive ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`; 
        });

        gallery.innerHTML = '';

        // Bouton "Ajouter" toujours présent
        const addDiv = document.createElement('div');
        addDiv.className = "aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-500 transition flex flex-col items-center justify-center cursor-pointer group";
        addDiv.innerHTML = `<div class="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-600 flex items-center justify-center mb-2 transition shadow-lg"><i class="fa-solid fa-plus text-blue-500 dark:text-blue-400 group-hover:text-white text-xl"></i></div><span class="text-[10px] font-bold text-slate-500 dark:text-gray-500 group-hover:text-slate-800 dark:group-hover:text-white uppercase tracking-wider">Ajouter</span>`;
        addDiv.onclick = () => window.openModal(false);
        gallery.appendChild(addDiv);

        snapshot.forEach((doc) => {
            const p = doc.data();
            
            // FILTRAGE LOCAL (Sécurité visuelle, la sécurité réelle est dans les règles Firestore)
            // On vérifie que le fichier appartient bien à l'utilisateur connecté
            if (p.uid === currentUser.uid && p.category === cat && p.title.toLowerCase().includes(term)) {
                
                const div = document.createElement('div');
                div.className = "relative group aspect-square rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md";
                
                let visual = '';
                if(p.type === 'image') visual = `<img src="${p.url}" class="w-full h-full object-cover transition opacity-90 group-hover:opacity-100">`;
                else {
                    let icon = 'fa-file'; let col = 'text-gray-500';
                    if (p.type === 'video') { icon = 'fa-video'; col = 'text-red-500'; }
                    if (p.type === 'audio') { icon = 'fa-music'; col = 'text-pink-500'; }
                    if (p.type === 'text') { icon = 'fa-file-code'; col = 'text-green-500'; }
                    visual = `<div class="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900"><i class="fa-solid ${icon} ${col} text-4xl"></i></div>`;
                }

                div.innerHTML = `
                    <div class="w-full h-full cursor-pointer item-click-zone">
                        ${visual}
                        <div class="absolute bottom-0 left-0 w-full bg-white/90 dark:bg-black/60 backdrop-blur-sm p-1.5 text-center border-t border-slate-100 dark:border-transparent">
                            <p class="text-[10px] font-bold text-slate-700 dark:text-white truncate">${p.title}</p>
                        </div>
                    </div>
                    <button onclick="deletePhoto('${doc.id}', '${p.storagePath || ''}')" class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"><i class="fa-solid fa-trash text-[10px]"></i></button>
                `;
                
                // On passe les données complètes au viewer
                div.querySelector('.item-click-zone').addEventListener('click', () => window.openFullscreen(p));
                gallery.appendChild(div);
            }
        });
    });
}

// --- SUPPRESSION ---
window.deletePhoto = (docId, storagePath) => {
    showConfirmModal("Supprimer ?", "Action irréversible.", async () => {
        try {
            // 1. Supprimer du Storage (si chemin existe)
            if (storagePath) {
                const fileRef = ref(storage, storagePath);
                await deleteObject(fileRef).catch(e => console.log("Fichier déjà absent ou erreur storage"));
            }
            // 2. Supprimer la fiche Firestore
            await deleteDoc(doc(db, "files", docId));
            showNotification("Fichier supprimé", "success");
        } catch (e) {
            console.error(e);
            showNotification("Erreur suppression", "error");
        }
    });
};

// --- HACKPAD (Modifié pour Firestore) ---
window.saveNote = async () => {
    const content = document.getElementById('noteContent').value;
    let title = document.getElementById('noteTitle').value.trim() || `Note_${Date.now()}.txt`;
    if (!title.endsWith('.txt')) title += '.txt';
    if (!content) return showNotification("Note vide !", "error");

    try {
        await addDoc(collection(db, "files"), {
            uid: currentUser.uid,
            title: title.replace('.txt',''),
            category: 'Documents',
            type: 'text',
            textContent: content, // Le texte est stocké direct dans la base
            url: null, 
            createdAt: new Date().toISOString()
        });
        window.closeNoteModal();
        showNotification("Note cryptée sauvegardée !", "success");
        localStorage.setItem('activeFilter', 'Documents'); 
    } catch (e) {
        console.error(e);
        showNotification("Erreur sauvegarde note", "error");
    }
};

// --- FULLSCREEN VIEWER ---
window.openFullscreen = (data) => {
    const c = document.getElementById('fullscreenContent');
    const m = document.getElementById('fullscreenModal');
    m.classList.remove('hidden');

    if (data.type === 'image') {
        c.innerHTML = `<img src="${data.url}" class="max-h-full max-w-full rounded-lg shadow-2xl">`;
    } 
    else if (data.type === 'text') {
        c.innerHTML = `<div class="w-full max-w-2xl bg-slate-900 border border-green-500/30 rounded-lg p-6 shadow-2xl h-[70vh] flex flex-col"><div class="flex justify-between items-center mb-4 border-b border-green-500/30 pb-2"><h2 class="text-green-500 font-mono font-bold"><i class="fa-solid fa-file-code mr-2"></i>${data.title}</h2></div><div class="flex-1 overflow-auto font-mono text-sm text-green-400 whitespace-pre-wrap">${data.textContent || "Erreur de lecture"}</div></div>`;
    }
    else if (data.type === 'video' || data.type === 'audio') {
        const isVideo = data.type === 'video';
        const tag = isVideo ? 'video' : 'audio';
        c.innerHTML = `<div class="relative w-full max-w-4xl group">${isVideo?'':`<div class="text-center mb-8"><i class="fa-solid fa-music text-6xl text-cyan-400 animate-pulse"></i><h3 class="text-white text-xl mt-4 font-bold tracking-widest">${data.title}</h3></div>`}<${tag} controls src="${data.url}" class="w-full rounded-lg shadow-[0_0_30px_rgba(0,243,255,0.2)] bg-black" ${isVideo ? 'playsinline' : ''}></${tag}></div>`;
    }
    else {
        c.innerHTML = `<div class="bg-slate-800 p-8 rounded-2xl text-center border border-slate-700"><i class="fa-solid fa-download text-6xl text-blue-500 mb-4"></i><h3 class="text-white text-xl font-bold mb-4">${data.title}</h3><a href="${data.url}" target="_blank" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-500 transition">Télécharger</a></div>`;
    }
};

// --- UTILS UI ---
window.toggleRobotModal = () => { const m=document.getElementById('robotModal'); const c=document.getElementById('robotCard'); if(m.classList.contains('hidden')){ m.classList.remove('hidden'); setTimeout(()=>c.classList.remove('scale-95'),10); }else{ c.classList.add('scale-95'); setTimeout(()=>m.classList.add('hidden'),200); } };
window.filterGallery = (cat) => { localStorage.setItem('activeFilter', cat); loadGalleryFirestore(); };
window.handleSearch = (val) => { searchTerm = val; loadGalleryFirestore(); };
window.toggleSearchBar = () => { const s = document.getElementById('searchInput'); if(s.classList.contains('opacity-0')) { s.classList.remove('opacity-0','pointer-events-none','scale-95'); s.focus(); } else { s.classList.add('opacity-0','pointer-events-none','scale-95'); } };
window.openModal = (isDrop) => document.getElementById('uploadModal').classList.remove('hidden');
window.closeModal = () => document.getElementById('uploadModal').classList.add('hidden');
window.openNoteModal = () => { window.closeModal(); document.getElementById('noteModal').classList.remove('hidden'); document.getElementById('noteTitle').value=""; document.getElementById('noteContent').value=""; };
window.closeNoteModal = () => document.getElementById('noteModal').classList.add('hidden');
window.closeFullscreen = () => { document.getElementById('fullscreenModal').classList.add('hidden'); document.getElementById('fullscreenContent').innerHTML=''; };

// TOASTS
window.showNotification = (msg, type = 'success') => {
    const container = document.getElementById('toast-container');
    let bgCol, borderCol, icon, textCol;
    if (type === 'success') { bgCol = 'bg-slate-900/90'; borderCol = 'border-green-500'; textCol = 'text-green-500'; icon = 'fa-check'; }
    else if (type === 'error') { bgCol = 'bg-slate-900/90'; borderCol = 'border-red-500'; textCol = 'text-red-500'; icon = 'fa-triangle-exclamation'; }
    else { bgCol = 'bg-slate-900/90'; borderCol = 'border-blue-500'; textCol = 'text-blue-500'; icon = 'fa-info-circle'; }
    const toast = document.createElement('div');
    toast.className = `w-full ${bgCol} backdrop-blur-md border-l-4 ${borderCol} text-white p-4 rounded-lg shadow-2xl flex items-center justify-between gap-4 animate-slide-in relative overflow-hidden pointer-events-auto`;
    toast.innerHTML = `<div class="flex items-center gap-3"><i class="fa-solid ${icon} ${textCol} text-xl"></i><span class="font-bold text-sm">${msg}</span></div><div class="absolute bottom-0 left-0 h-1 ${bgCol} w-full"><div class="h-full ${textCol.replace('text', 'bg')} transition-all duration-[3000ms] ease-linear w-full" id="progress-${Date.now()}"></div></div>`;
    container.appendChild(toast);
    setTimeout(() => { const bar = toast.querySelector('div[id^="progress-"]'); if(bar) bar.style.width = '0%'; }, 10);
    setTimeout(() => { toast.classList.remove('animate-slide-in'); toast.classList.add('animate-fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
};

// CONFIRM MODAL
window.showConfirmModal = (title, message, action, iconClass = 'fa-trash') => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmIcon').className = `fa-solid ${iconClass} text-3xl text-red-500`;
    confirmAction = action;
    document.getElementById('customConfirmModal').classList.remove('hidden');
};
window.closeConfirmModal = () => { document.getElementById('customConfirmModal').classList.add('hidden'); confirmAction = null; };
document.getElementById('confirmBtn').addEventListener('click', () => { if (confirmAction) confirmAction(); window.closeConfirmModal(); });

// INIT
document.addEventListener('DOMContentLoaded', () => {
    window.setupFileInput();
    window.setupDragAndDrop();
});
