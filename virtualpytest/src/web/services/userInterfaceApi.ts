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
  private buildUrl: (endpoint: string) => string;

  constructor(buildUrl: (endpoint: string) => string) {
    this.buildUrl = buildUrl;
  }

  /**
   * Get all user interfaces
   */
  async getAllUserInterfaces(): Promise<UserInterface[]> {
    try {
      const response = await fetch(this.buildUrl('/api/userinterfaces'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user interfaces:', error);
      throw error;
    }
  }

  /**
   * Get a specific user interface by ID
   */
  async getUserInterface(id: string): Promise<UserInterface> {
    try {
      const response = await fetch(this.buildUrl(`/api/userinterfaces/${id}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching user interface ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new user interface
   */
  async createUserInterface(payload: UserInterfaceCreatePayload): Promise<UserInterface> {
    try {
      const response = await fetch(this.buildUrl('/api/userinterfaces'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<UserInterface> = await response.json();
      if (data.status === 'success' && data.userinterface) {
        return data.userinterface;
      } else {
        throw new Error(data.error || 'Failed to create user interface');
      }
    } catch (error) {
      console.error('Error creating user interface:', error);
      throw error;
    }
  }

  /**
   * Update an existing user interface
   */
  async updateUserInterface(id: string, payload: UserInterfaceCreatePayload): Promise<UserInterface> {
    try {
      const response = await fetch(this.buildUrl(`/api/userinterfaces/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<UserInterface> = await response.json();
      if (data.status === 'success' && data.userinterface) {
        return data.userinterface;
      } else {
        throw new Error(data.error || 'Failed to update user interface');
      }
    } catch (error) {
      console.error(`Error updating user interface ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a user interface
   */
  async deleteUserInterface(id: string): Promise<void> {
    try {
      const response = await fetch(this.buildUrl(`/api/userinterfaces/${id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.error || 'Failed to delete user interface');
      }
    } catch (error) {
      console.error(`Error deleting user interface ${id}:`, error);
      throw error;
    }
  }
}

// Hook to create service instance with context
export const useUserInterfaceApi = () => {
  const { buildServerUrl } = useRegistration();
  
  // Use useMemo to create a stable reference to prevent infinite loops
  return useMemo(() => {
    return new UserInterfaceApiService(buildServerUrl);
  }, [buildServerUrl]);
}; 