export interface TeamDetails {
  id: string | null;
  name: string;
  subscription_tier: string;
  memberCount: number;
  role?: string; // Standardize on 'role' instead of 'userRole'
  ownerId: string | null;
  ownerEmail?: string | null;
  resourceCounts: {
    repositories: number;
    hosts: number;
    cicd: number;
  };
}

export interface TeamMemberDetails {
  profile_id: string;
  team_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    role?: string;
    tenant_id?: string;
    avatar_url?: string | null;
    tenant_name?: string;
    email?: string;
  };
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string | null;
  };
}

export interface UnassignedResources {
  repositories: any[];
}
