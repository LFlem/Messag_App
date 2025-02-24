const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middlewares/validators');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
//router.post('/logout', authController.protect, authController.logout);
router.get('/profile', authController.protect, authController.getProfile);

module.exports = router;