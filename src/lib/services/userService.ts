import { 
  getUser, 
  getCurrentUser, 
  updateProfile, 
  setSelectedTeam, 
  create, 
  update, 
  deleteUser as deleteUserDb,
  findMany,
  findUnique,
  clearCache
} from '../db/userDb';
import { ServiceResponse } from './teamService';
import { AuthUser } from '@/types/service/userServiceType';

/**
 * User Service
 */
export const userService = {
  /**
   * Get a user by ID
   */
  async getUser(userId: string, cookieStore?: any): Promise<ServiceResponse<AuthUser>> {
    try {
      const result = await getUser(userId, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:userService:getUser] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching user'
      };
    }
  },

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(cookieStore?: any): Promise<ServiceResponse<AuthUser>> {
    try {
      const result = await getCurrentUser(cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:userService:getCurrentUser] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching current user'
      };
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, metadata: Record<string, any>, cookieStore?: any): Promise<ServiceResponse<any>> {
    try {
      const result = await updateProfile(userId, metadata, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:userService:updateProfile] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating profile'
      };
    }
  },

  /**
   * Set selected team for a user
   */
  async setSelectedTeam(userId: string, teamId: string, cookieStore?: any): Promise<ServiceResponse<null>> {
    try {
      const result = await setSelectedTeam(userId, teamId, cookieStore);
      return {
        success: result.success,
        data: null,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:userService:setSelectedTeam] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error setting selected team'
      };
    }
  },

  /**
   * Create a new user profile
   */
  async create(data: any, cookieStore?: any): Promise<ServiceResponse<any>> {
    try {
      const result = await create({ data }, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:userService:create] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating user'
      };
    }
  },

  /**
   * Update a user profile
   */
  async update(where: any, data: any, cookieStore?: any): Promise<ServiceResponse<any>> {
    try {
      const result = await update({ where, data }, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:userService:update] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating user'
      };
    }
  },

  /**
   * Delete a user profile
   */
  async deleteUser(where: any, cookieStore?: any): Promise<ServiceResponse<null>> {
    try {
      const result = await deleteUserDb({ where }, cookieStore);
      return {
        success: result.success,
        data: null,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:userService:deleteUser] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting user'
      };
    }
  },

  /**
   * Find multiple users based on options
   */
  async findMany(options: any = {}, cookieStore?: any): Promise<any[]> {
    try {
      return await findMany(options, cookieStore);
    } catch (error) {
      console.error('[@service:userService:findMany] Error:', error);
      return [];
    }
  },

  /**
   * Find a single user by unique criteria
   */
  async findUnique(where: any, cookieStore?: any): Promise<any | null> {
    try {
      return await findUnique({ where }, cookieStore);
    } catch (error) {
      console.error('[@service:userService:findUnique] Error:', error);
      return null;
    }
  },

  /**
   * Clear user cache
   */
  async clearCache(): Promise<void> {
    try {
      await clearCache();
    } catch (error) {
      console.error('[@service:userService:clearCache] Error:', error);
    }
  }
};

export default userService;