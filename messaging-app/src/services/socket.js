import io from 'socket.io-client';
import { getToken } from './auth';

class SocketService {
  constructor() {
    this.socket = null;
    this.handlers = new Map();
  }

  async connect(baseURL) {
    const token = await getToken();

    this.socket = io(baseURL, {
      auth: { token },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Gestionnaires d'événements par défaut
    this.setupDefaultHandlers();
  }

  setupDefaultHandlers() {
    this.socket.on('message:received', (data) => {
      this.triggerHandler('onMessage', data);
    });

    this.socket.on('user:typing', (data) => {
      this.triggerHandler('onTyping', data);
    });

    this.socket.on('user:online', (data) => {
      this.triggerHandler('onUserOnline', data);
    });

    this.socket.on('user:offline', (data) => {
      this.triggerHandler('onUserOffline', data);
    });
  }

  // Enregistrer des gestionnaires d'événements
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event).add(handler);
  }

  // Déclencher les gestionnaires d'événements
  triggerHandler(event, data) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Envoyer un message
  sendMessage(data) {
    this.socket.emit('message:send', data);
  }

  // Indiquer que l'utilisateur est en train d'écrire
  sendTyping(recipientId, isTyping) {
    const event = isTyping ? 'typing:start' : 'typing:stop';
    this.socket.emit(event, { recipientId });
  }

  // Déconnexion
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();