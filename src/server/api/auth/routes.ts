const { Router } = require('express');
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
} = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

const router = Router();

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/reset', resetPassword);
router.post('/verify-email/verify', verifyEmail);

// OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.post('/verify-email/send', authenticateToken, sendVerificationEmail);

module.exports = router; 