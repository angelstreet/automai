const { Router } = require('express');

console.log('Loading project routes...');
const projectRoutes = require('./projects/routes');
console.log('Project routes loaded successfully');

console.log('Loading test case routes...');
const testCaseRoutes = require('./testcases/routes');
console.log('Test case routes loaded successfully');

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Project routes
console.log('Setting up project routes...');
router.use('/projects', projectRoutes);
console.log('Project routes set up successfully');

// Test case routes
console.log('Setting up test case routes...');
router.use('/testcases', testCaseRoutes);
console.log('Test case routes set up successfully');

module.exports = router; 