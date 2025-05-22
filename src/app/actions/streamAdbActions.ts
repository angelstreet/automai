'use server';

import { getHostWithDecryptedCredentials } from '@/app/actions/hostsAction';
import { SSHCommandOptions, connect, disconnect, executeCommand } from '@/lib/services/sshService';

// Key mappings for ADB remote control - based on Android KeyEvent codes
// Note: In server actions, only export async functions
const ADB_KEY_MAPPINGS = {
  UP: 'KEYCODE_DPAD_UP',
  DOWN: 'KEYCODE_DPAD_DOWN',
  LEFT: 'KEYCODE_DPAD_LEFT',
  RIGHT: 'KEYCODE_DPAD_RIGHT',
  SELECT: 'KEYCODE_DPAD_CENTER',
  BACK: 'KEYCODE_BACK',
  HOME: 'KEYCODE_HOME',
  MENU: 'KEYCODE_MENU',
  VOLUME_UP: 'KEYCODE_VOLUME_UP',
  VOLUME_DOWN: 'KEYCODE_VOLUME_DOWN',
  VOLUME_MUTE: 'KEYCODE_VOLUME_MUTE',
  POWER: 'KEYCODE_POWER',
} as const;

// Type for keys
export type AdbKeyType = keyof typeof ADB_KEY_MAPPINGS;

/**
 * Connect to host via SSH
 */
export async function connectToHost(hostId: string) {
  try {
    console.log(
      `[@action:streamAdbActions:connectToHost] Starting SSH connection to host ${hostId}`,
    );

    // Get host with decrypted credentials
    const hostResult = await getHostWithDecryptedCredentials(hostId);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, error: hostResult.error || 'Failed to get host credentials' };
    }

    const host = hostResult.data;
    if (!host.user) {
      return { success: false, error: 'Host is missing username for SSH connection' };
    }

    // Connect to host
    const sshOptions = {
      host: host.ip,
      port: host.port || 22,
      username: host.user,
      ...(host.auth_type === 'password' && host.password ? { password: host.password } : {}),
      ...(host.auth_type === 'privateKey' && (host as any).privateKey
        ? { privateKey: (host as any).privateKey }
        : {}),
    };

    const result = await connect(sshOptions);
    return {
      success: result.success,
      error: result.error,
    };
  } catch (error: any) {
    console.error(`[@action:streamAdbActions:connectToHost] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Disconnect from host
 */
export async function disconnectFromHost(hostId: string) {
  try {
    console.log(
      `[@action:streamAdbActions:disconnectFromHost] Closing SSH connection to host ${hostId}`,
    );

    // Get host with decrypted credentials
    const hostResult = await getHostWithDecryptedCredentials(hostId);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, error: hostResult.error || 'Failed to get host credentials' };
    }

    const host = hostResult.data;
    if (!host.user) {
      return { success: false, error: 'Host is missing username for SSH connection' };
    }

    // Disconnect from host
    const sshOptions = {
      host: host.ip,
      port: host.port || 22,
      username: host.user,
    };

    const result = await disconnect(sshOptions);
    return {
      success: result.success,
      error: result.error,
    };
  } catch (error: any) {
    console.error(`[@action:streamAdbActions:disconnectFromHost] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Execute an ADB key command via SSH
 */
export async function executeAdbKeyCommand(hostId: string, deviceId: string, key: AdbKeyType) {
  try {
    console.log(
      `[@action:streamAdbActions:executeAdbKeyCommand] Starting SSH connection for key ${key} to device ${deviceId} on host ${hostId}`,
    );

    // Get the KeyEvent code
    const keyCode = ADB_KEY_MAPPINGS[key];
    if (!keyCode) {
      return { success: false, error: `Invalid key: ${key}` };
    }

    // Get host with decrypted credentials
    const hostResult = await getHostWithDecryptedCredentials(hostId);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, error: hostResult.error || 'Failed to get host credentials' };
    }

    const host = hostResult.data;
    if (!host.user) {
      return { success: false, error: 'Host is missing username for SSH connection' };
    }

    // Build the command
    const command = `adb -s ${deviceId} shell input keyevent ${keyCode}`;
    console.log(`[@action:streamAdbActions:executeAdbKeyCommand] Executing command: ${command}`);

    // Build SSH command options
    const sshOptions: SSHCommandOptions = {
      host: host.ip,
      port: host.port || 22,
      username: host.user,
      ...(host.auth_type === 'password' && host.password ? { password: host.password } : {}),
      ...(host.auth_type === 'privateKey' && (host as any).privateKey
        ? { privateKey: (host as any).privateKey }
        : {}),
      command: command,
      timeout: 5000,
    };

    // Execute the command using existing connection
    const result = await executeCommand(sshOptions);
    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  } catch (error: any) {
    console.error(`[@action:streamAdbActions:executeAdbKeyCommand] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}
