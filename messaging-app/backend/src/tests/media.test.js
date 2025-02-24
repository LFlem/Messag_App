const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');
const app = require('../app'); // Votre application Express
const User = require('../models/User');
const jwt = require('jsonwebtoken');

let mongoServer;
let testUser;
let testToken;

beforeAll(async () => {
    // Configurer une base de données MongoDB en mémoire pour les tests
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Créer un utilisateur de test
    testUser = new User({
        username: 'mediauser',
        email: 'media@test.com',
        password: 'password123'
    });
    await testUser.save();

    // Générer un token JWT
    testToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET || 'testsecret', {
        expiresIn: '1h'
    });

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Créer une image test si nécessaire pour les tests d'upload
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    if (!fs.existsSync(testImagePath)) {
        // On crée un fichier vide pour le test
        fs.writeFileSync(testImagePath, Buffer.alloc(1024));
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    // Nettoyer les fichiers de test
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
    }
});

describe('API Media', () => {
    test('POST /api/media/upload - Upload d\'une image', async () => {
        const testImagePath = path.join(__dirname, 'test-image.jpg');

        const response = await request(app)
            .post('/api/media/upload')
            .set('Authorization', `Bearer ${testToken}`)
            .attach('file', testImagePath);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('url');
        expect(response.body).toHaveProperty('type', 'image');

        // Stocker le nom du fichier pour le test de suppression
        global.testMediaFilename = response.body.filename;
    });

    test('DELETE /api/media/:filename - Suppression d\'un média', async () => {
        // Skip si le test précédent a échoué
        if (!global.testMediaFilename) {
            return;
        }

        const response = await request(app)
            .delete(`/api/media/${global.testMediaFilename}`)
            .set('Authorization', `Bearer ${testToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain('supprimé avec succès');
    });
});
