import * as React from 'react';
import { cn } from '@/lib/utils';
import { Role } from '@/types/user';
import { useUser } from '@/context/UserContext';

// Define roles based on the Role type definition
const roles: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'tester', label: 'Tester' },
  { value: 'viewer', label: 'Viewer' },
];

interface RoleSwitcherProps {
  className?: string;
}

function RoleSwitcherComponent({ className }: RoleSwitcherProps) {
  console.log('RoleSwitcher - Component mounting');
  
  const { user, updateRole } = useUser();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const currentRole = user?.user_role;
  console.log('RoleSwitcher - Current user data:', { user, currentRole });

  const handleRoleChange = React.useCallback(async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = event.target.value as Role;
    console.log('Role selected:', newRole);
    if (newRole === currentRole) {
      console.log('Role unchanged, skipping update');
      return;
    }
    
    try {
      setIsUpdating(true);
      await updateRole(newRole);
      console.log('Role updated successfully');
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [currentRole, updateRole]);

  // Early return if no user to prevent unnecessary renders
  if (!user) return null;

  return (
    <select
      value={currentRole || ''}
      onChange={handleRoleChange}
      disabled={isUpdating}
      className={cn(
        "w-[180px] px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background",
        isUpdating && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <option value="" disabled>Select role...</option>
      {roles.map((role) => (
        <option key={role.value} value={role.value}>
          {role.label}
        </option>
      ))}
    </select>
  );
}

// Use React.memo to prevent unnecessary re-renders
export const RoleSwitcher = React.memo(RoleSwitcherComponent);
