const express = require('express');
const router = express.Router();
const { 
  login, 
  register, 
  getProfile,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  deleteUser,
} = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// Auth routes
router.post('/login', login);
router.post('/register', register);
router.post('/reset-password/request', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/profile', authenticateToken, getProfile);
router.post('/verify-email/send', authenticateToken, sendVerificationEmail);
router.post('/verify-email', verifyEmail);

// OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

// User management
router.delete('/users/:email', deleteUser);

module.exports = router; 