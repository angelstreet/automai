/**
 * SSH Service
 * Handles SSH connections and operations
 */
import { Client } from 'ssh2';

import { StandardResponse } from '@/lib/utils/commonUtils';

/**
 * Interface for SSH execution result
 */
export interface SSHExecutionResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Interface for SSH connection options
 */
export interface SSHConnectionOptions {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  timeout?: number;
}

/**
 * Interface for SSH command execution options
 */
export interface SSHCommandOptions extends SSHConnectionOptions {
  command: string;
  timeout?: number;
}

// Store active SSH connections
const activeConnections: Record<string, Client> = {};

/**
 * Create and store an SSH connection
 */
export async function createConnection(
  connectionId: string,
  options: SSHConnectionOptions,
): Promise<StandardResponse<boolean>> {
  try {
    // Close existing connection if present
    if (activeConnections[connectionId]) {
      console.log(`[@service:ssh:createConnection] Closing existing connection: ${connectionId}`);
      activeConnections[connectionId].end();
    }

    console.log(`[@service:ssh:createConnection] Creating connection to ${options.host}`);

    // Create new SSH client
    const ssh = new Client();

    // Connect to the host
    await new Promise<void>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        ssh.end();
        reject(new Error('SSH connection timeout'));
      }, options.timeout || 10000);

      ssh.on('ready', () => {
        clearTimeout(connectionTimeout);
        console.log(`[@service:ssh:createConnection] Connected to ${options.host}`);
        resolve();
      });

      ssh.on('error', (err) => {
        clearTimeout(connectionTimeout);
        reject(err);
      });

      // Configure SSH connection
      const sshConfig: any = {
        host: options.host,
        port: options.port || 22,
        username: options.username,
      };

      if (options.password) {
        sshConfig.password = options.password;
      } else if (options.privateKey) {
        sshConfig.privateKey = options.privateKey;
      }

      ssh.connect(sshConfig);
    });

    // Store the connection
    activeConnections[connectionId] = ssh;

    return {
      success: true,
      data: true,
    };
  } catch (error: any) {
    console.error(`[@service:ssh:createConnection] Connection failed: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to establish SSH connection',
    };
  }
}

/**
 * Close an SSH connection
 */
export async function closeConnection(connectionId: string): Promise<StandardResponse<boolean>> {
  try {
    if (activeConnections[connectionId]) {
      console.log(`[@service:ssh:closeConnection] Closing connection: ${connectionId}`);
      activeConnections[connectionId].end();
      delete activeConnections[connectionId];
      return {
        success: true,
        data: true,
      };
    }

    return {
      success: false,
      error: 'No active connection found',
    };
  } catch (error: any) {
    console.error(`[@service:ssh:closeConnection] Error closing connection: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to close SSH connection',
    };
  }
}

/**
 * Execute a command on an existing connection
 */
export async function executeOnConnection(
  connectionId: string,
  command: string,
): Promise<StandardResponse<SSHExecutionResult>> {
  try {
    const ssh = activeConnections[connectionId];
    if (!ssh) {
      return {
        success: false,
        error: 'No active connection found',
      };
    }

    console.log(`[@service:ssh:executeOnConnection] Executing command: ${command}`);

    // Execute the command on the existing connection
    const result = await new Promise<SSHExecutionResult>((resolve, reject) => {
      ssh.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('close', (code: number) => {
          resolve({ stdout, stderr, code: code || 0 });
        });
      });
    });

    console.log(`[@service:ssh:executeOnConnection] Command executed successfully`);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error(`[@service:ssh:executeOnConnection] Command execution failed: ${error.message}`);
    return {
      success: false,
      data: {
        stdout: '',
        stderr: error.message || 'Command execution failed',
        code: 1,
      },
      error: error.message || 'Failed to execute SSH command',
    };
  }
}

/**
 * Execute a command via SSH (creates a new connection for each command)
 */
export async function executeCommand(
  options: SSHCommandOptions,
): Promise<StandardResponse<SSHExecutionResult>> {
  try {
    console.log(`[@service:ssh:executeCommand] Executing on ${options.host}: ${options.command}`);

    if (!options.command) {
      console.error(`[@service:ssh:executeCommand] No command provided for ${options.host}`);
      return {
        success: false,
        error: 'No command provided',
      };
    }

    // Create new SSH client
    const ssh = new Client();

    // Execute the command
    const result = await new Promise<SSHExecutionResult>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        ssh.end();
        reject(new Error('SSH connection timeout'));
      }, options.timeout || 10000);

      ssh.on('ready', () => {
        clearTimeout(connectionTimeout);
        console.log(`[@service:ssh:executeCommand] Connected to ${options.host}`);

        ssh.exec(options.command, (err, stream) => {
          if (err) {
            ssh.end();
            reject(err);
            return;
          }

          let stdout = '';
          let stderr = '';

          stream.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });

          stream.on('close', (code: number) => {
            ssh.end();
            resolve({ stdout, stderr, code: code || 0 });
          });
        });
      });

      ssh.on('error', (err) => {
        clearTimeout(connectionTimeout);
        reject(err);
      });

      // Configure SSH connection
      const sshConfig: any = {
        host: options.host,
        port: options.port || 22,
        username: options.username,
      };

      if (options.password) {
        sshConfig.password = options.password;
      } else if (options.privateKey) {
        sshConfig.privateKey = options.privateKey;
      }

      ssh.connect(sshConfig);
    });

    console.log(`[@service:ssh:executeCommand] Command executed successfully on ${options.host}`);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error(`[@service:ssh:executeCommand] Command execution failed: ${error.message}`);
    return {
      success: false,
      data: {
        stdout: '',
        stderr: error.message || 'Command execution failed',
        code: 1,
      },
      error: error.message || 'Failed to execute SSH command',
    };
  }
}

// Export all SSH service functions
const sshService = {
  createConnection,
  closeConnection,
  executeOnConnection,
  executeCommand,
};

export default sshService;
