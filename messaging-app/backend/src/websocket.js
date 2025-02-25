// /backend/websocket.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const setupWebsocket = (server) => {
    const io = socketIo(server);

    // Middleware pour l'authentification WebSocket
    io.use((socket, next) => {
        if (socket.handshake.auth && socket.handshake.auth.token) {
            jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) return next(new Error('Authentification invalide'));
                socket.user = decoded;
                next();
            });
        } else {
            next(new Error('Authentification requise'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.id}`);

        // Rejoindre toutes les conversations de l'utilisateur
        socket.on('join_conversations', (conversations) => {
            conversations.forEach(convo => {
                socket.join(convo);
            });
        });

        // Gérer les indicateurs de frappe
        socket.on('typing', (data) => {
            socket.to(data.conversationId).emit('typing_indicator', {
                userId: socket.user.id,
                conversationId: data.conversationId,
                isTyping: data.isTyping
            });
        });

        // Mettre à jour le statut à la déconnexion
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.user.id}`);
            // Mettre à jour le statut utilisateur (offline)
            io.emit('user_status_change', {
                userId: socket.user.id,
                status: 'offline'
            });
        });
    });

    return io;
};

module.exports = setupWebsocket;