// backend/src/routes/conversations.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Créer une nouvelle conversation
router.post('/', auth, async (req, res) => {
    try {
        const { participants, title, isGroup } = req.body;
        // Vérifier que l'utilisateur actuel est inclus dans les participants
        if (!participants.includes(req.user.id)) {
            participants.push(req.user.id);
        }

        const newConversation = new Conversation({
            participants,
            title: isGroup ? title : undefined,
            isGroup: !!isGroup,
            createdBy: req.user.id
        });

        await newConversation.save();

        // Populate pour renvoyer les informations des participants
        const populatedConversation = await Conversation.findById(newConversation._id)
            .populate('participants', 'username avatar isOnline lastSeen');

        res.status(201).json(populatedConversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Obtenir toutes les conversations de l'utilisateur
router.get('/', auth, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user.id
        })
            .populate('participants', 'username avatar isOnline lastSeen')
            .sort({ updatedAt: -1 });

        // Récupérer le dernier message pour chaque conversation
        const conversationsWithLastMessage = await Promise.all(
            conversations.map(async (conversation) => {
                const lastMessage = await Message.findOne({ conversation: conversation._id })
                    .sort({ createdAt: -1 })
                    .populate('sender', 'username avatar');

                // Calculer les messages non lus
                const unreadCount = await Message.countDocuments({
                    conversation: conversation._id,
                    'readBy.user': { $ne: req.user.id },
                    sender: { $ne: req.user.id }
                });

                return {
                    ...conversation.toObject(),
                    lastMessage,
                    unreadCount
                };
            })
        );

        res.json(conversationsWithLastMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Obtenir une conversation spécifique avec ses messages
router.get('/:id', auth, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.id,
            participants: req.user.id
        }).populate('participants', 'username avatar isOnline lastSeen');

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation non trouvée' });
        }

        // Marquer tous les messages comme lus
        await Message.updateMany(
            {
                conversation: conversation._id,
                sender: { $ne: req.user.id },
                'readBy.user': { $ne: req.user.id }
            },
            {
                $push: {
                    readBy: {
                        user: req.user.id,
                        readAt: new Date()
                    }
                }
            }
        );

        res.json(conversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour une conversation (pour les groupes)
router.patch('/:id', auth, async (req, res) => {
    try {
        const { title, participants } = req.body;
        const conversation = await Conversation.findOne({
            _id: req.params.id,
            participants: req.user.id,
            isGroup: true
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation de groupe non trouvée' });
        }

        // Vérifier si l'utilisateur est le créateur du groupe
        if (conversation.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Seul le créateur du groupe peut le modifier' });
        }

        if (title) conversation.title = title;
        if (participants) conversation.participants = participants;

        await conversation.save();

        const updatedConversation = await Conversation.findById(conversation._id)
            .populate('participants', 'username avatar isOnline lastSeen');

        res.json(updatedConversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;