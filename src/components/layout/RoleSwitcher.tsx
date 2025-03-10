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
  
  // Get user from context but we'll override the role locally
  const { user } = useUser();
  
  // Use local state for the role instead of the user context
  const [currentRole, setCurrentRole] = React.useState<Role>(user?.user_role || 'viewer');
  
  console.log('RoleSwitcher - Current user data:', { user, currentRole });

  // Update the role locally without making API calls
  const handleValueChange = React.useCallback((value: Role) => {
    console.log('Role selected:', value);
    if (value === currentRole) {
      console.log('Role unchanged, skipping update');
      return;
    }
    
    // Update role immediately
    setCurrentRole(value);
    console.log('Role updated locally to:', value);
    
    // Dispatch a custom event when the role changes (for any components that might be listening)
    const event = new CustomEvent('roleChange', { detail: value });
    window.dispatchEvent(event);
  }, [currentRole]);

  return (
    <Select
      value={currentRole}
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
