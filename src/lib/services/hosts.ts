import { Client } from 'ssh2';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { logger } from '../logger';

/**
 * Connection test result interface
 */
interface ConnectionTestResult {
  success: boolean;
  message?: string;
  fingerprint?: string;
  fingerprintVerified?: boolean;
}

/**
 * @fileoverview Host Service Layer Implementation
 *
 * ⚠️ DO NOT MODIFY THIS FILE ⚠️
 * This file contains the core host service implementations.
 * Any changes should be carefully reviewed and approved.
 *
 * Last validated: 2024-03-21
 * Implements:
 * - Proper error handling
 * - Supabase client usage
 * - Logging
 * - Type safety
 */

/**
 * Get all hosts ordered by creation date
 */
export async function getHosts() {
  try {
    console.log('Fetching hosts from database...');
    
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    console.log('Calling supabase.from("hosts").select()...');
    
    const { data: hosts, error } = await supabase
      .from('hosts')
      .select('*')
      .order('createdAt', { ascending: false });
      
    if (error) {
      console.error('Error fetching hosts:', error);
      throw error;
    }
    
    console.log('Supabase returned hosts successfully');

    // Add the is_windows field with a default value
    return (hosts || []).map((host) => ({
      ...host,
      is_windows: host.is_windows || false, // Default value if not present
    }));
  } catch (error) {
    console.error('Error in getHosts service:', error);
    throw error;
  }
}

/**
 * Get a single host by ID
 */
export async function getHostById(id: string) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: host, error } = await supabase
      .from('hosts')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Error fetching host with id ${id}:`, error);
      throw error;
    }
    
    return host;
  } catch (error) {
    console.error(`Error in getHostById service for id ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new host
 *
 * @param {Object} data - Host data
 * @param {string} data.name - Required: Host name
 * @param {string} data.description - Optional: Host description
 * @param {string} data.type - Required: Host type (ssh, docker, portainer)
 * @param {string} data.ip - Required: Host IP address
 * @param {number} data.port - Optional: Host port (defaults to 22 for SSH)
 * @param {string} data.user - Required for SSH: Username
 * @param {string} data.password - Required for SSH: Password
 * @param {string} data.status - Optional: Initial status (defaults to 'pending')
 * @returns {Promise<Host>} Created host
 */
export async function createHost(data: {
  name: string;
  description?: string;
  type: string;
  ip: string;
  port?: number;
  user?: string;
  password?: string;
  status?: string; // Allow status to be passed in
}) {
  try {
    console.log(
      `Creating host with data: ${JSON.stringify({ ...data, password: data.password ? '***' : undefined })}`,
    );

    // Test connection first to detect Windows
    if (data.type === 'ssh' && data.user && data.password) {
      try {
        console.log(`Testing connection to detect Windows for: ${data.ip}`);
        const testResult = await testHostConnection({
          type: data.type,
          ip: data.ip,
          port: data.port,
          username: data.user,
          password: data.password,
        });

        if (testResult.is_windows) {
          console.log(`Windows detected for ${data.ip}, setting is_windows=true`);
          // Set is_windows in the data
          (data as any).is_windows = true;
        }
      } catch (e) {
        console.error(
          `Error testing connection for Windows detection: ${e instanceof Error ? e.message : String(e)}`,
        );
        // Continue with host creation even if test fails
      }
    }

    console.log(
      `Creating host in database with data: ${JSON.stringify({ ...data, password: data.password ? '***' : undefined })}`,
    );
    
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: host, error } = await supabase
      .from('hosts')
      .insert({
        name: data.name,
        description: data.description || '',
        type: data.type,
        ip: data.ip,
        port: data.port,
        user: data.user,
        password: data.password,
        status: data.status || 'pending',
        is_windows: (data as any).is_windows || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating host:', error);
      throw error;
    }

    console.log(`Supabase created host successfully`);
    console.log(
      `Host created successfully: ${JSON.stringify({ ...host, password: host.password ? '***' : undefined })}`,
    );
    return host;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error creating host:', { error: error.message });
    }
    throw error;
  }
}

