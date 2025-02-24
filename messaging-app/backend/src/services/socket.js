const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketService {
    constructor(server) {
        this.io = socketIO(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.connectedUsers = new Map(); // userId -> socketId
        this.initializeHandlers();
    }

    // Authentification du client socket
    async authenticateSocket(socket, next) {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    }

    // Initialisation des gestionnaires d'événements
    initializeHandlers() {
        this.io.use((socket, next) => this.authenticateSocket(socket, next));

        this.io.on('connection', (socket) => {
            this.handleConnection(socket);

            // Gestion des messages
            socket.on('message:send', (data) => this.handleMessage(socket, data));

            // Gestion de la frappe
            socket.on('typing:start', (data) => this.handleTyping(socket, data, true));
            socket.on('typing:stop', (data) => this.handleTyping(socket, data, false));

            // Gestion des conversations
            socket.on('conversation:join', (conversationId) => {
                socket.join(conversationId);
            });
            socket.on('conversation:leave', (conversationId) => {
                socket.leave(conversationId);
            });

            // Marquer les messages comme lus
            socket.on('messages:read', (data) => this.handleMessagesRead(socket, data));

            // Gestion de la déconnexion
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }

    // Gestion de la connexion d'un utilisateur
    handleConnection(socket) {
        const userId = socket.user._id.toString();
        this.connectedUsers.set(userId, socket.id);

        // Mettre à jour le statut en ligne
        User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).exec();

        // Informer les autres utilisateurs
        socket.broadcast.emit('user:online', { userId });

        // Envoyer la liste des utilisateurs en ligne
        this.io.emit('users:online', Array.from(this.connectedUsers.keys()));
    }

    // Gestion des messages
    async handleMessage(socket, data) {
        try {
            const { conversationId, content, type = 'text', media } = data;
            const userId = socket.user._id.toString();

            // Vérifier que l'utilisateur fait partie de la conversation
            const conversation = await Conversation.findOne({
                _id: conversationId,
                participants: userId
            });

            if (!conversation) {
                return socket.emit('error', { message: 'Conversation not found' });
            }

            // Créer le message
            const message = new Message({
                conversation: conversationId,
                sender: userId,
                content,
                type,
                media,
                readBy: [{ user: userId }] // Marquer comme lu par l'expéditeur
            });

            await message.save();

            // Mettre à jour la date de dernière activité de la conversation
            await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

            // Populate le message
            const populatedMessage = await Message.findById(message._id)
                .populate('sender', 'username avatar');

            // Envoyer le message à tous les participants de la conversation
            this.io.to(conversationId).emit('message:new', {
                message: populatedMessage
            });

            // Confirmer l'envoi à l'expéditeur
            socket.emit('message:sent', { messageId: message._id });
        } catch (error) {
            socket.emit('error', { message: 'Failed to send message' });
        }
    }

    // Nouvelle méthode pour gérer les confirmations de lecture
    async handleMessagesRead(socket, data) {
        const { conversationId } = data;
        const userId = socket.user._id.toString();

        try {
            // Marquer tous les messages comme lus
            await Message.updateMany(
                {
                    conversation: conversationId,
                    sender: { $ne: userId },
                    'readBy.user': { $ne: userId }
                },
                {
                    $push: {
                        readBy: {
                            user: userId,
                            readAt: new Date()
                        }
                    }
                }
            );
            // Informer les autres participants
            socket.to(conversationId).emit('messages:read', {
                conversationId,
                userId
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    // Gestion de la frappe
    handleTyping(socket, data, isTyping) {
        const { recipientId } = data;
        const recipientSocketId = this.connectedUsers.get(recipientId);

        if (recipientSocketId) {
            this.io.to(recipientSocketId).emit('user:typing', {
                userId: socket.user._id,
                isTyping
            });
        }
    }

    // Gestion de la déconnexion
    handleDisconnect(socket) {
        const userId = socket.user._id.toString();
        this.connectedUsers.delete(userId);

        // Mettre à jour le statut hors ligne
        User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date()
        }).exec();

        // Informer les autres utilisateurs
        this.io.emit('user:offline', { userId });
    }
}

module.exports = SocketService;