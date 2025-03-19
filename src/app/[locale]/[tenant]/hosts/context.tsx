'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Host } from '@/app/[locale]/[tenant]/hosts/types';
import {
  getHosts,
  getHost,
  createHost,
  updateHost,
  deleteHost,
  testHostConnection,
} from '@/app/[locale]/[tenant]/hosts/actions';
import { useUser } from '@/context/UserContext';
import { AuthUser, User } from '@/types/user';
import { serverCache } from '@/lib/cache';

// Define the context type for hosts
interface HostContextType {
  hosts: Host[];
  loading: boolean;
  error: string | null;
  fetchHosts: () => Promise<void>;
  getHostById: (id: string) => Promise<Host | null>;
  addHost: (hostData: Omit<Host, 'id'>) => Promise<{ success: boolean; hostId?: string; error?: string }>;
  updateHostById: (id: string, updates: Partial<Omit<Host, 'id'>>) => Promise<{ success: boolean; error?: string }>;
  removeHost: (id: string) => Promise<{ success: boolean; error?: string }>;
  testConnection: (id: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

// Create the context with default values
const HostContext = createContext<HostContextType>({
  hosts: [],
  loading: false,
  error: null,
  fetchHosts: async () => {},
  getHostById: async () => null,
  addHost: async () => ({ success: false, error: 'Not implemented' }),
  updateHostById: async () => ({ success: false, error: 'Not implemented' }),
  removeHost: async () => ({ success: false, error: 'Not implemented' }),
  testConnection: async () => ({ success: false, error: 'Not implemented' }),
});

// Convert User to AuthUser for compatibility with actions
const userToAuthUser = (user: User | null): AuthUser | null => {
  if (!user) return null;
  
  return {
    ...user,
    created_at: new Date().toISOString(), // Use current date as fallback
    updated_at: new Date().toISOString(), // Use current date as fallback
  };
};

// Host provider component
export const HostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const authUser = userToAuthUser(user);

  // Fetch hosts with the current user
  const fetchHosts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getHosts(undefined, authUser);
      
      if (result.success && result.data) {
        setHosts(result.data);
      } else {
        setError(result.error || 'Failed to fetch hosts');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get a specific host by ID
  const getHostById = async (id: string): Promise<Host | null> => {
    try {
      const result = await getHost(id, authUser);
      
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Add a new host
  const addHost = async (hostData: Omit<Host, 'id'>): Promise<{ success: boolean; hostId?: string; error?: string }> => {
    try {
      const result = await createHost(hostData, authUser);
      
      if (result.success && result.data) {
        // Refresh the host list
        await fetchHosts();
        return { success: true, hostId: result.data.id };
      }
      
      return { success: false, error: result.error || 'Failed to add host' };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  };

  // Update a host
  const updateHostById = async (
    id: string,
    updates: Partial<Omit<Host, 'id'>>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await updateHost(id, updates, authUser);
      
      if (result.success) {
        // Refresh the host list
        await fetchHosts();
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Failed to update host' };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  };

  // Remove a host
  const removeHost = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await deleteHost(id, authUser);
      
      if (result.success) {
        // Remove from local state
        setHosts(prevHosts => prevHosts.filter(host => host.id !== id));
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Failed to delete host' };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  };

  // Test host connection
  const testConnection = async (id: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const result = await testHostConnection(id, authUser);
      
      if (result.success) {
        // Refresh hosts after successful connection test
        await fetchHosts();
        return { success: true, message: result.message };
      }
      
      return { success: false, error: result.error || 'Connection test failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  };

  // Fetch hosts on component mount
  useEffect(() => {
    fetchHosts();
  }, []);

  const contextValue: HostContextType = {
    hosts,
    loading,
    error,
    fetchHosts,
    getHostById,
    addHost,
    updateHostById,
    removeHost,
    testConnection,
  };

  return <HostContext.Provider value={contextValue}>{children}</HostContext.Provider>;
};

// Custom hook to use the host context
export const useHostContext = () => useContext(HostContext);
