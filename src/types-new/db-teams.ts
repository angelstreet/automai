/**
 * Team database table definitions
 * Aligned with Supabase schema
 */
import { BaseRow, Json } from './db-common';

/**
 * Tenants table schema
 */
export interface TenantsTable {
  Row: {
    id: string;
    name: string;
    domain: string | null;
    created_at: string;
    updated_at: string;
    subscription_tier_id: string | null;
    organization_id: string | null;
  };
  Insert: {
    id?: string;
    name: string;
    domain?: string | null;
    created_at?: string;
    updated_at?: string;
    subscription_tier_id?: string | null;
    organization_id?: string | null;
  };
  Update: {
    id?: string;
    name?: string;
    domain?: string | null;
    created_at?: string;
    updated_at?: string;
    subscription_tier_id?: string | null;
    organization_id?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'tenants_subscription_tier_id_fkey';
      columns: ['subscription_tier_id'];
      isOneToOne: false;
      referencedRelation: 'subscription_tiers';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Teams table schema
 */
export interface TeamsTable {
  Row: BaseRow & {
    name: string;
    description: string | null;
    tenant_id: string;
    created_by: string;
    is_default: boolean;
  };
  Insert: {
    id?: string;
    name: string;
    description?: string | null;
    tenant_id: string;
    created_by: string;
    is_default?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    name?: string;
    description?: string | null;
    tenant_id?: string;
    created_by?: string;
    is_default?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'teams_tenant_id_fkey';
      columns: ['tenant_id'];
      isOneToOne: false;
      referencedRelation: 'tenants';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'teams_created_by_fkey';
      columns: ['created_by'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Team members table schema
 */
export interface TeamMembersTable {
  Row: {
    team_id: string;
    profile_id: string;
    role: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    team_id: string;
    profile_id: string;
    role: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    team_id?: string;
    profile_id?: string;
    role?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'team_members_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'team_members_profile_id_fkey';
      columns: ['profile_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Subscription tiers table schema
 */
export interface SubscriptionTiersTable {
  Row: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id: string;
    name: string;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    name?: string;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
}

/**
 * Resource limits table schema
 */
export interface ResourceLimitsTable {
  Row: BaseRow & {
    tier_id: string;
    resource_type: string;
    max_count: number;
    is_unlimited: boolean;
  };
  Insert: {
    id?: string;
    tier_id: string;
    resource_type: string;
    max_count: number;
    is_unlimited?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    tier_id?: string;
    resource_type?: string;
    max_count?: number;
    is_unlimited?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'resource_limits_tier_id_fkey';
      columns: ['tier_id'];
      isOneToOne: false;
      referencedRelation: 'subscription_tiers';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Permission matrix table schema
 */
export interface PermissionMatrixTable {
  Row: BaseRow & {
    team_id: string;
    profile_id: string;
    resource_type: string;
    can_select: boolean;
    can_insert: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_update_own: boolean;
    can_delete_own: boolean;
    can_execute: boolean;
  };
  Insert: {
    id?: string;
    team_id: string;
    profile_id: string;
    resource_type: string;
    can_select?: boolean;
    can_insert?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    can_update_own?: boolean;
    can_delete_own?: boolean;
    can_execute?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    team_id?: string;
    profile_id?: string;
    resource_type?: string;
    can_select?: boolean;
    can_insert?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    can_update_own?: boolean;
    can_delete_own?: boolean;
    can_execute?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'permission_matrix_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'permission_matrix_profile_id_fkey';
      columns: ['profile_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Role templates table schema
 */
export interface RoleTemplatesTable {
  Row: BaseRow & {
    name: string;
    permissions: Json;
  };
  Insert: {
    id?: string;
    name: string;
    permissions: Json;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    name?: string;
    permissions?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
}
