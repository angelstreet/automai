'use server';

import { cache } from 'react';

import { ActivityItem, Task, Stats, ChatMessage } from '@/types/context/dashboardContextType';

/**
 * Get dashboard statistics
 * @returns Dashboard statistics
 */
export const getDashboardStats = cache(async (): Promise<Stats> => {
  try {
    console.info('Fetching dashboard stats');

    // Static dashboard data
    const data: Stats = {
      projects: 12,
      testCases: 157,
      testsRun: 1204,
      successRate: 87,
    };

    return data;
  } catch (error) {
    console.error('Error in getDashboardStats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return getEmptyStats();
  }
});

/**
 * Get recent activity
 * @returns Recent activity items
 */
export const getRecentActivity = cache(async (): Promise<ActivityItem[]> => {
  try {
    console.info('Fetching recent activity');

    // Static activity data
    const data: ActivityItem[] = [
      {
        id: '1',
        user: 'John Doe',
        action: 'created',
        timestamp: Date.now() - 20 * 60 * 1000, // 20 minutes ago
      },
      {
        id: '2',
        user: 'Jane Smith',
        action: 'updated',
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      },
      {
        id: '3',
        user: 'Robert Johnson',
        action: 'connected',
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
      },
    ];

    return data;
  } catch (error) {
    console.error('Error in getRecentActivity', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
});

/**
 * Get tasks
 * @returns Task list
 */
export const getTasks = cache(async (): Promise<Task[]> => {
  try {
    console.info('Fetching tasks');

    // Static task data
    const data: Task[] = [
      {
        id: '1',
        title: 'Update test cases for login flow',
        dueDate: 'Due in 2 days',
        priority: 'High',
      },
      {
        id: '2',
        title: 'Review automation scripts',
        dueDate: 'Due tomorrow',
        priority: 'Medium',
      },
      {
        id: '3',
        title: 'Prepare test report',
        dueDate: 'Due next week',
        priority: 'Low',
      },
    ];

    return data;
  } catch (error) {
    console.error('Error in getTasks', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
});

/**
 * Get team chat messages
 * @returns Chat message list
 */
export const getTeamChat = cache(async (): Promise<ChatMessage[]> => {
  try {
    console.info('Fetching team chat');

    // Static chat data
    const data: ChatMessage[] = [
      {
        id: '1',
        name: 'John Doe',
        message: 'Updated the test suite configuration',
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      },
      {
        id: '2',
        name: 'Jane Smith',
        message: 'Added new test cases for payment flow',
        timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
      },
      {
        id: '3',
        name: 'Robert Johnson',
        message: 'Fixed failing tests in CI pipeline',
        timestamp: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
      },
    ];

    return data;
  } catch (error) {
    console.error('Error in getTeamChat', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
});

/**
 * Returns empty stats object for error cases
 */
function getEmptyStats(): Stats {
  return {
    projects: 0,
    testCases: 0,
    testsRun: 0,
    successRate: 0,
  };
}
