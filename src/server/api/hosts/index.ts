import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as ssh2 from 'ssh2';
import { promisify } from 'util';

// Define User type instead of extending Express.Request directly
interface User {
  id: string;
  email: string;
  tenantId: string;
  role: string;
}

// Mock auth middleware for development
const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  // Add mock user for development
  (req as any).user = {
    id: 'mock-user-id',
    email: 'mock@example.com',
    tenantId: 'mock-tenant-id',
    role: 'ADMIN',
  };
  next();
};

const router = Router();
const prisma = new PrismaClient();

// In-memory storage for machines
const mockMachines = [
  {
    id: '1',
    name: 'Development Server',
    description: 'Main development server for testing',
    type: 'ssh',
    ip: '192.168.1.100',
    port: 22,
    status: 'connected',
    lastConnected: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Docker Host',
    description: 'Docker container host',
    type: 'docker',
    ip: '192.168.1.101',
    port: 2375,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Test SSH connection
router.post('/test-connection', isAuthenticated, (req: Request, res: Response): void => {
  try {
    const { type, ip, port = 22, user, password } = req.body;

    if (type !== 'ssh') {
      res.status(400).json({
        success: false,
        message: 'Only SSH connections are supported at this time',
      });
      return;
    }

    if (!ip || !user || !password) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: ip, user, and password are required',
      });
      return;
    }

    // Mock connection test
    // For demo purposes, we'll simulate some failures and successes

    // Simulate some connection failures for testing
    if (ip === '127.0.0.1' && user === 'test') {
      res.status(400).json({
        success: false,
        message: 'Connection failed: Authentication failed',
      });
      return;
    }

    if (ip === '192.168.1.254') {
      res.status(400).json({
        success: false,
        message: 'Connection failed: Connection timeout',
      });
      return;
    }

    // Simulate a successful connection
    res.json({
      success: true,
      message: 'Connection successful',
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Create a new machine connection
router.post('/', isAuthenticated, (req: Request, res: Response): void => {
  try {
    const { name, description, type, ip, port, user, password } = req.body;

    if (!name || !type || !ip) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, and ip are required',
      });
      return;
    }

    if (type === 'ssh' && (!user || !password)) {
      res.status(400).json({
        success: false,
        message: 'SSH connections require user and password',
      });
      return;
    }

    // Create mock machine record
    const newMachine = {
      id: `machine-${Date.now()}`,
      name,
      description,
      type,
      ip,
      port: port ? Number(port) : null,
      user: type === 'ssh' ? user : undefined,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to mock machines
    mockMachines.push(newMachine as any);

    res.status(201).json({
      success: true,
      data: newMachine,
    });
  } catch (error) {
    console.error('Error creating machine:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get all machines
router.get('/', isAuthenticated, (req: Request, res: Response): void => {
  try {
    res.json({
      success: true,
      data: mockMachines,
    });
  } catch (error) {
    console.error('Error fetching machines:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get a single machine
router.get('/:id', isAuthenticated, (req: Request, res: Response): void => {
  try {
    const id = req.params.id;

    // Find machine in mock data
    const machine = mockMachines.find((m) => m.id === id);

    if (!machine) {
      res.status(404).json({
        success: false,
        message: 'Machine not found',
      });
      return;
    }

    res.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    console.error('Error fetching machine:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Delete a machine
router.delete('/:id', isAuthenticated, (req: Request, res: Response): void => {
  try {
    const id = req.params.id;

    // Find machine index
    const machineIndex = mockMachines.findIndex((m) => m.id === id);

    if (machineIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Machine not found',
      });
      return;
    }

    // Remove from mock machines
    mockMachines.splice(machineIndex, 1);

    res.json({
      success: true,
      message: 'Machine deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting machine:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
