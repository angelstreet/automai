import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ResourceType, Operation } from '@/types/context/permissionsContextType';
import { usePermission } from '@/hooks';

interface PermissionAwareActionsProps {
  resourceType: ResourceType;
  resourceId: string;
  creatorId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onExecute?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canExecute?: boolean;
  loading?: boolean;
}

export function PermissionAwareActions({
  resourceType,
  resourceId,
  creatorId,
  onEdit,
  onDelete,
  onExecute,
  canEdit: externalCanEdit,
  canDelete: externalCanDelete,
  canExecute: externalCanExecute,
  loading = false,
}: PermissionAwareActionsProps) {
  const { hasPermission } = usePermission();
  const [permissions, setPermissions] = useState({
    canUpdate: externalCanEdit ?? false,
    canDelete: externalCanDelete ?? false,
    canExecute: externalCanExecute ?? false,
  });

  useEffect(() => {
    const checkPermissions = async () => {
      if (
        externalCanEdit !== undefined &&
        externalCanDelete !== undefined &&
        externalCanExecute !== undefined
      ) {
        return;
      }

      try {
        const [canUpdate, canDelete, canExecute] = await Promise.all([
          externalCanEdit !== undefined
            ? Promise.resolve(externalCanEdit)
            : hasPermission(resourceType, 'update', creatorId),
          externalCanDelete !== undefined
            ? Promise.resolve(externalCanDelete)
            : hasPermission(resourceType, 'delete', creatorId),
          externalCanExecute !== undefined
            ? Promise.resolve(externalCanExecute)
            : hasPermission(resourceType, 'execute'),
        ]);

        setPermissions({
          canUpdate,
          canDelete,
          canExecute,
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };

    checkPermissions();
  }, [
    resourceType,
    creatorId,
    hasPermission,
    externalCanEdit,
    externalCanDelete,
    externalCanExecute,
  ]);

  return (
    <div className="flex space-x-2">
      {onEdit && permissions.canUpdate && (
        <Button variant="outline" size="sm" onClick={onEdit} disabled={loading}>
          Edit
        </Button>
      )}

      {onDelete && permissions.canDelete && (
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={loading}>
          Delete
        </Button>
      )}

      {onExecute && permissions.canExecute && (
        <Button variant="default" size="sm" onClick={onExecute} disabled={loading}>
          Run
        </Button>
      )}
    </div>
  );
}
