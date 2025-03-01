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
    const response = await fetch(`/api/hosts`);
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
  testConnection: async (locale: string, host: Host) => {
    const response = await fetch(`/api/hosts/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(host),
    });
    return response.json();
  }
}; 