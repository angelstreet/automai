import {  ResourceType  } from '@/types/context/permissionsContextType';

// Team related types
export interface Team {
  id: string;
  name: string;
  description?: string;
  tenant_id: string;do
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
  updateTeamMemberRole: (
    teamId: string,
    profileId: string,
    role: string,
  ) => Promise<TeamMember | null>;
  removeTeamMember: (teamId: string, profileId: string) => Promise<boolean>;
  checkResourceLimit: (resourceType: string) => Promise<ResourceLimit | null>;
}

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
    deployments: number;
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

export interface TeamMemberResource {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: string;
  profile_id: string;
}

export interface MemberPermission {
  select: boolean;
  insert: boolean;
  update: boolean;
  delete: boolean;
  update_own: boolean;
  delete_own: boolean;
  execute: boolean;
}

export interface PermissionMatrix {
  [key: string]: MemberPermission;
}

export interface ResourcePermissions {
  hosts: MemberPermission;
  repositories: MemberPermission;
  deployments: MemberPermission;
  cicd_providers: MemberPermission;
  cicd_jobs: MemberPermission;
}

export interface RoleTemplate {
  name: string;
  permissions: ResourcePermissions;
}

export const ROLE_TEMPLATES: Record<string, ResourcePermissions> = {
  admin: {
    hosts: {
      select: true,
      insert: true,
      update: true,
      delete: true,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    repositories: {
      select: true,
      insert: true,
      update: true,
      delete: true,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    deployments: {
      select: true,
      insert: true,
      update: true,
      delete: true,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    cicd_providers: {
      select: true,
      insert: true,
      update: true,
      delete: true,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    cicd_jobs: {
      select: true,
      insert: true,
      update: true,
      delete: true,
      update_own: true,
      delete_own: true,
      execute: true,
    },
  },
  developer: {
    hosts: {
      select: true,
      insert: true,
      update: true,
      delete: false,
      update_own: true,
      delete_own: false,
      execute: true,
    },
    repositories: {
      select: true,
      insert: true,
      update: true,
      delete: false,
      update_own: true,
      delete_own: false,
      execute: true,
    },
    deployments: {
      select: true,
      insert: true,
      update: true,
      delete: false,
      update_own: true,
      delete_own: false,
      execute: true,
    },
    cicd_providers: {
      select: true,
      insert: true,
      update: true,
      delete: false,
      update_own: true,
      delete_own: false,
      execute: true,
    },
    cicd_jobs: {
      select: true,
      insert: true,
      update: true,
      delete: false,
      update_own: true,
      delete_own: false,
      execute: true,
    },
  },
  contributor: {
    hosts: {
      select: true,
      insert: true,
      update: false,
      delete: false,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    repositories: {
      select: true,
      insert: true,
      update: false,
      delete: false,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    deployments: {
      select: true,
      insert: true,
      update: false,
      delete: false,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    cicd_providers: {
      select: true,
      insert: false,
      update: false,
      delete: false,
      update_own: true,
      delete_own: false,
      execute: false,
    },
    cicd_jobs: {
      select: true,
      insert: false,
      update: false,
      delete: false,
      update_own: true,
      delete_own: false,
      execute: true,
    },
  },
  viewer: {
    hosts: {
      select: true,
      insert: false,
      update: false,
      delete: false,
      update_own: false,
      delete_own: false,
      execute: false,
    },
    repositories: {
      select: true,
      insert: false,
      update: false,
      delete: false,
      update_own: false,
      delete_own: false,
      execute: false,
    },
    deployments: {
      select: true,
      insert: false,
      update: false,
      delete: false,
      update_own: false,
      delete_own: false,
      execute: false,
    },
    cicd_providers: {
      select: true,
      insert: false,
      update: false,
      delete: false,
      update_own: false,
      delete_own: false,
      execute: false,
    },
    cicd_jobs: {
      select: true,
      insert: false,
      update: false,
      delete: false,
      update_own: false,
      delete_own: false,
      execute: false,
    },
  },
  tester: {
    hosts: {
      select: true,
      insert: true,
      update: false,
      delete: false,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    repositories: {
      select: true,
      insert: true,
      update: false,
      delete: false,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    deployments: {
      select: true,
      insert: true,
      update: false,
      delete: false,
      update_own: true,
      delete_own: true,
      execute: true,
    },
    cicd_providers: {
      select: true,
      insert: false,
      update: false,
      delete: false,
      update_own: false,
      delete_own: false,
      execute: false,
    },
    cicd_jobs: {
      select: true,
      insert: true,
      update: false,
      delete: false,
      update_own: true,
      delete_own: true,
      execute: true,
    },
  },
};

export const RESOURCE_LABELS: Record<ResourceType | string, string> = {
  hosts: 'Hosts',
  repositories: 'Repositories',
  deployments: 'Deployments',
  cicd_providers: 'CI/CD Providers',
  cicd_jobs: 'CI/CD Jobs',
};

export const PERMISSION_LABELS: Record<keyof MemberPermission, string> = {
  select: 'View',
  insert: 'Create',
  update: 'Edit All',
  delete: 'Delete All',
  update_own: 'Edit Own',
  delete_own: 'Delete Own',
  execute: 'Execute',
};

export interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMember?: (email: string, role: string) => Promise<void>;
  teamId?: string | null;
}

export interface EditPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberResource;
  initialPermissions?: ResourcePermissions;
  teamId?: string | null;
  onSavePermissions?: (
    member: TeamMemberResource,
    permissions: ResourcePermissions,
  ) => Promise<void>;
}
