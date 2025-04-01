export interface ActivityItem {
  id: string;
  action: string;
  timestamp: number;
  user: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
}

export interface Stats {
  successRate: number;
  testsRun: number;
  projects?: number;
  testCases?: number;
  activeProjects?: number;
  uptime?: number;
}

export interface ChatMessage {
  id: string;
  name: string;
  message: string;
  timestamp: number;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  projectCount?: number;
}
