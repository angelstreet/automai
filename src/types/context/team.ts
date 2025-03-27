// Team related types

export interface Team {
  id: string;
  name: string;
  description?: string;
  tenant_id: string;
  created_by?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamCreateInput {
  name: string;
  description?: string;
  is_default?: boolean;
}

export interface TeamUpdateInput {
  name?: string;
  description?: string;
  is_default?: boolean;
}

export interface TeamMember {
  team_id: string;
  profile_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface TeamMemberCreateInput {
  team_id: string;
  profile_id: string;
  role: string;
}

export interface ResourceLimit {
  type: string;
  current: number;
  limit: number;
  isUnlimited: boolean;
  canCreate: boolean;
}

export interface TeamContextValue {
  teams: Team[];
  selectedTeam: Team | null;
  teamMembers: TeamMember[];
  loading: boolean;
  error: string | null;
  fetchTeams: () => Promise<void>;
  setTeams: (teams: Team[]) => void;
  createTeam: (input: TeamCreateInput) => Promise<Team | null>;
  updateTeam: (teamId: string, input: TeamUpdateInput) => Promise<Team | null>;
  deleteTeam: (teamId: string) => Promise<boolean>;
  selectTeam: (teamId: string) => Promise<void>;
  fetchTeamMembers: (teamId: string) => Promise<void>;
  addTeamMember: (input: TeamMemberCreateInput) => Promise<TeamMember | null>;
  updateTeamMemberRole: (teamId: string, profileId: string, role: string) => Promise<TeamMember | null>;
  removeTeamMember: (teamId: string, profileId: string) => Promise<boolean>;
  checkResourceLimit: (resourceType: string) => Promise<ResourceLimit | null>;
}