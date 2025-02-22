const jwt = require('jsonwebtoken');
const express = require('express');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Authentication token is required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      // Add user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        tenantId: decoded.tenantId,
        role: decoded.role,
      };

      next();
    });
  } catch (error) {
    console.error('Error in authenticateToken:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user belongs to a specific tenant
 */
const requireTenant = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user?.tenantId) {
    return res.status(403).json({ error: 'Tenant access required' });
  }
  next();
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Add user type to Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenantId?: string;
        role: string;
      };
    }
  }
}

module.exports = {
  authenticateToken,
  requireTenant,
  requireAdmin,
}; 