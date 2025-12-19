const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());

// On garde la limite haute (50mb) par sécurité, même si la compression va réduire la taille
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI; 
const CODE_SECRET = "Mali2025"; 
const PORT = process.env.PORT || 3000;

// --- CONNEXION ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Base de données connectée !'))
  .catch(err => {
      console.error('❌ Erreur connexion DB :', err);
      process.exit(1);
  });

// --- MODÈLE (Mis à jour avec Catégorie) ---
const PhotoSchema = new mongoose.Schema({
  url: String,
  title: String,
  category: { type: String, default: 'Autre' }, // NOUVEAU CHAMP
  date: { type: Date, default: Date.now }
});
const Photo = mongoose.model('Photo', PhotoSchema);

// --- ROUTES ---

// 1. Lire
app.get('/photos', async (req, res) => {
  try {
      const photos = await Photo.find().sort({ date: -1 });
      res.json(photos);
  } catch (err) {
      res.status(500).json({ error: "Erreur lecture DB" });
  }
});

// 2. Ajouter (Avec Catégorie)
app.post('/photos', async (req, res) => {
  try {
      const inputPass = req.body.password ? req.body.password.trim() : "";
      
      if (inputPass !== CODE_SECRET) {
          return res.status(401).json({ error: "Mot de passe incorrect !" });
      }
      
      const newPhoto = new Photo({
          url: req.body.url,
          title: req.body.title,
          category: req.body.category || 'Autre' // On enregistre la catégorie
      });
      
      await newPhoto.save();
      res.json(newPhoto);
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur sauvegarde" });
  }
});

// 3. Supprimer
app.delete('/photos/:id', async (req, res) => {
    try {
        const inputPass = req.body.password ? req.body.password.trim() : "";
        if (inputPass !== CODE_SECRET) return res.status(401).json({ error: "Interdit !" });
        
        await Photo.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Erreur suppression" });
    }
});

// --- DÉMARRAGE ---
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));

