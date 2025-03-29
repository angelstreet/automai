'use server';

import {
  Team,
  getTeamById as dbGetTeamById,
  getUserTeams as dbGetUserTeams,
  setUserActiveTeam as dbSetUserActiveTeam,
  getUserActiveTeam as dbGetUserActiveTeam,
  TeamResult,
} from '@/lib/supabase/db-teams/teams';

/**
 * Get teams that a user belongs to
 */
export async function getUserTeams(
  profileId: string,
): Promise<{ success: boolean; data?: Team[]; error?: string }> {
  return dbGetUserTeams(profileId);
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: string): Promise<TeamResult> {
  return dbGetTeamById(teamId);
}

/**
 * Get the active team for a user
 */
export async function getUserActiveTeam(userId: string): Promise<TeamResult> {
  return dbGetUserActiveTeam(userId);
}

/**
 * Set the active team for a user
 */
export async function setUserActiveTeam(
  userId: string,
  teamId: string,
): Promise<{ success: boolean; error?: string }> {
  return dbSetUserActiveTeam(userId, teamId);
}

// Export types for client usage
export type { Team, TeamResult };
