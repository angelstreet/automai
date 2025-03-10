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

// Create a custom event for role changes
const dispatchRoleChangeEvent = (role: Role) => {
  // Create and dispatch a custom event
  const event = new CustomEvent('debug:roleChange', { 
    detail: { role },
    bubbles: true 
  });
  window.dispatchEvent(event);
  console.log('Debug role change event dispatched:', role);
};

function RoleSwitcherComponent({ className }: RoleSwitcherProps) {
  // Get user from context
  const { user } = useUser();
  
  // Local state for the selected role (for debugging)
  const [selectedRole, setSelectedRole] = React.useState<Role>(user?.user_role || 'viewer');
  
  // Handle role change
  const handleValueChange = React.useCallback((value: Role) => {
    console.log('Debug: Changing role to:', value);
    
    // Update local state
    setSelectedRole(value);
    
    // Dispatch custom event for debugging
    dispatchRoleChangeEvent(value);
  }, []);

  return (
    <Select
      value={selectedRole}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder="Select a role">
          {roles.find(r => r.value === selectedRole)?.label || 'Select a role'}
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
