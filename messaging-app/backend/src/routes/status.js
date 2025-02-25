// /backend/routes/status.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const User = require('../models/User');

// Mettre à jour le statut de l'utilisateur (en ligne/hors ligne)
router.post('/status', auth, async (req, res) => {
    try {
        const { status } = req.body; // 'online', 'offline', 'away'

        await User.findByIdAndUpdate(req.user.id, { status, lastSeen: Date.now() });

        // Notifier les autres utilisateurs via WebSockets
        req.io.emit('user_status_change', {
            userId: req.user.id,
            status
        });

        res.json({ message: 'Statut mis à jour' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Notifier que l'utilisateur est en train d'écrire
router.post('/typing', auth, async (req, res) => {
    try {
        const { conversationId, isTyping } = req.body;

        // Notifier les autres utilisateurs via WebSockets
        req.io.to(conversationId).emit('typing_indicator', {
            userId: req.user.id,
            conversationId,
            isTyping
        });

        res.json({ message: 'Notification envoyée' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;