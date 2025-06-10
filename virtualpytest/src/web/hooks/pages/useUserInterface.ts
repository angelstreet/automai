/**
 * User Interface Hook
 * 
 * This hook handles all user interface management functionality.
 */

import { useMemo } from 'react';
import { useRegistration } from '../../contexts/RegistrationContext';

export interface UserInterface {
  id: string;
  name: string;
  models: string[];
  min_version: string;
  max_version: string;
  created_at: string;
  updated_at: string;
  root_tree?: {
    id: string;
    name: string;
  } | null;
}

export interface UserInterfaceCreatePayload {
  name: string;
  models: string[];
  min_version?: string;
  max_version?: string;
}

export interface ApiResponse<T> {
  status: string;
  userinterface?: T;
  error?: string;
}

export const useUserInterface = () => {
  const { selectedHost } = useRegistration();

  /**
   * Get all user interfaces
   */
  const getAllUserInterfaces = async (): Promise<UserInterface[]> => {
    try {
      console.log('[@hook:useUserInterface:getAllUserInterfaces] Getting all user interfaces via controller proxy');
      
      // Check if remote controller proxy is available
      if (!selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await selectedHost.controllerProxies.remote.getUIElements();
      
      if (result.success) {
        console.log('[@hook:useUserInterface:getAllUserInterfaces] Successfully fetched user interfaces');
        return result.data || [];
      } else {
        throw new Error(result.error || 'Failed to fetch user interfaces');
      }
    } catch (error) {
      console.error('[@hook:useUserInterface:getAllUserInterfaces] Error fetching user interfaces:', error);
      throw error;
    }
  };

  /**
   * Get a specific user interface by ID
   */
  const getUserInterface = async (id: string): Promise<UserInterface> => {
    try {
      console.log(`[@hook:useUserInterface:getUserInterface] Getting user interface ${id} via controller proxy`);
      
      // Check if remote controller proxy is available
      if (!selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await selectedHost.controllerProxies.remote.getUIElement(id);
      
      if (result.success) {
        console.log(`[@hook:useUserInterface:getUserInterface] Successfully fetched user interface ${id}`);
        return result.data;
      } else {
        throw new Error(result.error || `Failed to fetch user interface ${id}`);
      }
    } catch (error) {
      console.error(`[@hook:useUserInterface:getUserInterface] Error fetching user interface ${id}:`, error);
      throw error;
    }
  };

  /**
   * Create a new user interface
   */
  const createUserInterface = async (payload: UserInterfaceCreatePayload): Promise<UserInterface> => {
    try {
      console.log('[@hook:useUserInterface:createUserInterface] Creating user interface via controller proxy');
      
      // Check if remote controller proxy is available
      if (!selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await selectedHost.controllerProxies.remote.createUIElement(payload);
      
      if (result.success) {
        console.log('[@hook:useUserInterface:createUserInterface] Successfully created user interface');
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create user interface');
      }
    } catch (error) {
      console.error('[@hook:useUserInterface:createUserInterface] Error creating user interface:', error);
      throw error;
    }
  };

  /**
   * Update an existing user interface
   */
  const updateUserInterface = async (id: string, payload: UserInterfaceCreatePayload): Promise<UserInterface> => {
    try {
      console.log(`[@hook:useUserInterface:updateUserInterface] Updating user interface ${id} via controller proxy`);
      
      // Check if remote controller proxy is available
      if (!selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await selectedHost.controllerProxies.remote.updateUIElement(id, payload);
      
      if (result.success) {
        console.log(`[@hook:useUserInterface:updateUserInterface] Successfully updated user interface ${id}`);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update user interface');
      }
    } catch (error) {
      console.error(`[@hook:useUserInterface:updateUserInterface] Error updating user interface ${id}:`, error);
      throw error;
    }
  };

  /**
   * Delete a user interface
   */
  const deleteUserInterface = async (id: string): Promise<void> => {
    try {
      console.log(`[@hook:useUserInterface:deleteUserInterface] Deleting user interface ${id} via controller proxy`);
      
      // Check if remote controller proxy is available
      if (!selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await selectedHost.controllerProxies.remote.deleteUIElement(id);
      
      if (result.success) {
        console.log(`[@hook:useUserInterface:deleteUserInterface] Successfully deleted user interface ${id}`);
      } else {
        throw new Error(result.error || 'Failed to delete user interface');
      }
    } catch (error) {
      console.error(`[@hook:useUserInterface:deleteUserInterface] Error deleting user interface ${id}:`, error);
      throw error;
    }
  };

  // Memoize the functions to prevent unnecessary re-renders
  return useMemo(() => ({
    getAllUserInterfaces,
    getUserInterface,
    createUserInterface,
    updateUserInterface,
    deleteUserInterface,
  }), [selectedHost]);
}; 