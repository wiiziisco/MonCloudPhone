const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
// CETTE LIGNE PERMET D'AFFICHER LE SITE WEB :
app.use(express.static('public'));

// Tes identifiants 'toto' qui marchent
process.env.MONGO_URI; "mongodb+srv://toto:toto1234@cluster0>

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Base de données connectée>
  .catch(err => console.error('❌ Erreur DB', err));

const PhotoSchema = new mongoose.Schema({
  url: String,
  title: String,
  date: { type: Date, default: Date.now }
});
const Photo = mongoose.model('Photo', PhotoSchema);

// Routes API
app.get('/photos', async (req, res) => {
  const photos = await Photo.find().sort({ date: -1 });
  res.json(photos);
});

// --- MODIFICATION SÉCURITÉ ---
const CODE_SECRET = "Mali2025"; // <--- Ton mot de pass>

app.post('/photos', async (req, res) => {
  try {
      // 1. Vérification du mot de passe
      if (req.body.password !== CODE_SECRET) {
          return res.status(401).json({ error: "Mot de >
      }

      // 2. Si le mot de passe est bon, on enregistre
      const newPhoto = new Photo({
          url: req.body.url,
          title: req.body.title
      });

      await newPhoto.save();
      res.json(newPhoto);
  } catch (err) {
      res.status(500).json({ error: "Erreur serveur" });
  }
});
