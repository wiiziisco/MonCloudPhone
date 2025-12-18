const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- CONFIGURATION ---
// Récupère le lien secret depuis Render
const MONGO_URI = process.env.MONGO_URI; 
const CODE_SECRET = "Mali2025"; // Ton mot de passe admin

// --- CONNEXION BASE DE DONNÉES ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Base de données connectée !'))
  .catch(err => console.error('❌ Erreur connexion DB :', err));

// --- MODÈLE ---
const PhotoSchema = new mongoose.Schema({
  url: String,
  title: String,
  date: { type: Date, default: Date.now }
});
const Photo = mongoose.model('Photo', PhotoSchema);

// --- ROUTES ---
app.get('/photos', async (req, res) => {
  const photos = await Photo.find().sort({ date: -1 });
  res.json(photos);
});

app.post('/photos', async (req, res) => {
  try {
      if (req.body.password !== CODE_SECRET) {
          return res.status(401).json({ error: "Mot de passe incorrect !" });
      }
      const newPhoto = new Photo({
          url: req.body.url,
          title: req.body.title
      });
      await newPhoto.save();
      res.json(newPhoto);
  } catch (err) {
      res.status(500).json({ error: "Erreur sauvegarde" });
  }
});

// --- DÉMARRAGE ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));

