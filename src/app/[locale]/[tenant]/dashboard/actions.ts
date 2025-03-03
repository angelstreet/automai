'use server';

export async function getDashboardStats() {
  // This is a placeholder for actual data fetching
  // In a real implementation, you would fetch data from your database
  return {
    projects: 0,
    testCases: 0,
    testsRun: 0,
    successRate: 0,
  };
}

export async function getRecentActivity() {
  // This is a placeholder for actual data fetching
  return [];
}

export async function getTasks() {
  // This is a placeholder for actual data fetching
  return [
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
}

export async function getTeamChat() {
  // This is a placeholder for actual data fetching
  return [
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
}
