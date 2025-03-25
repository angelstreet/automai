/**
 * SWR hooks for host data
 */
import useSWR, { mutate } from 'swr';
import { actionFetcher } from '@/lib/fetcher';
import { 
  getHosts,
  getHost,
  testHostConnection,
  clearHostsCache
} from '@/app/[locale]/[tenant]/hosts/actions';
import type { Host } from '@/app/[locale]/[tenant]/hosts/types';
import type { HostFilter } from '@/app/[locale]/[tenant]/hosts/actions';

/**
 * Hook for fetching all hosts with optional filtering
 */
export function useHosts(filter?: HostFilter) {
  return useSWR(
    filter ? ['hosts', JSON.stringify(filter)] : 'hosts',
    () => actionFetcher(getHosts, filter),
    {
      dedupingInterval: 15 * 60 * 1000, // 15 minutes
      revalidateOnFocus: false
    }
  );
}

/**
 * Hook for fetching a single host
 */
export function useHostById(id: string | null) {
  return useSWR(
    id ? `host-${id}` : null,
    () => id ? actionFetcher(getHost, id) : null,
    {
      dedupingInterval: 60 * 1000, // 1 minute
      revalidateOnFocus: false
    }
  );
}

/**
 * Hook for host connection status
 */
export function useHostConnectionStatus(id: string | null) {
  return useSWR(
    id ? `host-connection-${id}` : null,
    () => id ? actionFetcher(testHostConnection, id) : null,
    {
      dedupingInterval: 30 * 1000, // 30 seconds
      revalidateOnFocus: false,
      refreshInterval: 60 * 1000, // Refresh every minute
    }
  );
}

/**
 * Test connection for a host
 */
export async function testConnection(hostId: string) {
  try {
    // Call the host connection test action
    const result = await testHostConnection(hostId);
    
    // Revalidate host data after connection test
    await mutate(`host-${hostId}`);
    await mutate('hosts');
    await mutate(`host-connection-${hostId}`);
    
    return result;
  } catch (error) {
    console.error('Error testing connection:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Clear host cache and refresh data
 */
export async function refreshHosts(options?: {
  hostId?: string;
  tenantId?: string;
  userId?: string;
}) {
  try {
    await clearHostsCache(options);
    
    // Revalidate specific data or all host data
    if (options?.hostId) {
      await mutate(`host-${options.hostId}`);
      await mutate(`host-connection-${options.hostId}`);
    }
    
    // Always revalidate the main hosts list
    await mutate('hosts');
    return true;
  } catch (error) {
    console.error('Error refreshing hosts:', error);
    return false;
  }
}