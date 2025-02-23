import { PrismaClient, User as PrismaUser, Tenant } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express from 'express';
import crypto from 'crypto';
import passport from 'passport';
import { User } from 'next-auth';

const prisma = new PrismaClient();

// Helper function to generate random token
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Define AuthUser type for authenticated requests
interface AuthUser {
  id: string;
  email: string;
  role?: string;
  tenantId?: string | null;
  tenantName?: string | null;
  plan?: string;
  tenant?: Tenant;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Update the generateJWT function
const generateJWT = (user: AuthUser) => {
  // Determine plan based on tenant
  let plan = user.plan || 'TRIAL';
  if (user.tenant?.name) {
    plan = user.tenant.name === 'pro' ? 'PRO' : 'ENTERPRISE';
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      role: user.role || 'USER',
      plan,
    },
    jwtSecret,
    { expiresIn: '24h' }
  );
};

/**
 * Login user with email and password
 */
const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
      },
    });

    console.log('User found:', user ? 'yes' : 'no');

    // Check if user exists
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has a password (might be OAuth user)
    if (!user.password) {
      console.log('User has no password (OAuth user)');
      return res.status(401).json({ error: 'This account uses a different login method' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Determine user's plan based on tenant status and name
    let plan: 'TRIAL' | 'PRO' | 'ENTERPRISE' = 'TRIAL';
    let tenantName = null;
    if (user.tenant) {
      tenantName = user.tenant.name;
      if (user.tenant.name === 'pro') {
        plan = 'PRO';
      } else {
        plan = 'ENTERPRISE';
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: (user as any).id,
        email: (user as any).email,
        tenantId: (user as any).tenantId,
        tenantName,
        role: (user as any).role,
        plan,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Return user info and token (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: {
        ...userWithoutPassword,
        tenantName,
        plan,
      },
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
    console.log('Registration request received:', { 
      email: req.body.email,
      hasPassword: !!req.body.password,
      tenantName: req.body.tenantName 
    });

    const { email, password, name, tenantName } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('Registration validation failed: missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('Registration failed: email already exists:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant if name provided
    let tenant = null;
    if (tenantName) {
      console.log('Creating tenant:', tenantName);
      tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
        },
      });
    }

    // Create user
    console.log('Creating user with email:', email);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        tenantId: tenant?.id,
        role: tenant ? 'ADMIN' : 'USER', // Make user admin if they created a tenant
      },
      include: {
        tenant: true,
      },
    });
    console.log('User created successfully:', { id: user.id, email: user.email });

    // Determine user's plan based on tenant status and name
    let plan: 'TRIAL' | 'PRO' | 'ENTERPRISE' = 'TRIAL';
    if (user.tenant) {
      if (user.tenant.name === 'pro') {
        plan = 'PRO';
      } else {
        plan = 'ENTERPRISE';
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: (user as any).id,
        email: (user as any).email,
        tenantId: (user as any).tenantId,
        tenantName: user.tenant ? user.tenant.name : null,
        role: (user as any).role,
        plan, // Include plan in token
      },
      process.env.JWT_SECRET!,
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
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine user's plan based on tenant status and name
    let plan = 'TRIAL';
    if (user.tenant?.name) {
      plan = user.tenant.name === 'pro' ? 'PRO' : 'ENTERPRISE';
    }

    // Return user info (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      ...userWithoutPassword,
      plan,
    });
  } catch (error) {
    console.error('Error in getProfile:', error);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine user's plan based on tenant status and name
    let plan: 'TRIAL' | 'PRO' | 'ENTERPRISE' = 'TRIAL';
    let tenantName = null;
    if (user.tenant) {
      tenantName = user.tenant.name;
      if (user.tenant.name === 'pro') {
        plan = 'PRO';
      } else {
        plan = 'ENTERPRISE';
      }
    }

    // Return user info (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      ...userWithoutPassword,
      plan,
      tenantName,
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
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
const handleOAuthSuccess = async (req: express.Request, res: express.Response) => {
  const user = req.user as AuthUser;
  if (!user) {
    return res.redirect(`http://localhost:3000/en/login?error=Authentication failed`);
  }

  // Fetch fresh user data with tenant info
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: { tenant: true },
  });

  if (!userData) {
    return res.redirect(`http://localhost:3000/en/login?error=User not found`);
  }

  // Determine plan based on tenant status and name
  let plan: 'TRIAL' | 'PRO' | 'ENTERPRISE' = 'TRIAL';
  let tenantName = null;
  if (userData.tenant) {
    tenantName = userData.tenant.name;
    if (userData.tenant.name === 'pro') {
      plan = 'PRO';
    } else {
      plan = 'ENTERPRISE';
    }
  }

  const token = jwt.sign(
    {
      userId: userData.id,
      email: userData.email,
      tenantId: userData.tenantId,
      tenantName,
      role: userData.role,
      plan, // Include plan in the token
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('OAuth user data:', { 
    id: userData.id, 
    email: userData.email, 
    tenantId: userData.tenantId,
    plan,
  });
  
  // Redirect to the frontend auth-redirect page
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

/**
 * Delete user account
 */
const deleteUser = async (req: express.Request, res: express.Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        projects: {
          include: {
            usecases: {
              include: {
                executions: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete in order of dependencies
    for (const project of user.projects) {
      for (const usecase of project.usecases) {
        // Delete executions
        await prisma.execution.deleteMany({
          where: { usecaseId: usecase.id }
        });
      }
      // Delete usecases
      await prisma.useCase.deleteMany({
        where: { projectId: project.id }
      });
    }

    // Delete projects
    await prisma.project.deleteMany({
      where: { ownerId: user.id }
    });

    // Finally delete the user
    await prisma.user.delete({
      where: { email }
    });

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
};

/**
 * Exchange Google token for our JWT token
 */
const exchangeGoogleToken = async (req: express.Request, res: express.Response) => {
  try {
    const { token, email, name } = req.body;

    if (!token || !email) {
      return res.status(400).json({ error: 'Token and email are required' });
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        email,
        provider: 'google',
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name,
          provider: 'google',
          emailVerified: true, // Google emails are verified
        },
        include: {
          tenant: true,
        },
      });
    }

    // Determine plan based on tenant status and name
    let plan: 'TRIAL' | 'PRO' | 'ENTERPRISE' = 'TRIAL';
    let tenantName = null;
    if (user.tenant) {
      tenantName = user.tenant.name;
      if (user.tenant.name === 'pro') {
        plan = 'PRO';
      } else {
        plan = 'ENTERPRISE';
      }
    }

    // Generate our JWT token
    const jwtToken = jwt.sign(
      {
        userId: (user as any).id,
        email: (user as any).email,
        tenantId: (user as any).tenantId,
        tenantName,
        role: (user as any).role,
        plan,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Return user info and token
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: {
        ...userWithoutPassword,
        tenantName,
        plan,
      },
      token: jwtToken,
    });
  } catch (error) {
    console.error('Error in exchangeGoogleToken:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
};

export {
  login,
  register,
  getProfile,
  updateProfile,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  deleteUser,
  exchangeGoogleToken,
}; 