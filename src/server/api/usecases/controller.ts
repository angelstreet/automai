const { PrismaClient } = require('@prisma/client');
const express = require('express');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Find the next available number for a prefix
const findNextNumber = async (prefix: string) => {
  // Get all use cases with this prefix
  const useCases = await prisma.useCase.findMany({
    where: {
      shortId: {
        startsWith: `${prefix}-`,
      },
    },
    orderBy: {
      shortId: 'desc',
    },
  });

  if (useCases.length === 0) {
    return 1; // Start with 1 if no existing use cases with this prefix
  }

  // Find the highest number among the existing shortIds
  let highestNumber = 0;
  for (const useCase of useCases) {
    const parts = useCase.shortId.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > highestNumber) {
        highestNumber = num;
      }
    }
  }

  return highestNumber + 1;
};

// Generate a sequential short ID (e.g., WEB-1, WEB-2, etc.)
const generateShortId = async (prefix: string) => {
  const nextNumber = await findNextNumber(prefix);
  return `${prefix}-${nextNumber}`;
};

const createUseCase = async (req: express.Request, res: express.Response) => {
  try {
    const { name, projectId, steps, shortIdPrefix } = req.body;

    if (!name || !projectId || !steps || !shortIdPrefix) {
      return res
        .status(400)
        .json({ error: 'Name, projectId, steps, and shortIdPrefix are required' });
    }

    // Generate the short ID
    const shortId = await generateShortId(shortIdPrefix);

    const useCase = await prisma.useCase.create({
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

    res.status(201).json(useCase);
  } catch (error) {
    console.error('Error creating use case:', error);
    res.status(500).json({ error: 'Failed to create use case' });
  }
};

const getUseCases = async (req: express.Request, res: express.Response) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const useCases = await prisma.useCase.findMany({
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

    res.json(useCases);
  } catch (error) {
    console.error('Error fetching use cases:', error);
    res.status(500).json({ error: 'Failed to fetch use cases' });
  }
};

const getUseCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const useCase = await prisma.useCase.findFirst({
      where: {
        OR: [{ id }, { shortId: id }],
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

    if (!useCase) {
      return res.status(404).json({ error: 'Use case not found' });
    }

    res.json(useCase);
  } catch (error) {
    console.error('Error fetching use case:', error);
    res.status(500).json({ error: 'Failed to fetch use case' });
  }
};

const updateUseCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { name, steps } = req.body;

    if (!name && !steps) {
      return res.status(400).json({ error: 'Name or steps are required' });
    }

    const useCase = await prisma.useCase.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(steps && { steps }),
      },
    });

    res.json(useCase);
  } catch (error) {
    console.error('Error updating use case:', error);
    res.status(500).json({ error: 'Failed to update use case' });
  }
};

const deleteUseCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    await prisma.useCase.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting use case:', error);
    res.status(500).json({ error: 'Failed to delete use case' });
  }
};

const lockUseCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const useCase = await prisma.useCase.findUnique({
      where: { id },
    });

    if (!useCase) {
      return res.status(404).json({ error: 'Use case not found' });
    }

    if (useCase.lockedBy && useCase.lockedBy !== userId) {
      return res.status(403).json({ error: 'Use case is locked by another user' });
    }

    const updatedUseCase = await prisma.useCase.update({
      where: { id },
      data: { lockedBy: userId },
    });

    res.json(updatedUseCase);
  } catch (error) {
    console.error('Error locking use case:', error);
    res.status(500).json({ error: 'Failed to lock use case' });
  }
};

const unlockUseCase = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const useCase = await prisma.useCase.findUnique({
      where: { id },
    });

    if (!useCase) {
      return res.status(404).json({ error: 'Use case not found' });
    }

    if (useCase.lockedBy !== userId) {
      return res.status(403).json({ error: 'Use case is not locked by you' });
    }

    const updatedUseCase = await prisma.useCase.update({
      where: { id },
      data: { lockedBy: null },
    });

    res.json(updatedUseCase);
  } catch (error) {
    console.error('Error unlocking use case:', error);
    res.status(500).json({ error: 'Failed to unlock use case' });
  }
};

module.exports = {
  createUseCase,
  getUseCases,
  getUseCase,
  updateUseCase,
  deleteUseCase,
  lockUseCase,
  unlockUseCase,
};
