'use server';

import { getHostWithDecryptedCredentials } from '@/app/actions/hostsAction';
import {
  SSHConnectionOptions,
  createConnection,
  closeConnection,
  executeOnConnection,
} from '@/lib/services/sshService';

// Key names for ADB remote control
const ADB_KEYS = {
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
export type AdbKeyType = keyof typeof ADB_KEYS;

/**
 * Connect to SSH and ADB device
 */
export async function connectToHost(hostId: string, androidDeviceId: string) {
  try {
    // Get host with decrypted credentials
    const hostResult = await getHostWithDecryptedCredentials(hostId);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, error: hostResult.error || 'Failed to get host credentials' };
    }

    const host = hostResult.data;
    if (!host.user) {
      return { success: false, error: 'Host is missing username for SSH connection' };
    }

    // Create SSH connection options
    const sshOptions: SSHConnectionOptions = {
      host: host.ip,
      port: host.port || 22,
      username: host.user,
      ...(host.auth_type === 'password' && host.password ? { password: host.password } : {}),
      ...(host.auth_type === 'privateKey' && (host as any).privateKey
        ? { privateKey: (host as any).privateKey }
        : {}),
      timeout: 10000,
    };

    // Create a persistent SSH connection
    console.log(`[@action:streamAdbActions:connectToHost] Creating SSH connection to ${host.ip}`);
    const connectionResult = await createConnection(hostId, sshOptions);
    if (!connectionResult.success) {
      return {
        success: false,
        error: connectionResult.error || 'Failed to establish SSH connection',
      };
    }

    // Connect to ADB device
    const adbCommand = `adb connect ${androidDeviceId}`;
    console.log(`[@action:streamAdbActions:connectToHost] Running command: ${adbCommand}`);

    const result = await executeOnConnection(hostId, adbCommand);
    if (!result.success) {
      // Close the connection if ADB connection fails
      await closeConnection(hostId);
      return { success: false, error: result.error || 'Failed to connect to ADB device' };
    }

    console.log(
      `[@action:streamAdbActions:connectToHost] Successfully connected to device ${androidDeviceId}`,
    );
    return { success: true };
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
      `[@action:streamAdbActions:disconnectFromHost] Closing SSH connection for host ${hostId}`,
    );
    const result = await closeConnection(hostId);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    console.error(`[@action:streamAdbActions:disconnectFromHost] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Execute an ADB key command via SSH
 */
export async function executeAdbKeyCommand(
  hostId: string,
  androidDeviceId: string,
  key: AdbKeyType,
) {
  try {
    // Get the KeyEvent code
    const keyCode = ADB_KEYS[key];
    if (!keyCode) {
      return { success: false, error: `Invalid key: ${key}` };
    }

    // Execute the key command on the existing SSH connection
    const keyCommand = `adb -s ${androidDeviceId} shell input keyevent ${keyCode}`;
    console.log(`[@action:streamAdbActions:executeAdbKeyCommand] Running command: ${keyCommand}`);

    const result = await executeOnConnection(hostId, keyCommand);
    if (!result.success) {
      console.error(
        `[@action:streamAdbActions:executeAdbKeyCommand] Failed to execute command: ${result.error}`,
      );
      return { success: false, error: result.error || 'Failed to send key command' };
    }

    console.log(
      `[@action:streamAdbActions:executeAdbKeyCommand] Successfully sent keyevent ${keyCode}`,
    );
    return { success: true };
  } catch (error: any) {
    console.error(`[@action:streamAdbActions:executeAdbKeyCommand] ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}
