// Dashboard stats interface
export interface DashboardStats {
  testCases: number;
  campaigns: number;
  trees: number;
  recentActivity: RecentActivity[];
}

// System stats structure as returned by the server (flat structure)
// Used for dashboard display of device resource usage
export interface SystemStats {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  platform: string;
  architecture: string;
  python_version: string;
  error?: string;
}

// Recent activity interface (separate from LogEntry)
export interface RecentActivity {
  id: string;
  type: 'test' | 'campaign';
  name: string;
  status: 'success' | 'error' | 'pending';
  timestamp: string;
}

// Log entry interface for debug logs
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'frontend' | 'backend';
  message: string;
  details?: any;
}

export type ViewMode = 'grid' | 'table';

export type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';
export type LogSource = 'all' | 'frontend' | 'backend';
