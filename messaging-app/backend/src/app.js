const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const SocketService = require('./services/socket');

// Configuration des variables d'environnement
dotenv.config();

// Création de l'application Express
const app = express();
const server = http.createServer(app);
const socketService = new SocketService(server);


// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const mediaRoutes = require('./routes/media');


app.use('/api/auth', authRoutes);
app.use('/api/messages', require('./routes/messages'));
app.use('/api/conversations', conversationRoutes);
app.use('/api/media', mediaRoutes);



// Connexion à MongoDB
/*mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Port d'écoute
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});*/

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));