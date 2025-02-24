const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');
const SocketService = require('../services/socket');

let mongoServer;
let httpServer;
let ioServer;
let socketService;
let clientSocket1;
let clientSocket2;
let testUsers = [];
let testTokens = [];
let testConversation;

beforeAll(async () => {
    // Configurer une base de données MongoDB en mémoire
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Créer des utilisateurs de test
    const users = [
        { username: 'socketuser1', email: 'socket1@test.com', password: 'password123' },
        { username: 'socketuser2', email: 'socket2@test.com', password: 'password123' }
    ];

    for (const userData of users) {
        const user = new User(userData);
        await user.save();
        testUsers.push(user);

        // Générer un token JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'testsecret', {
            expiresIn: '1h'
        });
        testTokens.push(token);
    }

    // Créer une conversation de test
    testConversation = new Conversation({
        participants: [testUsers[0]._id, testUsers[1]._id],
        createdBy: testUsers[0]._id
    });
    await testConversation.save();

    // Configurer le serveur Socket.IO
    httpServer = http.createServer();
    ioServer = new Server(httpServer);
    socketService = new SocketService(httpServer);

    await new Promise((resolve) => {
        httpServer.listen(4000, resolve);
    });
});

afterAll(async () => {
    // Nettoyage
    if (clientSocket1) clientSocket1.close();
    if (clientSocket2) clientSocket2.close();
    if (ioServer) ioServer.close();
    if (httpServer) httpServer.close();
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Socket Service', () => {
    test('Connexion au serveur Socket.IO', (done) => {
        clientSocket1 = Client('http://localhost:4000', {
            auth: {
                token: testTokens[0]
            }
        });

        clientSocket1.on('connect', () => {
            expect(clientSocket1.connected).toBeTruthy();
            done();
        });

        clientSocket1.on('connect_error', (err) => {
            done(err);
        });
    });

    test('Envoi et réception de message', (done) => {
        // Connect the second client
        clientSocket2 = Client('http://localhost:4000', {
            auth: {
                token: testTokens[1]
            }
        });

        clientSocket2.on('connect', () => {
            // Join the conversation room
            clientSocket2.emit('conversation:join', testConversation._id.toString());

            // Setup listener for new messages
            clientSocket2.on('message:new', (data) => {
                expect(data).toHaveProperty('message');
                expect(data.message.content).toBe('Test message via sockets');
                done();
            });

            // Send message from client 1
            clientSocket1.emit('conversation:join', testConversation._id.toString());
            setTimeout(() => {
                clientSocket1.emit('message:send', {
                    conversationId: testConversation._id.toString(),
                    content: 'Test message via sockets',
                    type: 'text'
                });
            }, 100);
        });
    });

    test('Indicateur de frappe', (done) => {
        clientSocket2.on('typing_indicator', (data) => {
            expect(data).toHaveProperty('userId');
            expect(data).toHaveProperty('conversationId');
            expect(data).toHaveProperty('isTyping', true);
            done();
        });

        clientSocket1.emit('typing:start', {
            conversationId: testConversation._id.toString()
        });
    });

    test('Marquage des messages comme lus', async (done) => {
        // Créer un message de test
        const message = new Message({
            conversation: testConversation._id,
            sender: testUsers[0]._id,
            content: 'Message à marquer comme lu',
            type: 'text',
            readBy: [{ user: testUsers[0]._id }] // Déjà lu par l'expéditeur
        });
        await message.save();

        clientSocket1.on('messages:read', (data) => {
            expect(data).toHaveProperty('conversationId', testConversation._id.toString());
            expect(data).toHaveProperty('userId', testUsers[1]._id.toString());
            done();
        });

        clientSocket2.emit('messages:read', {
            conversationId: testConversation._id.toString()
        });
    });
});