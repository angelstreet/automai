const { Router } = require('express');
const { getStats } = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticateToken, getStats);

module.exports = router;
