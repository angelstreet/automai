'use server';

import { SSHCommandOptions, executeCommand } from '@/lib/services/sshService';

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
type AdbKeyType = keyof typeof ADB_KEY_MAPPINGS;

/**
 * Execute an ADB key command via SSH
 * For testing, using hardcoded host data
 */
export async function executeAdbKeyCommand(_hostId: string, deviceId: string, key: AdbKeyType) {
  try {
    console.log(
      `[@action:streamAdbActions:executeAdbKeyCommand] Sending key ${key} to device ${deviceId}`,
    );

    // Get the KeyEvent code
    const keyCode = ADB_KEY_MAPPINGS[key];
    if (!keyCode) {
      return { success: false, error: `Invalid key: ${key}` };
    }

    // Build the command
    const command = `adb -s ${deviceId} shell input keyevent ${keyCode}`;

    // Hardcoded host data for testing - in production this would come from the database
    // In real implementation, you'd use a separate service to get the host details
    const hostData = {
      ip: '192.168.1.100',
      port: 22,
      username: 'admin',
      password: 'password123',
    };

    // Build SSH command options
    const sshOptions: SSHCommandOptions = {
      host: hostData.ip,
      port: hostData.port,
      username: hostData.username,
      password: hostData.password,
      command: command,
      timeout: 5000, // 5 second timeout for key commands
    };

    // Execute the command
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
