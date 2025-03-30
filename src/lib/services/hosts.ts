import { Client } from 'ssh2';
import type { ClientChannel } from 'ssh2';

/**
 * Test connection to a host
 */
export async function testHostConnection(data: {
  type: string;
  ip: string;
  port?: number;
  username?: string;
  user?: string; // Allow either username or user
  password?: string;
  hostId?: string;
}): Promise<{ success: boolean; error?: string; message?: string; is_windows?: boolean }> {
  console.log('[@service:hosts:testHostConnection] Testing connection with data:', {
    type: data.type,
    ip: data.ip,
    port: data.port,
    user: data.user || data.username,
    hasPassword: !!data.password,
  });

  // Default Windows detection to false
  let detectedWindows = false;
  let result = {
    success: false,
    message: '',
    is_windows: false,
  };

  try {
    if (data.type === 'ssh') {
      // Ensure we have the needed parameters for an SSH connection
      const username = data.username || data.user;
      if (!username) {
        console.error('[@service:hosts:testHostConnection] Missing username for SSH connection');
        return { success: false, error: 'Username is required for SSH connections' };
      }

      if (!data.password) {
        console.error('[@service:hosts:testHostConnection] Missing password for SSH connection');
        return { success: false, error: 'Password is required for SSH connections' };
      }

      // Test SSH connection
      const ssh = new Client();

      try {
        // Create debug handler for Windows detection - only log important events, not every debug message
        const debugHandler = (message: string) => {
          // Only log if the message contains Windows detection indicators
          if (
            message.includes('OpenSSH_for_Windows') ||
            message.toLowerCase().includes('windows')
          ) {
            console.log(
              `[@service:hosts:testHostConnection] Windows indicator detected in debug message from ${data.ip}`,
            );
            detectedWindows = true;
          }
        };

        // Add debug handler - using type assertion to allow 'debug' event
        (ssh as any).on('debug', debugHandler);

        // Connect to the host with a promise
        await new Promise<void>((resolve, _reject) => {
          ssh.on('ready', () => {
            console.log(`[@service:hosts:testHostConnection] Connection successful to ${data.ip}`);
            result.success = true;
            resolve();
          });

          ssh.on('error', (err) => {
            console.error(
              `[@service:hosts:testHostConnection] Connection error to ${data.ip}:`,
              err,
            );
            result.message = err.message;
            _reject(err);
          });

          // Try to connect
          console.log(
            `[@service:hosts:testHostConnection] Attempting connection to ${data.ip}:${data.port || 22}`,
          );
          ssh.connect({
            host: data.ip,
            port: data.port || 22,
            username: username,
            password: data.password,
            // Short timeout for testing
            readyTimeout: 10000,
            // Enable debug mode for Windows detection
            debug: debugHandler,
          });
        });

        // Check for command execution to detect OS
        if (result.success) {
          try {
            // Execute a command to further detect Windows
            await new Promise<void>((resolve, _reject) => {
              ssh.exec(
                'systeminfo || echo %OS%',
                (err: Error | undefined, stream: ClientChannel) => {
                  if (err) {
                    console.error(
                      `[@service:hosts:testHostConnection] Command execution error:`,
                      err,
                    );
                    resolve();
                    return;
                  }

                  let output = '';
                  let hasWindowsIdentifier = false;

                  stream
                    .on('data', (data: Buffer) => {
                      const chunk = data.toString();
                      output += chunk;

                      // Check output for Windows identifiers - only log once
                      if (
                        !hasWindowsIdentifier &&
                        (chunk.includes('Windows') ||
                          chunk.includes('Microsoft') ||
                          chunk.includes('WINDOWS'))
                      ) {
                        console.log(
                          `[@service:hosts:testHostConnection] Windows OS detected from command output`,
                        );
                        detectedWindows = true;
                        hasWindowsIdentifier = true;
                      }
                    })
                    .on('end', () => {
                      // Just log a summary, not the full output which can be very long
                      const outputSummary =
                        output.length > 100 ? output.substring(0, 100) + '... [truncated]' : output;
                      console.log(
                        `[@service:hosts:testHostConnection] Command output summary:`,
                        outputSummary,
                      );
                      resolve();
                    })
                    .on('error', (err: Error) => {
                      console.error(`[@service:hosts:testHostConnection] Stream error:`, err);
                      resolve();
                    });
                },
              );
            });
          } catch (cmdErr) {
            console.error(
              `[@service:hosts:testHostConnection] Error in command execution:`,
              cmdErr,
            );
          }
        }

        // Close the connection
        ssh.end();
      } catch (sshErr) {
        console.error(`[@service:hosts:testHostConnection] SSH connection failed:`, sshErr);
        return {
          success: false,
          error:
            sshErr instanceof Error
              ? sshErr.message
              : 'Unknown error occurred during SSH connection',
        };
      }
    } else if (data.type === 'docker') {
      // Docker connection test logic would go here
      console.log(
        `[@service:hosts:testHostConnection] Docker connection testing not yet implemented`,
      );
      return { success: false, error: 'Docker connection testing not implemented yet' };
    } else if (data.type === 'portainer') {
      // Portainer connection test logic would go here
      console.log(
        `[@service:hosts:testHostConnection] Portainer connection testing not yet implemented`,
      );
      return { success: false, error: 'Portainer connection testing not implemented yet' };
    } else {
      console.error(`[@service:hosts:testHostConnection] Unknown connection type: ${data.type}`);
      return { success: false, error: `Unknown connection type: ${data.type}` };
    }

    // Set is_windows flag in the result
    result.is_windows = detectedWindows;

    // Log results including Windows detection
    console.log(`[@service:hosts:testHostConnection] Connection test complete for ${data.ip}`, {
      success: result.success,
      is_windows: result.is_windows,
    });

    return result;
  } catch (error) {
    console.error(`[@service:hosts:testHostConnection] Error in connection test:`, error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error occurred during connection test',
    };
  }
}
