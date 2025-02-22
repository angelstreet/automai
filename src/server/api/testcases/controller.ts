const { PrismaClient } = require('@prisma/client');
const express = require('express');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Generate a short ID (10 chars, alphanumeric with - and _)
const generateShortId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  let result = '';
  const randomBytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
};

const createTestCase = async (req: express.Request, res: express.Response) => {
  try {
    const { name, projectId, steps } = req.body;

    if (!name || !projectId || !steps) {
      return res.status(400).json({ error: 'Name, projectId, and steps are required' });
    }

    // Generate a unique short ID
    let shortId;
    let isUnique = false;
    while (!isUnique) {
      shortId = generateShortId();
      const existing = await prisma.testCase.findUnique({
        where: { shortId },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    const testCase = await prisma.testCase.create({
      data: {
        name,
        projectId,
        steps,
        shortId,
      },
      include: {
        project: true,
      },
    });

    res.status(201).json(testCase);
  } catch (error) {
    console.error('Error creating test case:', error);
    res.status(500).json({ error: 'Failed to create test case' });
  }
};

const getTestCases = async (req: express.Request, res: express.Response) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const testCases = await prisma.testCase.findMany({
      where: {
        projectId: String(projectId),
      },
      include: {
        project: true,
        executions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    res.json(testCases);
  } catch (error) {
    console.error('Error fetching test cases:', error);
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
};

const getTestCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const testCase = await prisma.testCase.findFirst({
      where: {
        OR: [
          { id },
          { shortId: id }
        ]
      },
      include: {
        project: true,
        executions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    res.json(testCase);
  } catch (error) {
    console.error('Error fetching test case:', error);
    res.status(500).json({ error: 'Failed to fetch test case' });
  }
};

const updateTestCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { name, steps } = req.body;

    if (!name && !steps) {
      return res.status(400).json({ error: 'Name or steps are required' });
    }

    const testCase = await prisma.testCase.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(steps && { steps }),
      },
    });

    res.json(testCase);
  } catch (error) {
    console.error('Error updating test case:', error);
    res.status(500).json({ error: 'Failed to update test case' });
  }
};

const deleteTestCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    await prisma.testCase.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting test case:', error);
    res.status(500).json({ error: 'Failed to delete test case' });
  }
};

const lockTestCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const testCase = await prisma.testCase.findUnique({
      where: { id },
    });

    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    if (testCase.lockedBy && testCase.lockedBy !== userId) {
      return res.status(403).json({ error: 'Test case is locked by another user' });
    }

    const updatedTestCase = await prisma.testCase.update({
      where: { id },
      data: { lockedBy: userId },
    });

    res.json(updatedTestCase);
  } catch (error) {
    console.error('Error locking test case:', error);
    res.status(500).json({ error: 'Failed to lock test case' });
  }
};

const unlockTestCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const testCase = await prisma.testCase.findUnique({
      where: { id },
    });

    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    if (testCase.lockedBy !== userId) {
      return res.status(403).json({ error: 'Test case is not locked by you' });
    }

    const updatedTestCase = await prisma.testCase.update({
      where: { id },
      data: { lockedBy: null },
    });

    res.json(updatedTestCase);
  } catch (error) {
    console.error('Error unlocking test case:', error);
    res.status(500).json({ error: 'Failed to unlock test case' });
  }
};

module.exports = {
  createTestCase,
  getTestCases,
  getTestCase,
  updateTestCase,
  deleteTestCase,
  lockTestCase,
  unlockTestCase,
}; 