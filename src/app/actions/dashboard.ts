'use server';

import { revalidatePath } from 'next/cache';

import { ActivityItem, Task, Stats, ChatMessage } from '@/app/[locale]/[tenant]/dashboard/types';
import { logger } from '@/lib/logger';

// Define action result type for consistent return values
type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get dashboard statistics
 * @returns Dashboard statistics
 */
export async function getDashboardStats(): Promise<Stats> {
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
}

/**
 * Get recent activity
 * @returns Recent activity items
 */
export async function getRecentActivity(): Promise<ActivityItem[]> {
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
}

/**
 * Get tasks
 * @returns Task list
 */
export async function getTasks(): Promise<Task[]> {
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
}

/**
 * Get team chat messages
 * @returns Chat message list
 */
export async function getTeamChat(): Promise<ChatMessage[]> {
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
}

/**
 * Add a new message to the team chat
 * @param message Message text
 * @returns Result of the operation
 */
export async function addChatMessage(message: string): Promise<ActionResult<ChatMessage>> {
  try {
    if (!message.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }

    // Create a static new message
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      name: 'Current User',
      message: message.trim(),
      timestamp: Date.now(),
    };

    // Revalidate the dashboard path to update chat messages
    revalidatePath('/[locale]/[tenant]/dashboard');

    return {
      success: true,
      data: newMessage,
    };
  } catch (error) {
    console.error('Error adding chat message', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add message',
    };
  }
}

/**
 * Clear dashboard-related cache by revalidating paths
 */
export async function clearDashboardCache(options?: {
  section?: 'stats' | 'activity' | 'tasks' | 'chat' | 'all';
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Revalidate dashboard path
    revalidatePath('/[locale]/[tenant]/dashboard');

    const section = options?.section || 'all';
    return {
      success: true,
      message: `Dashboard ${section} cache cleared`,
    };
  } catch (error) {
    console.error('Error clearing dashboard cache', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

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
