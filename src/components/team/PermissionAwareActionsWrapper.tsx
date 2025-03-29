import React from 'react';
import { PermissionAwareActions } from '@/components/team/PermissionAwareActions';
import { CreatorBadge } from '@/components/team/CreatorBadge';
import { ResourceType } from '@/lib/supabase/db-teams/permissions';

interface PermissionAwareActionsWrapperProps {
  resourceType: ResourceType;
  resourceId: string;
  creatorId?: string;
  children?: React.ReactNode;
  showCreatorBadge?: boolean;
  // Action handlers
  onEdit?: () => void;
  onDelete?: () => void;
  onExecute?: () => void;
  // Optional explicit permissions
  canEdit?: boolean;
  canDelete?: boolean;
  canExecute?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * Wrapper component that combines PermissionAwareActions with CreatorBadge
 * and allows for custom children to be rendered alongside actions
 */
export function PermissionAwareActionsWrapper({
  resourceType,
  resourceId,
  creatorId,
  children,
  showCreatorBadge = true,
  onEdit,
  onDelete,
  onExecute,
  canEdit,
  canDelete,
  canExecute,
  loading = false,
  className = '',
}: PermissionAwareActionsWrapperProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center">
        {children}
        {showCreatorBadge && creatorId && <CreatorBadge creatorId={creatorId} />}
      </div>

      <PermissionAwareActions
        resourceType={resourceType}
        resourceId={resourceId}
        creatorId={creatorId}
        onEdit={onEdit}
        onDelete={onDelete}
        onExecute={onExecute}
        canEdit={canEdit}
        canDelete={canDelete}
        canExecute={canExecute}
        loading={loading}
      />
    </div>
  );
}
