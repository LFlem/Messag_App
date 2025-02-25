// backend/src/index.js (ou app.js)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const path = require('path');
const cors = require('cors');
const SocketService = require('./services/socket');

// Routes
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const mediaRoutes = require('./routes/media');

// Initialisation de l'application
const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialisation du service WebSocket
const socketService = new SocketService(server);
app.set('socketService', socketService);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/media', mediaRoutes);

//console.log('MONGODB_URI:', process.env.MONGODB_URI); // Ajoutez cette ligne pour déboguer

mongoose.connect(process.env.MONGODB_URI) // Options dépréciées supprimées
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));