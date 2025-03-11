// Common types for the Deployment View components

export interface Script {
  id: number;
  name: string;
  path: string;
  status?: string;
  duration?: string | null;
}

export interface Host {
  id: number;
  name: string;
  ip: string;
  environment: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface Deployment {
  id: number;
  name: string;
  projectName: string;
  projectId: number;
  status: 'success' | 'failed' | 'in_progress' | 'pending' | 'cancelled' | 'partial';
  createdBy: string;
  description?: string;
  scheduledTime?: string | null;
  startTime: string | null;
  endTime: string | null;
  scripts: Script[];
  hosts: Host[];
  logs: LogEntry[];
}

export interface Project {
  id: number;
  name: string;
  scripts: Script[];
}
