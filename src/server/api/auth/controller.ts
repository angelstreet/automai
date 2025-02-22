const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const crypto = require('crypto');
const passport = require('passport');

const prisma = new PrismaClient();

// Helper function to generate random token
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Helper function to generate JWT token
const generateJWT = (user: any) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Login user with email and password
 */
const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true, // Fixed relation name from Tenant to tenant
      },
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has a password (might be OAuth user)
    if (!user.password) {
      return res.status(401).json({ error: 'This account uses a different login method' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user info and token (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

/**
 * Register new user
 */
const register = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, name, tenantName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant if name provided
    let tenant = null;
    if (tenantName) {
      tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
        },
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        tenantId: tenant?.id,
        role: tenant ? 'ADMIN' : 'USER', // Make user admin if they created a tenant
      },
      include: {
        tenant: true, // Fixed relation name
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user info and token (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id; // Will be set by auth middleware
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine user's plan based on tenant status
    let plan: 'TRIAL' | 'PRO' | 'ENTERPRISE' = 'TRIAL';
    if (user.tenant) {
      plan = 'ENTERPRISE';
    } else {
      // TODO: Implement proper plan management
      // For now, default to TRIAL for demonstration
      plan = 'TRIAL';
    }

    // Return user info (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      ...userWithoutPassword,
      plan,
    });
  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * Request password reset
 */
const requestPasswordReset = async (req: express.Request, res: express.Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({ message: 'If an account exists, a password reset link has been sent' });
    }

    // Generate reset token
    const resetToken = generateToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // TODO: Send email with reset link
    // For now, just return the token in response (for testing)
    res.json({ 
      message: 'Password reset link sent',
      resetToken, // Remove this in production
    });
  } catch (error) {
    console.error('Error in requestPasswordReset:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

/**
 * Reset password using token
 */
const resetPassword = async (req: express.Request, res: express.Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

/**
 * Send email verification
 */
const sendVerificationEmail = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate verification token
    const verificationToken = generateToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 3600000); // 24 hours

    // Save verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // TODO: Send verification email
    // For now, return token in response (for testing)
    res.json({ 
      message: 'Verification email sent',
      verificationToken, // Remove this in production
    });
  } catch (error) {
    console.error('Error in sendVerificationEmail:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
};

/**
 * Verify email with token
 */
const verifyEmail = async (req: express.Request, res: express.Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with valid verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Mark email as verified and clear verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error in verifyEmail:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};

// Helper function to handle OAuth success
const handleOAuthSuccess = (req: express.Request, res: express.Response) => {
  const user = req.user;
  if (!user) {
    return res.redirect(`http://localhost:3000/en/login?error=Authentication failed`);
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Redirect to the frontend auth-redirect page using absolute URL
  res.redirect(`http://localhost:3000/en/auth-redirect?token=${token}`);
};

// Helper function to handle OAuth failure
const handleOAuthFailure = (req: express.Request, res: express.Response) => {
  const error = req.query.error || 'Authentication failed';
  res.redirect(`http://localhost:3000/en/login?error=${error}`);
};

/**
 * Google OAuth routes
 */
const googleAuth = passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false
});

const googleCallback = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      console.error('Google OAuth Error:', err);
      return handleOAuthFailure(req, res);
    }
    if (!user) {
      console.error('Google OAuth: No user returned', info);
      return handleOAuthFailure(req, res);
    }
    req.user = user;
    return handleOAuthSuccess(req, res);
  })(req, res, next);
};

/**
 * GitHub OAuth routes
 */
const githubAuth = passport.authenticate('github', { 
  scope: ['user:email'],
  session: false
});

const githubCallback = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  passport.authenticate('github', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      console.error('GitHub OAuth Error:', err);
      return handleOAuthFailure(req, res);
    }
    if (!user) {
      console.error('GitHub OAuth: No user returned', info);
      return handleOAuthFailure(req, res);
    }
    req.user = user;
    return handleOAuthSuccess(req, res);
  })(req, res, next);
};

module.exports = {
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
}; 