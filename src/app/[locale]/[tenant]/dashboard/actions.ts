'use server';

// Cache for server actions to prevent unnecessary API calls
let statsCache: any = null;
let statsLastFetch = 0;

let activityCache: any = null;
let activityLastFetch = 0;

let tasksCache: any = null;
let tasksLastFetch = 0;

let chatCache: any = null;
let chatLastFetch = 0;

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export async function getDashboardStats() {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (statsCache && now - statsLastFetch < CACHE_DURATION) {
    return statsCache;
  }
  
  // This is a placeholder for actual data fetching
  // In a real implementation, you would fetch data from your database
  const data = {
    projects: 0,
    testCases: 0,
    testsRun: 0,
    successRate: 0,
  };
  
  // Update cache
  statsCache = data;
  statsLastFetch = now;
  
  return data;
}

export async function getRecentActivity() {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (activityCache && now - activityLastFetch < CACHE_DURATION) {
    return activityCache;
  }
  
  // This is a placeholder for actual data fetching
  const data = [];
  
  // Update cache
  activityCache = data;
  activityLastFetch = now;
  
  return data;
}

export async function getTasks() {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (tasksCache && now - tasksLastFetch < CACHE_DURATION) {
    return tasksCache;
  }
  
  // This is a placeholder for actual data fetching
  const data = [
    {
      id: '1',
      title: 'Update test cases for login flow',
      dueDate: 'Due in 2 days',
    },
    {
      id: '2',
      title: 'Review automation scripts',
      dueDate: 'Due tomorrow',
    },
    {
      id: '3',
      title: 'Prepare test report',
      dueDate: 'Due next week',
    },
  ];
  
  // Update cache
  tasksCache = data;
  tasksLastFetch = now;
  
  return data;
}

export async function getTeamChat() {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (chatCache && now - chatLastFetch < CACHE_DURATION) {
    return chatCache;
  }
  
  // This is a placeholder for actual data fetching
  const data = [
    {
      id: '1',
      name: 'John Doe',
      avatar: '/avatars/01.svg',
      message: 'Updated the test suite configuration',
      time: '2 hours ago',
    },
    {
      id: '2',
      name: 'Jane Smith',
      avatar: '/avatars/02.svg',
      message: 'Added new test cases for payment flow',
      time: '5 hours ago',
    },
    {
      id: '3',
      name: 'Robert Johnson',
      avatar: '/avatars/03.svg',
      message: 'Fixed failing tests in CI pipeline',
      time: 'Yesterday',
    },
  ];
  
  // Update cache
  chatCache = data;
  chatLastFetch = now;
  
  return data;
}
