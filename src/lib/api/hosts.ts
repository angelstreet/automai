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
  getHosts: async () => {
    // Add cache-busting parameter to prevent browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(`${getBaseUrl()}/api/hosts?_=${timestamp}`);
    if (!response.ok) throw new Error('Failed to fetch hosts');
    return response.json();
  },

  /**
   * Delete a host
   */
  deleteHost: async (id: string) => {
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
      ...(data.password && { password: data.password }),
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

  /**
   * Test all host connections at once
   */
  testAllHosts: async () => {
    // Add cache-busting parameter to prevent browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(`${getBaseUrl()}/api/hosts/test-all?_=${timestamp}`);
    if (!response.ok) throw new Error('Failed to test all connections');
    return response.json();
  },

  async verifyFingerprint(
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
  createHost: async (
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
  checkAllConnections: async (hosts: Host[]) => {
    const results = [];
    for (const host of hosts) {
      const result = await hostsApi.testConnection({
        type: host.type,
        ip: host.ip,
        port: host.port,
        username: host.user,
        hostId: host.id,
      });
      results.push({ hostId: host.id, result });
      await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay to avoid overwhelming the server
    }
    return results;
  },
};
