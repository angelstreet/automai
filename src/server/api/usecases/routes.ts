const express = require('express');
const router = express.Router();
const { 
  createUseCase,
  getUseCases,
  getUseCase,
  updateUseCase,
  deleteUseCase,
  lockUseCase,
  unlockUseCase,
} = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// Auth routes
router.post('/', authenticateToken, createUseCase);
router.get('/', authenticateToken, getUseCases);
router.get('/:id', authenticateToken, getUseCase);
router.patch('/:id', authenticateToken, updateUseCase);
router.delete('/:id', authenticateToken, deleteUseCase);
router.post('/:id/lock', authenticateToken, lockUseCase);
router.post('/:id/unlock', authenticateToken, unlockUseCase);

module.exports = router; 