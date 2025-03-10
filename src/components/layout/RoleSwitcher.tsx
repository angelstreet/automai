import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
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
  const { role: currentRole, setRole } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  // Stop loading when we have a role
  React.useEffect(() => {
    if (currentRole) {
      setIsLoading(false);
    }
  }, [currentRole]);

  // Handle role change
  const handleValueChange = useCallback((value: Role) => {
    // Only update if the role actually changed
    if (value !== currentRole) {
      // Dispatch a custom event when the role changes
      const event = new CustomEvent('roleChange', { detail: value });
      window.dispatchEvent(event);
      setRole(value);
    }
  }, [currentRole, setRole]);

  // Ensure the current role is valid
  useEffect(() => {
    const isValidRole = roles.some(role => role.value === currentRole);
    if (!isValidRole && roles.length > 0) {
      // If current role is not valid, set it to the first valid role
      setRole(roles[0].value);
    }
  }, [currentRole, setRole, roles]);

  // Set a timeout to stop loading after a reasonable time
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // 2 seconds timeout
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className={cn("w-[180px] h-10 flex items-center justify-center", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

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
