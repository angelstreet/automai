const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

console.log('Loading routes...');
const apiRoutes = require('./api/routes');
console.log('Routes loaded successfully');

// Load environment variables
console.log('Loading environment variables...');
dotenv.config();
console.log('Environment variables loaded');

// Initialize Express app
console.log('Initializing Express app...');
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
console.log('Setting up API routes...');
app.use('/api', apiRoutes);
console.log('API routes set up successfully');

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error in request:', err);
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 