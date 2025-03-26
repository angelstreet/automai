import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { cn } from '@/lib/utils';
import { Role } from '@/types/user';
import { useUser } from '@/context';

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
}

function RoleSwitcherComponent({ className, user: propUser }: RoleSwitcherProps) {
  const userContext = useUser();
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Use prop user if available, otherwise fall back to context
  const user = propUser || userContext?.user;
  const activeRole = user?.role || 'viewer';

  // Track local changes with state
  const [currentRole, setCurrentRole] = React.useState<Role>(activeRole);

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
      console.log('[RoleSwitcher] Updating role to:', newRole);

      // Update role through UserContext
      await userContext.updateRole(newRole);

      // Local state will be updated via the useEffect when the user prop changes
    } catch (error) {
      console.error('[RoleSwitcher] Error updating role:', error);
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
      <SelectTrigger className={cn('w-[180px]', className)}>
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
