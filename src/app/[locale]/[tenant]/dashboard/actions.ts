'use server';

import { ActivityItem, Task, Stats, ChatMessage } from './types';
import { serverCache } from '@/lib/cache';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';

// Define appropriate cache TTLs (in milliseconds)
const DASHBOARD_STATS_TTL = 5 * 60 * 1000; // 5 minutes
const RECENT_ACTIVITY_TTL = 3 * 60 * 1000; // 3 minutes
const TASKS_TTL = 10 * 60 * 1000; // 10 minutes
const TEAM_CHAT_TTL = 1 * 60 * 1000; // 1 minute (more frequently updated)

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

    // Create tenant-specific cache key
    const cacheKey = serverCache.tenantKey(user.tenant_id, 'dashboard-stats');

    // Use enhanced getOrSet function with proper tagging
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        console.log('Cache miss - fetching dashboard stats for tenant:', user!.tenant_id);
        
        // This is a placeholder for actual data fetching
        // In a real implementation, you would fetch data from your database
        const data: Stats = {
          projects: 0,
          testCases: 0,
          testsRun: 0,
          successRate: 0,
        } as unknown as Stats;
        
        return data;
      },
      {
        ttl: DASHBOARD_STATS_TTL,
        tags: ['dashboard', `tenant:${user.tenant_id}`],
        source: 'getDashboardStats'
      }
    );
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

    // Create tenant-specific cache key
    const cacheKey = serverCache.tenantKey(user.tenant_id, 'recent-activity');

    // Use enhanced getOrSet function with proper tagging
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        console.log('Cache miss - fetching recent activity for tenant:', user!.tenant_id);
        
        // This is a placeholder for actual data fetching
        const data: ActivityItem[] = [];
        
        return data;
      },
      {
        ttl: RECENT_ACTIVITY_TTL,
        tags: ['dashboard', 'activity', `tenant:${user.tenant_id}`],
        source: 'getRecentActivity'
      }
    );
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

    // Create user-specific cache key (tasks are typically user-specific)
    const cacheKey = serverCache.userKey(user.id, 'tasks');

    // Use enhanced getOrSet function with proper tagging
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        console.log('Cache miss - fetching tasks for user:', user!.id);
        
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
      },
      {
        ttl: TASKS_TTL,
        tags: ['dashboard', 'tasks', `user:${user.id}`, `tenant:${user.tenant_id}`],
        source: 'getTasks'
      }
    );
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

    // Create tenant-specific cache key (chat is typically tenant/team specific)
    const cacheKey = serverCache.tenantKey(user.tenant_id, 'team-chat');

    // Use enhanced getOrSet function with proper tagging
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        console.log('Cache miss - fetching team chat for tenant:', user!.tenant_id);
        
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
      },
      {
        ttl: TEAM_CHAT_TTL,
        tags: ['dashboard', 'chat', `tenant:${user.tenant_id}`],
        source: 'getTeamChat'
      }
    );
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
  user?: AuthUser | null
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

    // Invalidate the chat cache to ensure fresh data on next fetch
    serverCache.deleteByTag('chat');
    serverCache.delete(serverCache.tenantKey(user.tenant_id, 'team-chat'));

    return { 
      success: true, 
      data: newMessage 
    };
  } catch (error) {
    console.error('Error adding chat message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add message'
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
  user?: AuthUser | null
): Promise<{
  success: boolean;
  clearedEntries: number;
  message: string;
}> {
  try {
    // Use provided user data or fetch it if not provided
    if (!user) {
      user = await getUser();
      if (!user) {
        return {
          success: false,
          clearedEntries: 0,
          message: 'User not authenticated'
        };
      }
    }
    
    const { section, tenantId, userId } = options || {};
    let clearedEntries = 0;
    
    // Determine what to clear based on section parameter
    if (section === 'stats' || section === 'all') {
      clearedEntries += serverCache.deleteByTag('dashboard');
      if (tenantId) {
        clearedEntries += serverCache.delete(serverCache.tenantKey(tenantId, 'dashboard-stats'));
      }
    }
    
    if (section === 'activity' || section === 'all') {
      clearedEntries += serverCache.deleteByTag('activity');
      if (tenantId) {
        clearedEntries += serverCache.delete(serverCache.tenantKey(tenantId, 'recent-activity'));
      }
    }
    
    if (section === 'tasks' || section === 'all') {
      clearedEntries += serverCache.deleteByTag('tasks');
      if (userId) {
        clearedEntries += serverCache.delete(serverCache.userKey(userId, 'tasks'));
      }
    }
    
    if (section === 'chat' || section === 'all') {
      clearedEntries += serverCache.deleteByTag('chat');
      if (tenantId) {
        clearedEntries += serverCache.delete(serverCache.tenantKey(tenantId, 'team-chat'));
      }
    }
    
    // If no specific section was specified, clear all dashboard-related cache
    if (!section || section === 'all') {
      clearedEntries += serverCache.deleteByTag('dashboard');
      
      // Also clear tenant-specific and user-specific cache if IDs provided
      if (tenantId) {
        clearedEntries += serverCache.deletePattern(`tenant:${tenantId}:dashboard`);
      }
      
      if (userId) {
        clearedEntries += serverCache.deletePattern(`user:${userId}:dashboard`);
      }
    }
    
    return {
      success: true,
      clearedEntries,
      message: `Dashboard cache cleared: ${clearedEntries} entries removed`
    };
  } catch (error) {
    console.error('Error clearing dashboard cache:', error);
    return {
      success: false,
      clearedEntries: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
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
