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
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('API Conversations', () => {
    test('POST /api/conversations - Création d\'une nouvelle conversation', async () => {
        const response = await request(app)
            .post('/api/conversations')
            .set('Authorization', `Bearer ${testToken}`)
            .send({
                participants: [testUsers[1]._id.toString()],
                isGroup: false
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.participants).toHaveLength(2);
    });

    test('GET /api/conversations - Récupération des conversations', async () => {
        // Créer une conversation de test
        const conversation = new Conversation({
            participants: [testUsers[0]._id, testUsers[1]._id],
            createdBy: testUsers[0]._id
        });
        await conversation.save();

        const response = await request(app)
            .get('/api/conversations')
            .set('Authorization', `Bearer ${testToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body.length).toBeGreaterThan(0);
    });

    test('GET /api/conversations/:id - Récupération d\'une conversation spécifique', async () => {
        // Créer une conversation de test
        const conversation = new Conversation({
            participants: [testUsers[0]._id, testUsers[1]._id],
            createdBy: testUsers[0]._id
        });
        await conversation.save();

        const response = await request(app)
            .get(`/api/conversations/${conversation._id}`)
            .set('Authorization', `Bearer ${testToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body._id).toBe(conversation._id.toString());
    });

    test('PATCH /api/conversations/:id - Mise à jour d\'une conversation de groupe', async () => {
        // Créer une conversation de groupe de test
        const conversation = new Conversation({
            participants: [testUsers[0]._id, testUsers[1]._id],
            title: 'Groupe de test',
            isGroup: true,
            createdBy: testUsers[0]._id
        });
        await conversation.save();

        const response = await request(app)
            .patch(`/api/conversations/${conversation._id}`)
            .set('Authorization', `Bearer ${testToken}`)
            .send({
                title: 'Nouveau titre du groupe'
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.title).toBe('Nouveau titre du groupe');
    });
});