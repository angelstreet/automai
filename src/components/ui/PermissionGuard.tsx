'use client';

import React from 'react';
import { usePermission, ResourceType, Operation } from '@/context/PermissionContext';

interface PermissionGuardProps {
  resourceType: ResourceType;
  operation: Operation;
  creatorId?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A component that conditionally renders its children based on user permissions
 *
 * @example
 * ```tsx
 * // Only show the create host button if the user has insert permission for hosts
 * <PermissionGuard resourceType="hosts" operation="insert">
 *   <CreateHostButton />
 * </PermissionGuard>
 *
 * // For a resource that has a specific creator, check if user can update their own resource
 * <PermissionGuard
 *   resourceType="repositories"
 *   operation="update"
 *   creatorId={repository.creator_id}
 * >
 *   <EditButton />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  resourceType,
  operation,
  creatorId,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermission();

  // While permissions are loading, don't render anything to avoid flickering
  if (loading) {
    return null;
  }

  // Check if user has the requested permission
  const permitted = hasPermission(resourceType, operation, creatorId);

  // Render children if permitted, otherwise render fallback
  return permitted ? <>{children}</> : <>{fallback}</>;
}

/**
 * A component that renders different content based on whether the user has permission
 */
export function PermissionAware({
  resourceType,
  operation,
  creatorId,
  permitted,
  denied,
}: {
  resourceType: ResourceType;
  operation: Operation;
  creatorId?: string;
  permitted: React.ReactNode;
  denied: React.ReactNode;
}) {
  const { hasPermission, loading } = usePermission();

  if (loading) {
    return null;
  }

  return hasPermission(resourceType, operation, creatorId) ? <>{permitted}</> : <>{denied}</>;
}
