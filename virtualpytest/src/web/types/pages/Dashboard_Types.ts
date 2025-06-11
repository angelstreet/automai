// Dashboard stats interface
export interface DashboardStats {
  testCases: number;
  campaigns: number;
  trees: number;
  recentActivity: RecentActivity[];
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

export interface ConnectedDevice {
  client_id: string;
  name: string;
  device_model: string;
  local_ip: string;
  client_port: string;
  public_ip: string;
  capabilities: string[];
  status: string;
  registered_at: string;
  last_seen: number;
  system_stats: {
    cpu: {
      percent: number;
    };
    memory: {
      percent: number;
      used_gb: number;
      total_gb: number;
    };
    disk: {
      percent: number;
      used_gb: number;
      total_gb: number;
    };
    timestamp: number;
    error?: string;
  };
}

export type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';
export type LogSource = 'all' | 'frontend' | 'backend';
