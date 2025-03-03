/**
 * @fileoverview Client-side Host API Layer
 * This file contains the API calls for host management.
 * Does NOT contain business logic - only API calls.
 */

import { Host } from '@/types/hosts';

// Helper to get the base URL
const getBaseUrl = () => {
  return typeof window !== 'undefined' ? window.location.origin : '';
};

export const hostsApi = {
  /**
   * Get all hosts
   */
  getHosts: async (locale: string) => {
    // Add cache-busting parameter to prevent browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(`${getBaseUrl()}/api/hosts?_=${timestamp}`);
    if (!response.ok) throw new Error('Failed to fetch hosts');
    return response.json();
  },

  /**
   * Delete a host
   */
  deleteHost: async (locale: string, id: string) => {
    const response = await fetch(`${getBaseUrl()}/api/hosts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete host');
    return response.json();
  },

  /**
   * Test host connection
   */
  testConnection: async (
    locale: string,
    data: {
      type: string;
      ip: string;
      port?: number;
      username?: string;
      password?: string;
      hostId?: string;
    },
  ) => {
    const requestData = {
      type: data.type,
      ip: data.ip,
      port: data.port,
      username: data.username,
      hostId: data.hostId,
      ...(_data.password && { password: data.password }),
    };

    const response = await fetch(`${getBaseUrl()}/api/hosts/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const error = await response.text();
      try {
        const parsed = JSON.parse(error);
        throw new Error(parsed.message || 'Failed to test connection');
      } catch {
        throw new Error('Failed to test connection');
      }
    }

    return response.json();
  },

  async verifyFingerprint(
    locale: string,
    data: {
      fingerprint: string;
      host: string;
      port?: number;
    },
  ) {
    const response = await fetch(`${getBaseUrl()}/api/hosts/verify-fingerprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      try {
        const parsed = JSON.parse(error);
        throw new Error(parsed.message || 'Failed to verify fingerprint');
      } catch {
        throw new Error('Failed to verify fingerprint');
      }
    }

    return response.json();
  },

  /**
   * Create a new host
   */
  createHost: async (
    locale: string,
    data: {
      name: string;
      description: string;
      type: string;
      ip: string;
      port: number;
      user: string;
      password: string;
      status: string;
    },
  ) => {
    const response = await fetch(`${getBaseUrl()}/api/hosts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create host');
    }

    return response.json();
  },

  /**
   * Check connections for multiple hosts sequentially
   */
  checkAllConnections: async (locale: string, hosts: Host[]) => {
    const results = [];
    for (const host of hosts) {
      const result = await hostsApi.testConnection(locale, {
        type: host.type,
        ip: host.ip,
        port: host.port,
        username: host.user,
        hostId: host.id,
      });
      results.push({ hostId: host.id, result });
      await new Promise((resolve) => setTimeout(resolve, _300)); // Small delay to avoid overwhelming the server
    }
    return results;
  },
};
