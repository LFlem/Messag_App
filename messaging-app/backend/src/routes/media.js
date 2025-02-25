// backend/src/routes/media.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Configuration du stockage des fichiers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const mediaDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(mediaDir)) {
            fs.mkdirSync(mediaDir, { recursive: true });
        }
        cb(null, mediaDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Filtrer les types de fichiers
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'video/mp4', 'video/quicktime', 'video/webm'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format de fichier non supporté'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// Upload d'un média
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier téléchargé' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const mediaUrl = `${baseUrl}/uploads/${req.file.filename}`;
        let thumbnailUrl = null;

        // Générer une miniature pour les images
        if (req.file.mimetype.startsWith('image/')) {
            const thumbnailFilename = `thumb-${req.file.filename}`;
            const thumbnailPath = path.join(req.file.destination, thumbnailFilename);

            await sharp(req.file.path)
                .resize(300, 300, { fit: 'inside' })
                .toFile(thumbnailPath);

            thumbnailUrl = `${baseUrl}/uploads/${thumbnailFilename}`;
        }

        // Générer une miniature pour les vidéos (en pratique, vous utiliseriez FFmpeg)
        // Cette partie nécessiterait un package comme fluent-ffmpeg

        res.status(201).json({
            url: mediaUrl,
            thumbnailUrl,
            type: req.file.mimetype.startsWith('image/') ? 'image' : 'video',
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Supprimer un média
router.delete('/:filename', auth, async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../../uploads', req.params.filename);
        const thumbnailPath = path.join(__dirname, '../../uploads', `thumb-${req.params.filename}`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
        }

        res.json({ message: 'Fichier supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;