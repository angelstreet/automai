/**
 * User Interface API Service
 * 
 * This service handles all API calls related to user interface management.
 */

export interface UserInterface {
  id: string;
  name: string;
  models: string[];
  min_version: string;
  max_version: string;
  created_at: string;
  updated_at: string;
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

const API_BASE_URL = 'http://localhost:5009/api';

class UserInterfaceApiService {
  /**
   * Get all user interfaces
   */
  async getAllUserInterfaces(): Promise<UserInterface[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/userinterfaces`, {
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
      const response = await fetch(`${API_BASE_URL}/userinterfaces/${id}`, {
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
      const response = await fetch(`${API_BASE_URL}/userinterfaces`, {
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
      const response = await fetch(`${API_BASE_URL}/userinterfaces/${id}`, {
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
      const response = await fetch(`${API_BASE_URL}/userinterfaces/${id}`, {
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

// Export a singleton instance
export const userInterfaceApi = new UserInterfaceApiService(); 