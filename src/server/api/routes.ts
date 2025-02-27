const express = require('express');
const router = express.Router();

console.log('Loading auth routes...');
const authRoutes = require('./auth/routes');
console.log('Auth routes loaded successfully');

console.log('Loading project routes...');
const projectRoutes = require('./projects/routes');
console.log('Project routes loaded successfully');

console.log('Loading test case routes...');
const useCaseRoutes = require('./usecases/routes');
console.log('Test case routes loaded successfully');

console.log('Loading stats routes...');
const statsRoutes = require('./stats/routes');
console.log('Stats routes loaded successfully');

console.log('Loading hosts routes...');
const machinesRoutes = require('./virtualization/machines').default;
console.log('Hosts routes loaded successfully');

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
console.log('Setting up auth routes...');
router.use('/auth', authRoutes);
console.log('Auth routes set up successfully');

// Project routes
console.log('Setting up project routes...');
router.use('/projects', projectRoutes);
console.log('Project routes set up successfully');

// Test case routes
console.log('Setting up test case routes...');
router.use('/usecases', useCaseRoutes);
console.log('Test case routes set up successfully');

// Stats routes
console.log('Setting up stats routes...');
router.use('/stats', statsRoutes);
console.log('Stats routes set up successfully');

// Hosts routes
console.log('Setting up hosts routes...');
router.use('/hosts', machinesRoutes);
router.use('/virtualization/machines', machinesRoutes);
console.log('Hosts routes set up successfully');

module.exports = router;
