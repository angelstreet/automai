export type ResourceType = 'hosts' | 'repositories' | 'deployments';
export type Operation = 'select' | 'insert' | 'update' | 'delete' | 'execute';

export interface PermissionMatrix {
  id: string;
  team_id: string;
  profile_id: string;
  resource_type: ResourceType;
  can_select: boolean;
  can_insert: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_update_own: boolean;
  can_delete_own: boolean;
  can_execute: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleTemplate {
  id: string;
  name: string;
  permissions: Record<
    ResourceType,
    {
      select: boolean;
      insert: boolean;
      update: boolean;
      delete: boolean;
      update_own: boolean;
      delete_own: boolean;
      execute: boolean;
    }
  >;
  created_at: string;
  updated_at: string;
}

export type PermissionsResult = {
  success: boolean;
  data?: PermissionMatrix[];
  error?: string;
};

export type RoleTemplatesResult = {
  success: boolean;
  data?: RoleTemplate[];
  error?: string;
};

export type RoleTemplateResult = {
  success: boolean;
  data?: RoleTemplate;
  error?: string;
};
