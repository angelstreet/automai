// Team DB Layer Module
// Exports all team-related database functions

// Import and re-export from teams.ts with specific names
import * as TeamsModule from './teams';
export type {
  Team,
  TeamResult,
  TeamsResult,
  TeamMember as TeamMemberType,
  TeamMemberResult as TeamMemberResultType,
  TeamMembersResult,
} from './teams';

export {
  getTeamById,
  getTeams,
  getUserTeams as getTeamsByUser,
  createTeam,
  updateTeam,
  deleteTeam,
} from './teams';

// Import and re-export from team-members.ts with different names to avoid conflicts
import * as TeamMembersModule from './team-members';
export {
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
} from './team-members';

// Export other modules
export * from './resource-limits';
export * from './permissions';
