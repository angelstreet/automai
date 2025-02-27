import { prisma } from '@/lib/prisma';
import type { Request, Response } from 'express';

const express = require('express');

const getStats = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get counts for the user
    const [projects, testCases, executions] = await Promise.all([
      prisma.project.count({
        where: { ownerId: userId },
      }),
      prisma.testCase.count({
        where: {
          project: { ownerId: userId },
        },
      }),
      prisma.execution.count({
        where: {
          testcase: {
            project: { ownerId: userId },
          },
        },
      }),
    ]);

    res.json({
      projects,
      testCases,
      campaigns: executions, // Using executions count as campaigns for now
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = {
  getStats,
};
