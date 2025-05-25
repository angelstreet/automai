export interface ActionResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface BrowserAutomationData {
  isInitialized: boolean;
  startTime: string | null;
  activeHost: any | null; // Will be typed as Host when imported
  sessionId: string | null;
}

export interface BrowserAutomationActions {
  setIsInitialized: (initialized: boolean) => void;
  setStartTime: (time: string | null) => void;
  setActiveHost: (host: any | null) => void;
  setSessionId: (sessionId: string | null) => void;
}

export interface BrowserAutomationContextType extends BrowserAutomationData, BrowserAutomationActions {}

export interface BrowserServerStatus {
  initialized: boolean;
  executing: boolean;
  current_task: string | null;
  start_time: string | null;
  logs: string;
}

export interface BrowserTaskResult {
  result: string;
  status: 'SUCCESS' | 'FAILURE' | 'UNKNOWN';
  logs: string;
}

export interface BrowserInitResult {
  message: string;
  logs: string;
}

export interface BrowserCleanupResult {
  message: string;
  logs: string;
} 