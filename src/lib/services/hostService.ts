/**
 * Host Service
 * Business logic for host operations
 */
import hostDb from '@/lib/db/hostDb';
import sshService from '@/lib/services/sshService';

import { Host, HostConnectionStatus } from '@/types/component/hostComponentType';

/**
 * Standard service response interface
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
}

/**
 * Test connection to a host
 */
export async function testHostConnection(
  host: Partial<Host>,
): Promise<ServiceResponse<HostConnectionStatus>> {
  try {
    // First test the SSH connection
    const sshResult = await sshService.testConnection({
      host: host.ip || '',
      port: host.port || 22,
      username: host.user || '',
      password: host.password,
      privateKey: host.private_key,
    });

    if (!sshResult.success) {
      return {
        success: false,
        error: sshResult.error || 'Failed to establish SSH connection',
      };
    }

    // Return connection status
    return {
      success: true,
      data: {
        status: 'connected',
        lastChecked: new Date().toISOString(),
        message: 'Successfully connected to host',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to test host connection',
    };
  }
}

/**
 * Get host system information
 */
export async function getHostSystemInfo(hostId: string): Promise<ServiceResponse<any>> {
  try {
    // Get host from database
    const hostResult = await hostDb.getHostById(hostId);

    if (!hostResult.success || !hostResult.data) {
      return {
        success: false,
        error: hostResult.error || 'Host not found',
      };
    }

    const host = hostResult.data;

    // Execute command to get system info
    const sshResult = await sshService.executeCommand({
      host: host.ip || '',
      port: host.port || 22,
      username: host.user || '',
      password: host.password,
      privateKey: host.private_key,
      command: 'uname -a && cat /proc/cpuinfo | grep "model name" | head -1 && free -h && df -h',
    });

    if (!sshResult.success) {
      return {
        success: false,
        error: sshResult.error || 'Failed to get system information',
      };
    }

    return {
      success: true,
      data: sshResult.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get host system information',
    };
  }
}

// Export all host service functions
const hostService = {
  testHostConnection,
  getHostSystemInfo,
};

export default hostService;
