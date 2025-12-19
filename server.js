const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());

// IMPORTANT : On augmente la limite à 50MB pour accepter les photos HD en texte
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI; 
const CODE_SECRET = "Mali2025"; // Ton code Admin
const PORT = process.env.PORT || 3000;

// --- CONNEXION BASE DE DONNÉES ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Base de données connectée !'))
  .catch(err => {
      console.error('❌ Erreur connexion DB :', err);
      process.exit(1); // On redémarre si ça plante
  });

// --- MODÈLE ---
const PhotoSchema = new mongoose.Schema({
  url: String,
  title: String,
  date: { type: Date, default: Date.now }
});
const Photo = mongoose.model('Photo', PhotoSchema);

// --- ROUTES ---

// 1. Lire les photos
app.get('/photos', async (req, res) => {
  try {
      const photos = await Photo.find().sort({ date: -1 });
      res.json(photos);
  } catch (err) {
      res.status(500).json({ error: "Erreur lecture DB" });
  }
});

// 2. Ajouter une photo (Sécurisé)
app.post('/photos', async (req, res) => {
  try {
      // On nettoie le mot de passe (enlève les espaces invisibles du mobile)
      const inputPass = req.body.password ? req.body.password.trim() : "";
      
      if (inputPass !== CODE_SECRET) {
          return res.status(401).json({ error: "Mot de passe incorrect !" });
      }
      
      const newPhoto = new Photo({
          url: req.body.url,
          title: req.body.title
      });
      
      await newPhoto.save();
      res.json(newPhoto);
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur sauvegarde (Fichier trop lourd ?)" });
  }
});

// 3. Supprimer une photo (Sécurisé)
app.delete('/photos/:id', async (req, res) => {
    try {
        const inputPass = req.body.password ? req.body.password.trim() : "";
        
        if (inputPass !== CODE_SECRET) {
            return res.status(401).json({ error: "Interdit ! Mauvais code." });
        }
        
        await Photo.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Erreur suppression" });
    }
});

// --- DÉMARRAGE ---
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));

