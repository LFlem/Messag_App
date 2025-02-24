module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./src/tests/setup.js'],
    testMatch: ['**/?(*.)+(spec|test).js'],
    coveragePathIgnorePatterns: ['/node_modules/'],
    verbose: true
  };