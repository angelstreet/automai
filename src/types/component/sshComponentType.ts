/**
 * SSH connection and authentication types
 */
import { WebSocket } from 'ws';

/**
 * Extended WebSocket connection with additional properties
 */
export type WebSocketConnection = WebSocket & {
  isAlive?: boolean;
  authTimeout?: NodeJS.Timeout;
};

/**
 * SSH Authentication data structure
 */
export interface SSHAuthData {
  ssh_username?: string;
  ssh_password?: string;
  ssh_host?: string;
  ssh_port?: number;
  is_windows?: boolean;
  username?: string;
  password?: string;
  host?: string;
  port?: number;
}

/**
 * SSH Error with additional SSH-specific properties
 */
export interface SSHError extends Error {
  code?: string;
  level?: string;
}

/**
 * SSH connection configuration
 */
export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  timeout?: number;
}

/**
 * SSH execution result
 */
export interface SSHExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}
