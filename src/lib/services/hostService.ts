/**
 * Test connection to a host
 */
import { Client } from 'ssh2';

import { StandardResponse } from '@/lib/utils/commonUtils';

export async function testHostConnection(data: {
  type: string;
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  hostId?: string;
}): Promise<StandardResponse<boolean> & { is_windows?: boolean }> {
  console.log('\n====== SERVER-SIDE HOST CONNECTION TEST STARTED ======');
  console.log(`Testing host connection at ${new Date().toISOString()}`);
  console.log(`Host: ${data.ip}:${data.port || '(default port)'} (${data.type})`);
  console.log(`Host ID: ${data.hostId || 'New host (not in database)'}`);
  console.log('============================================\n');

  console.info('Testing host connection', { ip: data.ip });

  let result: StandardResponse<boolean> & { is_windows?: boolean } = {
    success: false,
  };

  // Default Windows detection to false
  let detectedWindows = false;

  try {
    // Test SSH connection
    if (data.type === 'ssh') {
      // Implement SSH connection test
      const ssh = new Client();

      try {
        // Create debug handler for connection monitoring
        const debugHandler = (message: string) => {
          console.log(`[Windows Detection] Debug message: ${message}`);

          // Look for OpenSSH for Windows in the remote ident
          if (message.includes('Remote ident:') && message.includes('OpenSSH_for_Windows')) {
            console.log(`[Windows Detection] Remote ident from ${data.ip}: ${message}`);
            console.log(
              `[Windows Detection] 🪟 WINDOWS DETECTED from remote ident from ${data.ip}`,
            );
            detectedWindows = true;
            console.info('Windows detected from remote ident', { ip: data.ip });
          }
          // Also check for Windows in the message
          else if (message.toLowerCase().includes('windows') && !detectedWindows) {
            console.log(`[Windows Detection] Windows string detected from ${data.ip}: ${message}`);
            console.log(
              `[Windows Detection] 🪟 WINDOWS DETECTED from string match from ${data.ip}`,
            );
            detectedWindows = true;
            console.info('Windows detected from debug message', { ip: data.ip });
          }
          // Also check for OpenSSH which often indicates Windows
          else if (message.includes('OpenSSH') && !detectedWindows) {
            console.log(`[Windows Detection] OpenSSH detected from ${data.ip}: ${message}`);
            console.log(
              `[Windows Detection] 🪟 WINDOWS LIKELY from OpenSSH detection from ${data.ip}`,
            );
            detectedWindows = true;
            console.info('Windows likely detected from OpenSSH', { ip: data.ip });
          }
        };

        // Add debug handler for connection information
        (ssh as any).on('debug', debugHandler);

        // Wait for connection to establish or fail
        await new Promise<void>((resolve, reject) => {
          ssh.on('ready', () => {
            result.success = true;
            resolve();
          });

          ssh.on('error', (err) => {
            reject(err);
          });

          // Connect with a timeout
          ssh.connect({
            host: data.ip,
            port: data.port || 22,
            username: data.username,
            password: data.password,
            readyTimeout: 10000, // 10 seconds timeout
            debug: (message: string) => {
              console.log(`SSH Debug: ${message}`);
              debugHandler(message); // Pass message to our debug handler for Windows detection
            },
          });
        });

        // Add a small delay to ensure Windows detection can complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(
          `[Windows Detection] Connection successful to ${data.ip}, Windows detected: ${detectedWindows}`,
        );

        // Ensure connection is closed
        ssh.end();
      } catch (error) {
        // Handle connection error
        result.success = false;
        result.message = error instanceof Error ? error.message : String(error);
        console.error('SSH connection test failed', {
          error: result.message,
          ip: data.ip,
        });
      }
    }

    // Add Windows detection result
    result.is_windows = detectedWindows;

    // Update host status in database if hostId is provided
    if (data.hostId) {
      try {
        console.log(
          `[Windows Detection] Updating host ${data.hostId} with is_windows=${detectedWindows}`,
        );

        try {
          // Try to update with is_windows field
          await db.host.update({
            where: { id: data.hostId },
            data: {
              status: result.success ? 'connected' : 'failed',
              is_windows: detectedWindows,
              // Using updated_at instead of updatedAt - snake_case vs camelCase
              updated_at: new Date().toISOString(),
            },
          });
        } catch (schemaError) {
          console.error('Error updating host:', schemaError);

          // If the update fails due to missing is_windows field, update without it
          if (
            (schemaError as Error).message &&
            (schemaError as Error).message.includes('Unknown field `is_windows`')
          ) {
            console.log(
              `[Windows Detection] is_windows field not in database schema, updating without it`,
            );
            await db.host.update({
              where: { id: data.hostId },
              data: {
                status: result.success ? 'connected' : 'failed',
                updated_at: new Date().toISOString(),
                // is_windows field is omitted
              },
            });
          } else {
            // Re-throw if it's a different error
            throw schemaError;
          }
        }

        console.log(
          `[Windows Detection] ✅ Host ${data.hostId} updated with status=${result.success ? 'connected' : 'failed'}`,
        );
        console.info(
          `Updated host status for ${data.hostId} to ${result.success ? 'connected' : 'failed'}, attempted to set is_windows: ${detectedWindows}`,
        );
      } catch (dbError) {
        console.error(`[Windows Detection] ❌ Failed to update host ${data.hostId}`, dbError);
        console.error('Failed to update host status in database:', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
        // Don't throw here, we still want to return the connection test result
      }
    } else {
      console.log(
        `[Windows Detection] No hostId provided, is_windows=${detectedWindows} not saved to database`,
      );
    }

    console.log(
      `[Windows Detection] Final result for ${data.ip}: is_windows=${detectedWindows}, success=${result.success}`,
    );
    console.log(`Test connection result at ${new Date().toISOString()}: ${JSON.stringify(result)}`);

    console.log('\n====== SERVER-SIDE HOST CONNECTION TEST COMPLETED ======');
    console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Message: ${result.message || 'No message'}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('============================================\n');

    return result;
  } catch (error) {
    // Handle other errors
    result.success = false;
    result.message = error instanceof Error ? error.message : String(error);

    console.log('\n====== SERVER-SIDE HOST CONNECTION TEST ERROR ======');
    console.log(`Host: ${data.ip}:${data.port || '(default port)'}`);
    console.log(`Error: ${result.message}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('============================================\n');

    console.error('Connection test failed', {
      error: result.message,
      ip: data.ip,
    });
    return result;
  }
}

// Export all host service functions
const hostService = {
  testHostConnection,
};

export default hostService;
