'use server';

import { ActivityItem, Task, Stats, ChatMessage } from './types';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';

// Define action result type for consistent return values
type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get dashboard statistics with enhanced caching
 *
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @returns Dashboard statistics
 */
export async function getDashboardStats(user?: AuthUser | null): Promise<Stats> {
  try {
    // Get current user if not provided
    if (!user) {
      user = await getUser();
    }

    if (!user) {
      console.error('Actions layer: Cannot fetch dashboard stats - user not authenticated');
      return getEmptyStats();
    }

    console.log('Fetching dashboard stats for tenant:', user.tenant_id);

    // This is a placeholder for actual data fetching
    // In a real implementation, you would fetch data from your database
    const data: Stats = {
      projects: 0,
      testCases: 0,
      testsRun: 0,
      successRate: 0,
    } as unknown as Stats;

    return data;
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return getEmptyStats();
  }
}

/**
 * Get recent activity with enhanced caching
 *
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @returns Recent activity items
 */
export async function getRecentActivity(user?: AuthUser | null): Promise<ActivityItem[]> {
  try {
    // Get current user if not provided
    if (!user) {
      user = await getUser();
    }

    if (!user) {
      console.error('Actions layer: Cannot fetch recent activity - user not authenticated');
      return [];
    }

    console.log('Fetching recent activity for tenant:', user.tenant_id);

    // This is a placeholder for actual data fetching
    const data: ActivityItem[] = [];

    return data;
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    return [];
  }
}

/**
 * Get tasks with enhanced caching
 *
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @returns Task list
 */
export async function getTasks(user?: AuthUser | null): Promise<Task[]> {
  try {
    // Get current user if not provided
    if (!user) {
      user = await getUser();
    }

    if (!user) {
      console.error('Actions layer: Cannot fetch tasks - user not authenticated');
      return [];
    }

    console.log('Fetching tasks for user:', user.id);

    // This is a placeholder for actual data fetching
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
    console.error('Error in getTasks:', error);
    return [];
  }
}

/**
 * Get team chat messages with enhanced caching
 *
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @returns Chat message list
 */
export async function getTeamChat(user?: AuthUser | null): Promise<ChatMessage[]> {
  try {
    // Get current user if not provided
    if (!user) {
      user = await getUser();
    }

    if (!user) {
      console.error('Actions layer: Cannot fetch team chat - user not authenticated');
      return [];
    }

    console.log('Fetching team chat for tenant:', user.tenant_id);

    // This is a placeholder for actual data fetching
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
    console.error('Error in getTeamChat:', error);
    return [];
  }
}

/**
 * Add a new message to the team chat
 *
 * @param message Message text
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @returns Result of the operation
 */
export async function addChatMessage(
  message: string,
  user?: AuthUser | null,
): Promise<ActionResult<ChatMessage>> {
  try {
    // Get current user if not provided
    if (!user) {
      user = await getUser();
    }

    if (!user) {
      console.error('Actions layer: Cannot add chat message - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    if (!message.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }

    // This is a placeholder for actual message creation in database
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      name: user.name || 'Anonymous',
      message: message.trim(),
      timestamp: Date.now(),
    };

    // In a real implementation, you would save the message to your database
    // const result = await saveMessageToDatabase(newMessage);

    return {
      success: true,
      data: newMessage,
    };
  } catch (error) {
    console.error('Error adding chat message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add message',
    };
  }
}

/**
 * Clear dashboard-related cache
 *
 * @param options Optional parameters to target specific cache entries
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @returns Result object with cache clearing details
 */
export async function clearDashboardCache(
  options?: {
    section?: 'stats' | 'activity' | 'tasks' | 'chat' | 'all';
    tenantId?: string;
    userId?: string;
  },
  user?: AuthUser | null,
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Use provided user data or fetch it if not provided
    if (!user) {
      user = await getUser();
      if (!user) {
        return {
          success: false,
          message: 'User not authenticated',
        };
      }
    }

    // With SWR, cache is managed on the client side
    // This function now acts as a placeholder for compatibility
    // Client components should use SWR's mutate function to revalidate data

    return {
      success: true,
      message: 'Dashboard cache cleared via SWR revalidation',
    };
  } catch (error) {
    console.error('Error clearing dashboard cache:', error);
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