/**
 * Delete a host by ID
 */
export async function deleteHost(id: string) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: host, error } = await supabase
      .from('hosts')
      .delete()
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`Error deleting host with id ${id}:`, error);
      throw error;
    }
    
    return host;
  } catch (error) {
    console.error(`Error in deleteHost service for id ${id}:`, error);
    throw error;
  }
}

/**
 * Test connection to a host
 */
export async function testHostConnection(data: {
  type: string;
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  hostId?: string;
}): Promise<ConnectionTestResult & { is_windows?: boolean }> {
  logger.info('Testing host connection', { ip: data.ip });

  let result: ConnectionTestResult & { is_windows?: boolean } = {
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
            logger.info('Windows detected from remote ident', { ip: data.ip });
          }
          // Also check for Windows in the message
          else if (message.toLowerCase().includes('windows') && !detectedWindows) {
            console.log(`[Windows Detection] Windows string detected from ${data.ip}: ${message}`);
            console.log(
              `[Windows Detection] 🪟 WINDOWS DETECTED from string match from ${data.ip}`,
            );
            detectedWindows = true;
            logger.info('Windows detected from debug message', { ip: data.ip });
          }
          // Also check for OpenSSH which often indicates Windows
          else if (message.includes('OpenSSH') && !detectedWindows) {
            console.log(`[Windows Detection] OpenSSH detected from ${data.ip}: ${message}`);
            console.log(
              `[Windows Detection] 🪟 WINDOWS LIKELY from OpenSSH detection from ${data.ip}`,
            );
            detectedWindows = true;
            logger.info('Windows likely detected from OpenSSH', { ip: data.ip });
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
        logger.error('SSH connection test failed', {
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
          const cookieStore = cookies();
          const supabase = createClient(cookieStore);
          
          const { data: updatedHost, error } = await supabase
            .from('hosts')
            .update({
              status: result.success ? 'connected' : 'failed',
              is_windows: detectedWindows,
            })
            .eq('id', data.hostId)
            .select()
            .single();
          
          if (error) {
            console.error(`Error updating host ${data.hostId}:`, error);
            throw error;
          }
          
          console.log(
            `[Windows Detection] ✅ Host ${data.hostId} updated with status=${result.success ? 'connected' : 'failed'}`,
          );
          logger.info(
            `Updated host status for ${data.hostId} to ${result.success ? 'connected' : 'failed'}, attempted to set is_windows: ${detectedWindows}`,
          );
        } catch (schemaError) {
          // If the update fails due to missing is_windows field, update without it
          if (
            (schemaError as Error).message &&
            (schemaError as Error).message.includes('Unknown field `is_windows`')
          ) {
            console.log(
              `[Windows Detection] is_windows field not in database schema, updating without it`,
            );
            const cookieStore = cookies();
            const supabase = createClient(cookieStore);
            
            const { data: updatedHost, error } = await supabase
              .from('hosts')
              .update({
                status: result.success ? 'connected' : 'failed',
                // is_windows field is omitted
              })
              .eq('id', data.hostId)
              .select()
              .single();
            
            if (error) {
              console.error(`Error updating host ${data.hostId}:`, error);
              throw error;
            }
            
            console.log(
              `[Windows Detection] ✅ Host ${data.hostId} updated with status=${result.success ? 'connected' : 'failed'}`,
            );
            logger.info(
              `Updated host status for ${data.hostId} to ${result.success ? 'connected' : 'failed'}, attempted to set is_windows: ${detectedWindows}`,
            );
          } else {
            // Re-throw if it's a different error
            throw schemaError;
          }
        }
      } catch (dbError) {
        console.error(`[Windows Detection] ❌ Failed to update host ${data.hostId}`, dbError);
        logger.error('Failed to update host status in database:', {
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
    return result;
  } catch (error) {
    // Handle other errors
    result.success = false;
    result.message = error instanceof Error ? error.message : String(error);
    logger.error('Connection test failed', {
      error: result.message,
      ip: data.ip,
    });
    return result;
  }
}
