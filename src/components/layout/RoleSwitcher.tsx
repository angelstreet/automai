import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { useUser } from '@/hooks';
import { cn } from '@/lib/utils';
import { Role } from '@/types/service/userServiceType';

// Add type declarations at the top of the file
declare global {
  interface Window {
    __userContext?: {
      user?: {
        role: Role;
      };
    };
    __debugRole?: Role;
  }
}

// Define roles based on the Role type definition
const roles: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'tester', label: 'Tester' },
  { value: 'viewer', label: 'Viewer' },
];

interface RoleSwitcherProps {
  className?: string;
  user?: any; // Allow passing user directly
  instanceId?: string; // Add optional instance identifier
}

function RoleSwitcherComponent({
  className,
  user: propUser,
  instanceId = 'unknown',
}: RoleSwitcherProps) {
  const userContext = useUser(null, `RoleSwitcher-${instanceId}`);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Use prop user if available, otherwise fall back to context
  const user = propUser || userContext?.user;
  const activeRole = user?.role || 'viewer';

  // Track local changes with state
  const [currentRole, setCurrentRole] = React.useState<Role>(activeRole);

  // Log mount once
  React.useEffect(() => {
    console.log(`[RoleSwitcher:${instanceId}] Mounted`);

    return () => {
      console.log(`[RoleSwitcher:${instanceId}] Unmounted`);
    };
  }, [instanceId]);

  // Make sure currentRole updates when user role changes
  React.useEffect(() => {
    if (user?.role) {
      setCurrentRole(user.role);
    }
  }, [user?.role]);

  // Handle role changes through UserContext
  const handleRoleChange = async (newRole: Role) => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      console.log(`[RoleSwitcher:${instanceId}] Updating role to:`, newRole);

      // Set current role immediately for faster UI response
      setCurrentRole(newRole);

      // Direct update in user object for immediate effect
      if (user) {
        // Create a patched user object with the new role
        const patchedUser = {
          ...user,
          role: newRole,
        };

        // Update user in localStorage for app-wide access
        if (typeof window !== 'undefined') {
          try {
            // Get current cached user and update role
            const cachedUserStr = localStorage.getItem('cached_user');
            if (cachedUserStr) {
              const cachedUser = JSON.parse(cachedUserStr);
              cachedUser.role = newRole;
              localStorage.setItem('cached_user', JSON.stringify(cachedUser));
            }

            // Direct global state access
            if (window.__userContext && window.__userContext.user) {
              window.__userContext.user.role = newRole;
            }

            // Dispatch event for components listening for role changes
            const event = new CustomEvent('debug-role-change', {
              detail: {
                role: newRole,
                user: patchedUser,
                previousRole: activeRole,
                source: instanceId, // Add source to event
              },
            });
            window.dispatchEvent(event);

            // Also set in window.__debugRole
            window.__debugRole = newRole;
          } catch (e) {
            console.error('Failed to update user in localStorage', e);
          }
        }
      }

      // Update role through UserContext (in background)
      try {
        // Call updateRole without trying to chain .catch on the result
        userContext.updateRole(newRole);
      } catch (updateError) {
        console.error(`[RoleSwitcher:${instanceId}] Error calling updateRole:`, updateError);
      }
    } catch (error) {
      console.error(`[RoleSwitcher:${instanceId}] Error updating role:`, error);
      // Revert to previous role on error
      setCurrentRole(activeRole);
    } finally {
      setIsUpdating(false);
    }
  };

  // If no user provided, return loading state
  if (!user) {
    return <div className="w-[180px] h-10 bg-muted animate-pulse rounded-md"></div>;
  }

  return (
    <Select value={currentRole} onValueChange={handleRoleChange} disabled={isUpdating}>
      <SelectTrigger className={cn('w-[140px]', className)}>
        <SelectValue placeholder="Select a role">
          {roles.find((r) => r.value === currentRole)?.label || 'Select a role'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Use React.memo to prevent unnecessary re-renders
export const RoleSwitcher = React.memo(RoleSwitcherComponent);
