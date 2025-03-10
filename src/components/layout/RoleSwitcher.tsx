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
import { useUser } from '@/context/UserContext';
import { Loader2 } from 'lucide-react';

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

  // Handle role change with the new Select component
  const handleValueChange = React.useCallback(async (value: Role) => {
    console.log('Role selected:', value);
    if (value === currentRole) {
      console.log('Role unchanged, skipping update');
      return;
    }
    
    try {
      setIsUpdating(true);
      await updateRole(value);
      console.log('Role updated successfully');
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [currentRole, updateRole]);

  // Early return if no user to prevent unnecessary renders
  if (!user) return null;

  // Show loading spinner when updating role
  if (isUpdating) {
    return (
      <div className={cn("w-[180px] h-10 flex items-center justify-center", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <Select
      value={currentRole || undefined}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className={cn("w-[180px]", className)}>
        <SelectValue placeholder="Select a role">
          {roles.find(r => r.value === currentRole)?.label || 'Select a role'}
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
