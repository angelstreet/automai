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
router.post('/auth/login', login);
router.post('/auth/register', register);
router.post('/auth/reset-password/request', requestPasswordReset);
router.post('/auth/reset-password', resetPassword);
router.get('/auth/profile', authenticateToken, getProfile);
router.post('/auth/verify-email/send', authenticateToken, sendVerificationEmail);
router.post('/auth/verify-email', verifyEmail);

// OAuth routes
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleCallback);
router.get('/auth/github', githubAuth);
router.get('/auth/github/callback', githubCallback);

// User management
router.delete('/auth/users/:email', deleteUser);

module.exports = router; 