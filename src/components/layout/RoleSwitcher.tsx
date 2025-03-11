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

// Declare the global debug role for TypeScript
declare global {
  interface Window {
    __debugRole: Role | null;
  }
}

interface RoleSwitcherProps {
  className?: string;
}

// Create a global variable to store the current debug role
// This is a hack for debugging purposes only
if (typeof window !== 'undefined' && !window.hasOwnProperty('__debugRole')) {
  Object.defineProperty(window, '__debugRole', {
    value: null,
    writable: true,
    configurable: true,
  });
}

function RoleSwitcherComponent({ className }: RoleSwitcherProps) {
  // Get user from context
  const { user } = useUser();

  // Local state for the selected role (for debugging)
  const [selectedRole, setSelectedRole] = React.useState<Role>(
    // Initialize from window.__debugRole if available, otherwise from user
    typeof window !== 'undefined' && window.__debugRole
      ? window.__debugRole
      : user?.role || 'viewer',
  );

  // Handle role change
  const handleValueChange = React.useCallback((value: Role) => {
    console.log('[RoleSwitcher] Debug: Changing role to:', value);

    // Update local state
    setSelectedRole(value);

    // Set the global debug role
    if (typeof window !== 'undefined') {
      window.__debugRole = value;
      console.log('[RoleSwitcher] Debug: Set global __debugRole to:', value);
    }

    try {
      // Dispatch custom event for debugging
      const event = new CustomEvent('debug:roleChange:v2', {
        detail: { role: value },
        bubbles: true,
      });
      window.dispatchEvent(event);
      console.log('[RoleSwitcher] Debug: Successfully dispatched debug:roleChange:v2 event');
    } catch (error) {
      console.error('[RoleSwitcher] Error dispatching role change event:', error);
    }
  }, []);

  return (
    <Select value={selectedRole} onValueChange={handleValueChange}>
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder="Select a role">
          {roles.find((r) => r.value === selectedRole)?.label || 'Select a role'}
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
