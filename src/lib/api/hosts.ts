/**
 * @fileoverview Client-side Host API Layer
 * This file contains the API calls for host management.
 * Does NOT contain business logic - only API calls.
 */

import { Host } from '@/types/hosts';

export const hostsApi = {
  /**
   * Get all hosts
   */
  getHosts: async (locale: string) => {
    // Add cache-busting parameter to prevent browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/hosts?_=${timestamp}`);
    if (!response.ok) throw new Error('Failed to fetch hosts');
    return response.json();
  },

  /**
   * Delete a host
   */
  deleteHost: async (locale: string, id: string) => {
    const response = await fetch(`/api/hosts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete host');
    return response.json();
  },

  /**
   * Test host connection
   */
  testConnection: async (locale: string, data: {
    type: string;
    ip: string;
    port?: number;
    username?: string;
    password?: string;
    hostId?: string;
  }) => {
    const response = await fetch(`/api/hosts/test-connection`, {
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
        throw new Error(parsed.message || 'Failed to test connection');
      } catch {
        throw new Error('Failed to test connection');
      }
    }

    return response.json();
  },

  async verifyFingerprint(locale: string, data: {
    fingerprint: string;
    host: string;
    port?: number;
  }) {
    const response = await fetch(`/api/hosts/verify-fingerprint`, {
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
  createHost: async (locale: string, data: {
    name: string;
    description?: string;
    type: string;
    ip: string;
    port?: number;
    user?: string;
    password?: string;
    status?: string;
    lastConnected?: string;
  }) => {
    const response = await fetch(`/api/hosts`, {
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
        throw new Error(parsed.message || 'Failed to create host');
      } catch {
        throw new Error('Failed to create host');
      }
    }

    return response.json();
  },

  /**
   * Test all host connections
   */
  testAllConnections: async (locale: string) => {
    // Add cache-busting parameter to prevent browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/hosts/test-all?_=${timestamp}`);
    if (!response.ok) throw new Error('Failed to test all connections');
    return response.json();
  },
}; 