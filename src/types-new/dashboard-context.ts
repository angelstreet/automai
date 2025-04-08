/**
 * Dashboard context type definitions
 * Contains types related to the dashboard UI and data
 */

/**
 * Activity item for activity feed
 */
export interface ActivityItem {
  id: string;
  action: string;
  timestamp: number;
  user: string;
  target?: {
    id: string;
    type: string;
    name: string;
  };
}

/**
 * Task item for dashboard tasks
 */
export interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status?: 'pending' | 'in-progress' | 'completed';
  assignee?: string;
}

/**
 * Dashboard statistics
 */
export interface Stats {
  successRate: number;
  testsRun: number;
  projects?: number;
  testCases?: number;
  activeProjects?: number;
  uptime?: number;
  deployments?: {
    successful: number;
    failed: number;
    pending: number;
  };
  hosts?: {
    online: number;
    offline: number;
    total: number;
  };
}

/**
 * Chat message for dashboard chat
 */
export interface ChatMessage {
  id: string;
  name: string;
  message: string;
  timestamp: number;
  avatar?: string;
}

/**
 * Team summary for dashboard
 */
export interface DashboardTeam {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  projectCount?: number;
  recentActivity?: ActivityItem[];
}

/**
 * Dashboard context data
 */
export interface DashboardContextData {
  activities: ActivityItem[];
  tasks: Task[];
  stats: Stats;
  messages: ChatMessage[];
  teams: DashboardTeam[];
  isLoading: boolean;
  lastUpdated?: number;
}

/**
 * Dashboard context actions
 */
export interface DashboardContextActions {
  fetchActivities: () => Promise<ActivityItem[]>;
  fetchTasks: () => Promise<Task[]>;
  fetchStats: () => Promise<Stats>;
  fetchMessages: () => Promise<ChatMessage[]>;
  fetchTeams: () => Promise<DashboardTeam[]>;
  markTaskComplete: (taskId: string) => Promise<boolean>;
  refreshDashboard: () => Promise<void>;
}

/**
 * Complete dashboard context
 */
export interface DashboardContext extends DashboardContextData, DashboardContextActions {}
