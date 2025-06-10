/**
 * User Interface API Service
 * 
 * This service handles all API calls related to user interface management.
 */

import { useMemo } from 'react';
import { useRegistration } from '../contexts/RegistrationContext';

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

class UserInterfaceApiService {
  private selectedHost: any;

  constructor(selectedHost: any) {
    this.selectedHost = selectedHost;
  }

  /**
   * Get all user interfaces
   */
  async getAllUserInterfaces(): Promise<UserInterface[]> {
    try {
      console.log('[@service:UserInterfaceApi] Getting all user interfaces via controller proxy');
      
      // Check if remote controller proxy is available
      if (!this.selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await this.selectedHost.controllerProxies.remote.getUIElements();
      
      if (result.success) {
        console.log('[@service:UserInterfaceApi] Successfully fetched user interfaces');
        return result.data || [];
      } else {
        throw new Error(result.error || 'Failed to fetch user interfaces');
      }
    } catch (error) {
      console.error('[@service:UserInterfaceApi] Error fetching user interfaces:', error);
      throw error;
    }
  }

  /**
   * Get a specific user interface by ID
   */
  async getUserInterface(id: string): Promise<UserInterface> {
    try {
      console.log(`[@service:UserInterfaceApi] Getting user interface ${id} via controller proxy`);
      
      // Check if remote controller proxy is available
      if (!this.selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await this.selectedHost.controllerProxies.remote.getUIElement(id);
      
      if (result.success) {
        console.log(`[@service:UserInterfaceApi] Successfully fetched user interface ${id}`);
        return result.data;
      } else {
        throw new Error(result.error || `Failed to fetch user interface ${id}`);
      }
    } catch (error) {
      console.error(`[@service:UserInterfaceApi] Error fetching user interface ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new user interface
   */
  async createUserInterface(payload: UserInterfaceCreatePayload): Promise<UserInterface> {
    try {
      console.log('[@service:UserInterfaceApi] Creating user interface via controller proxy');
      
      // Check if remote controller proxy is available
      if (!this.selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await this.selectedHost.controllerProxies.remote.createUIElement(payload);
      
      if (result.success) {
        console.log('[@service:UserInterfaceApi] Successfully created user interface');
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create user interface');
      }
    } catch (error) {
      console.error('[@service:UserInterfaceApi] Error creating user interface:', error);
      throw error;
    }
  }

  /**
   * Update an existing user interface
   */
  async updateUserInterface(id: string, payload: UserInterfaceCreatePayload): Promise<UserInterface> {
    try {
      console.log(`[@service:UserInterfaceApi] Updating user interface ${id} via controller proxy`);
      
      // Check if remote controller proxy is available
      if (!this.selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await this.selectedHost.controllerProxies.remote.updateUIElement(id, payload);
      
      if (result.success) {
        console.log(`[@service:UserInterfaceApi] Successfully updated user interface ${id}`);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update user interface');
      }
    } catch (error) {
      console.error(`[@service:UserInterfaceApi] Error updating user interface ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a user interface
   */
  async deleteUserInterface(id: string): Promise<void> {
    try {
      console.log(`[@service:UserInterfaceApi] Deleting user interface ${id} via controller proxy`);
      
      // Check if remote controller proxy is available
      if (!this.selectedHost?.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }

      const result = await this.selectedHost.controllerProxies.remote.deleteUIElement(id);
      
      if (result.success) {
        console.log(`[@service:UserInterfaceApi] Successfully deleted user interface ${id}`);
      } else {
        throw new Error(result.error || 'Failed to delete user interface');
      }
    } catch (error) {
      console.error(`[@service:UserInterfaceApi] Error deleting user interface ${id}:`, error);
      throw error;
    }
  }
}

// Hook to create service instance with context
export const useUserInterfaceApi = () => {
  const { selectedHost } = useRegistration();
  
  // Use useMemo to create a stable reference to prevent infinite loops
  return useMemo(() => {
    return new UserInterfaceApiService(selectedHost);
  }, [selectedHost]);
}; 