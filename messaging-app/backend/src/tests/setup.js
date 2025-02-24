process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';

// Définir un timeout plus long pour les tests qui impliquent des opérations I/O
jest.setTimeout(10000);