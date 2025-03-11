'use server';

// Define our data types
interface ActivityItem {
  id: string;
  action: string;
  timestamp: number;
  user: string;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
}

interface Stats {
  successRate: number;
  testsRun: number;
  projects?: number;
  testCases?: number;
  activeProjects?: number;
  uptime?: number;
}

interface ChatMessage {
  id: string;
  name: string;
  message: string;
  timestamp: number;
}

// Cache for server actions to prevent unnecessary API calls
let statsCache: Stats | null = null;
let statsLastFetch = 0;

let activityCache: ActivityItem[] | null = null;
let activityLastFetch = 0;

let tasksCache: Task[] | null = null;
let tasksLastFetch = 0;

let chatCache: ChatMessage[] | null = null;
let chatLastFetch = 0;

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export async function getDashboardStats(): Promise<Stats> {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (statsCache && now - statsLastFetch < CACHE_DURATION) {
    return statsCache;
  }

  // This is a placeholder for actual data fetching
  // In a real implementation, you would fetch data from your database
  const data: Stats = {
    projects: 0,
    testCases: 0,
    testsRun: 0,
    successRate: 0,
  } as unknown as Stats; // Type assertion to match the Stats interface

  // Update cache
  statsCache = data;
  statsLastFetch = now;

  return data;
}

interface ActivityItem {
  id: string;
  action: string;
  timestamp: number;
  user: string;
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (activityCache && now - activityLastFetch < CACHE_DURATION) {
    return activityCache as ActivityItem[];
  }

  // This is a placeholder for actual data fetching
  const data: ActivityItem[] = [];

  // Update cache
  activityCache = data;
  activityLastFetch = now;

  return data;
}

export async function getTasks(): Promise<Task[]> {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (tasksCache && now - tasksLastFetch < CACHE_DURATION) {
    return tasksCache;
  }

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

  // Update cache
  tasksCache = data;
  tasksLastFetch = now;

  return data;
}

export async function getTeamChat(): Promise<ChatMessage[]> {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (chatCache && now - chatLastFetch < CACHE_DURATION) {
    return chatCache;
  }

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

  // Update cache
  chatCache = data;
  chatLastFetch = now;

  return data;
}
