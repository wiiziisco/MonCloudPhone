const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
// --- LE MOUCHARD DE VISITES ---
app.use((req, res, next) => {
    // On ignore les requêtes automatiques inutiles (images, icônes...)
    if (req.url !== '/preview.jpg' && req.url !== '/favicon.ico') {
        const date = new Date().toLocaleTimeString();
        console.log(`🔔 [${date}] VISITE DÉTECTÉE sur : ${req.url}`);
    }
    next();
});
// ------------------------------

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

const MONGO_URI = process.env.MONGO_URI; 
const CODE_SECRET = "Mali2025"; 
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Base de données connectée !'))
  .catch(err => { console.error(err); process.exit(1); });

const PhotoSchema = new mongoose.Schema({
  url: String,
  title: String,
  category: { type: String, default: 'Autre' },
  date: { type: Date, default: Date.now }
});
const Photo = mongoose.model('Photo', PhotoSchema);

app.get('/photos', async (req, res) => {
  const photos = await Photo.find().sort({ date: -1 });
  res.json(photos);
});

app.post('/photos', async (req, res) => {
  try {
      const inputPass = req.body.password ? req.body.password.trim() : "";
      if (inputPass !== CODE_SECRET) return res.status(401).json({ error: "Code incorrect !" });
      
      const newPhoto = new Photo({
          url: req.body.url,
          title: req.body.title,
          category: req.body.category || 'Autre'
      });
      await newPhoto.save();
      res.json(newPhoto);
  } catch (err) { res.status(500).json({ error: "Erreur" }); }
});

app.put('/photos/:id', async (req, res) => {
    try {
        const inputPass = req.body.password ? req.body.password.trim() : "";
        if (inputPass !== CODE_SECRET) return res.status(401).json({ error: "Interdit !" });

        const updatedPhoto = await Photo.findByIdAndUpdate(
            req.params.id, 
            { title: req.body.title, category: req.body.category },
            { new: true }
        );
        res.json(updatedPhoto);
    } catch (err) { res.status(500).json({ error: "Erreur modification" }); }
});

app.delete('/photos/:id', async (req, res) => {
    try {
        const inputPass = req.body.password ? req.body.password.trim() : "";
        if (inputPass !== CODE_SECRET) return res.status(401).json({ error: "Interdit !" });
        await Photo.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Erreur suppression" }); }
});

app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
