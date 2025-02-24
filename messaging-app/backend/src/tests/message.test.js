const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // Votre application Express
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

let mongoServer;
let testUsers = [];
let testToken;
let testConversation;

beforeAll(async () => {
    // Configurer une base de données MongoDB en mémoire pour les tests
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Créer des utilisateurs de test
    const users = [
        { username: 'user1', email: 'user1@test.com', password: 'password123' },
        { username: 'user2', email: 'user2@test.com', password: 'password123' }
    ];

    for (const userData of users) {
        const user = new User(userData);
        await user.save();
        testUsers.push(user);
    }

    // Générer un token JWT pour le premier utilisateur
    testToken = jwt.sign({ id: testUsers[0]._id }, process.env.JWT_SECRET || 'testsecret', {
        expiresIn: '1h'
    });

    // Créer une conversation de test
    testConversation = new Conversation({
        participants: [testUsers[0]._id, testUsers[1]._id],
        createdBy: testUsers[0]._id
    });
    await testConversation.save();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('API Messages', () => {
    test('POST /api/messages - Envoi d\'un nouveau message', async () => {
        const response = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${testToken}`)
            .send({
                conversationId: testConversation._id.toString(),
                content: 'Message de test',
                type: 'text'
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.content).toBe('Message de test');
        expect(response.body.sender._id).toBe(testUsers[0]._id.toString());
    });

    test('GET /api/messages/conversation/:conversationId - Récupération des messages', async () => {
        // Créer quelques messages de test
        for (let i = 0; i < 3; i++) {
            const message = new Message({
                conversation: testConversation._id,
                sender: testUsers[0]._id,
                content: `Message de test ${i}`,
                type: 'text',
                readBy: [{ user: testUsers[0]._id }]
            });
            await message.save();
        }

        const response = await request(app)
            .get(`/api/messages/conversation/${testConversation._id}`)
            .set('Authorization', `Bearer ${testToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('messages');
        expect(Array.isArray(response.body.messages)).toBeTruthy();
        expect(response.body.messages.length).toBeGreaterThanOrEqual(3);
    });

    test('PATCH /api/messages/:messageId/read - Marquer un message comme lu', async () => {
        // Créer un message de test envoyé par un autre utilisateur
        const message = new Message({
            conversation: testConversation._id,
            sender: testUsers[1]._id,
            content: 'Message à marquer comme lu',
            type: 'text'
        });
        await message.save();

        const response = await request(app)
            .patch(`/api/messages/${message._id}/read`)
            .set('Authorization', `Bearer ${testToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.readBy).toContainEqual(
            expect.objectContaining({
                user: testUsers[0]._id.toString()
            })
        );
    });
});