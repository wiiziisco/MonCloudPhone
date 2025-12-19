const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Pour les grosses images
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI; 
const CODE_SECRET = "Mali2025"; 
const PORT = process.env.PORT || 3000;

// --- CONNEXION DB ---
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

// ROUTE D'ENVOI (UPLOAD)
app.post('/photos', async (req, res) => {
  try {
      // NETTOYAGE : On enlève les espaces avant et après le mot de passe
      const inputPass = req.body.password ? req.body.password.trim() : "";
      
      if (inputPass !== CODE_SECRET) {
          console.log(`Refusé: Reçu '${inputPass}' vs Attendu '${CODE_SECRET}'`);
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
      res.status(500).json({ error: "Erreur sauvegarde" });
  }
});

// ROUTE DE SUPPRESSION (Celle qui manquait !)
app.delete('/photos/:id', async (req, res) => {
    try {
        const inputPass = req.body.password ? req.body.password.trim() : "";
        
        if (inputPass !== CODE_SECRET) {
            return res.status(401).json({ error: "Mot de passe incorrect !" });
        }
        
        await Photo.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Erreur suppression" });
    }
});

// --- DÉMARRAGE ---
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));

