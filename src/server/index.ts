const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const session = require('express-session');

// Load environment configuration
console.log('Loading environment configuration...');
const config = require('./config/env')();
console.log('Environment configuration loaded successfully');

console.log('Loading routes...');
const apiRoutes = require('./api/routes');
console.log('Routes loaded successfully');

// Initialize Express app
console.log('Initializing Express app...');
const app = express();
const prisma = new PrismaClient();

// CORS configuration
app.use(
  cors({
    origin: ['http://localhost:3000'], // Add your frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  }),
);

// Body parser middleware
app.use(express.json());

// Session configuration
app.use(
  session({
    secret: config.jwt.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Initialize Passport
console.log('Initializing Passport...');
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());
console.log('Passport initialized successfully');

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
app.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on http://localhost:${config.port}`);
});
