const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');

const router = express.Router();

// Email verification code flow
router.post('/send-code', userController.sendCode);
router.post('/send-code-signup', userController.sendCodeForSignUp);
router.post('/verify-code', userController.verifyCode);

// Authentication routes
router.post('/signin', userController.signIn);
router.post('/signup', userController.signUp);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.post('/refresh-token', userController.refreshToken);
router.post('/logout', userController.logout);

// User profile routes (require authentication)
router.get('/profile', authenticateToken, userController.getCurrentUser);
router.put('/profile', authenticateToken, validateProfileUpdate, userController.updateUserProfile);
router.put('/profile/role-specific', authenticateToken, userController.updateRoleSpecificProfile);
router.delete('/account', authenticateToken, userController.deleteUserAccount);

// Persona and outputs routes (require authentication)
router.put('/persona', authenticateToken, userController.updatePersona);
router.post('/past-outputs', authenticateToken, userController.addPastOutput);

// Admin routes (require admin role)
router.get('/', authenticateToken, requireRole(['admin']), userController.getAllUsers);
router.get('/:userId', authenticateToken, requireRole(['admin']), userController.getUserById);

module.exports = router;
