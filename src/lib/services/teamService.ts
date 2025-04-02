import { DbResponse } from '@/lib/utils/commonUtils';
import { ResourceType, Operation } from '@/types/context/permissionsContextType';

import { getUserPermissions, checkPermission } from '../db/permissionDb';
import {
  getTeams,
  getUserTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
} from '../db/teamDb';
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
} from '../db/teamMemberDb';

/**
 * Team Service
 */
export const teamService = {
  /**
   * Get all teams for a tenant
   */
  async getTeams(tenantId: string, cookieStore?: any): Promise<DbResponse<any[]>> {
    try {
      const result = await getTeams(tenantId, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:getTeams] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching teams',
      };
    }
  },

  /**
   * Get teams that a user belongs to
   */
  async getUserTeams(userId: string, cookieStore?: any): Promise<DbResponse<any[]>> {
    try {
      const result = await getUserTeams(userId, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:getUserTeams] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching user teams',
      };
    }
  },

  /**
   * Get a team by ID
   */
  async getTeamById(teamId: string, cookieStore?: any): Promise<DbResponse<any>> {
    try {
      const result = await getTeamById(teamId, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:getTeamById] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching team',
      };
    }
  },

  /**
   * Create a new team
   */
  async createTeam(payload: any, cookieStore?: any): Promise<DbResponse<any>> {
    try {
      const result = await createTeam(payload, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:createTeam] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating team',
      };
    }
  },

  /**
   * Update a team
   */
  async updateTeam(teamId: string, payload: any, cookieStore?: any): Promise<DbResponse<any>> {
    try {
      const result = await updateTeam(teamId, payload, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:updateTeam] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating team',
      };
    }
  },

  /**
   * Delete a team
   */
  async deleteTeam(teamId: string, cookieStore?: any): Promise<DbResponse<null>> {
    try {
      const result = await deleteTeam(teamId, cookieStore);
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:deleteTeam] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting team',
      };
    }
  },

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string, cookieStore?: any): Promise<DbResponse<any[]>> {
    try {
      const result = await getTeamMembers(teamId, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:getTeamMembers] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching team members',
      };
    }
  },

  /**
   * Add a team member
   */
  async addTeamMember(input: any, cookieStore?: any): Promise<DbResponse<any>> {
    try {
      const result = await addTeamMember(input, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:addTeamMember] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error adding team member',
      };
    }
  },

  /**
   * Update a team member's role
   */
  async updateTeamMemberRole(
    teamId: string,
    profileId: string,
    role: string,
    cookieStore?: any,
  ): Promise<DbResponse<any>> {
    try {
      const result = await updateTeamMemberRole(teamId, profileId, role, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:updateTeamMemberRole] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating team member role',
      };
    }
  },

  /**
   * Remove a team member
   */
  async removeTeamMember(
    teamId: string,
    profileId: string,
    cookieStore?: any,
  ): Promise<DbResponse<null>> {
    try {
      const result = await removeTeamMember(teamId, profileId, cookieStore);
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:removeTeamMember] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error removing team member',
      };
    }
  },

  /**
   * Get user permissions
   */
  async getUserPermissions(
    profileId: string,
    teamId: string,
    cookieStore?: any,
  ): Promise<DbResponse<any[]>> {
    try {
      const result = await getUserPermissions(profileId, teamId, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('[@service:teamService:getUserPermissions] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching user permissions',
      };
    }
  },

  /**
   * Check permission
   */
  async checkPermission(
    profileId: string,
    teamId: string,
    resourceType: ResourceType,
    operation: Operation,
    creatorId?: string,
    cookieStore?: any,
  ): Promise<boolean> {
    try {
      return await checkPermission(
        profileId,
        teamId,
        resourceType,
        operation,
        creatorId,
        cookieStore,
      );
    } catch (error) {
      console.error('[@service:teamService:checkPermission] Error:', error);
      return false;
    }
  },
};

export default teamService;
