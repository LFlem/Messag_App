// backend/src/routes/messages.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Envoyer un nouveau message
router.post('/', auth, async (req, res) => {
  try {
    const { conversationId, content, type = 'text', media } = req.body;

    // Vérifier que l'utilisateur fait partie de la conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Accès non autorisé à cette conversation' });
    }

    const message = new Message({
      conversation: conversationId,
      sender: req.user.id,
      content,
      type,
      media,
      readBy: [{ user: req.user.id }] // Marquer comme lu par l'expéditeur
    });

    await message.save();

    // Mettre à jour la date de dernière activité de la conversation
    await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

    // Populate le message pour le retourner avec les détails de l'expéditeur
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar');

    // Notifier via WebSockets (intégration avec votre SocketService)
    req.app.get('socketService').io.to(conversationId).emit('message:new', {
      message: populatedMessage
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Récupérer les messages d'une conversation
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    // Vérifier que l'utilisateur fait partie de la conversation
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Accès non autorisé à cette conversation' });
    }

    // Construire la requête avec pagination basée sur la date
    let query = { conversation: req.params.conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .populate('readBy.user', 'username avatar');

    // Marquer les messages non lus comme lus
    await Message.updateMany(
      {
        conversation: req.params.conversationId,
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

    // Notifier que les messages ont été lus
    req.app.get('socketService').io.to(req.params.conversationId).emit('messages:read', {
      conversationId: req.params.conversationId,
      userId: req.user.id
    });

    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Marquer un message comme lu
router.patch('/:messageId/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    // Vérifier que l'utilisateur fait partie de la conversation
    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Vérifier si le message est déjà lu par cet utilisateur
    const alreadyRead = message.readBy.some(read =>
      read.user.toString() === req.user.id
    );

    if (!alreadyRead) {
      message.readBy.push({
        user: req.user.id,
        readAt: new Date()
      });

      await message.save();

      // Notifier via WebSockets
      req.app.get('socketService').io.to(message.conversation.toString()).emit('message:read', {
        messageId: message._id,
        userId: req.user.id
      });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;