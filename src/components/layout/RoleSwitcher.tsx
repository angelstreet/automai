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

// Declare the global debug role and events for TypeScript
declare global {
  interface Window {
    __debugRole: Role | null;
    __dispatchRoleChange: (role: Role) => void;
  }
}

interface RoleSwitcherProps {
  className?: string;
  user?: any; // Allow passing user directly
}

// Create a global variable to store the current debug role
// This is a hack for debugging purposes only
if (typeof window !== 'undefined') {
  if (!window.hasOwnProperty('__debugRole')) {
    Object.defineProperty(window, '__debugRole', {
      value: null,
      writable: true,
      configurable: true,
    });
  }

  // Create a simple event dispatcher for role changes
  if (!window.hasOwnProperty('__dispatchRoleChange')) {
    window.__dispatchRoleChange = (role: Role) => {
      // Update the global debug role
      window.__debugRole = role;

      // Dispatch a custom event that other components can listen for
      const event = new CustomEvent('debug-role-change', { detail: { role } });
      window.dispatchEvent(event);

      // Also store in localStorage for persistence across refreshes
      localStorage.setItem('debug_role', role);

      console.log('Debug role changed to:', role);
    };
  }
}

function RoleSwitcherComponent({ className, user: propUser }: RoleSwitcherProps) {
  // IMPORTANT: Always prioritize prop user role if it exists
  // Only use debug role from localStorage if prop user doesn't have a role
  let activeRole: Role = 'viewer';
  
  // First check if we have a valid prop user role - this has highest priority
  if (propUser?.role && roles.some(r => r.value === propUser.role)) {
    activeRole = propUser.role;
    console.log('[RoleSwitcher] Using prop user role:', propUser.role);
  } 
  // Only if no prop user role, check localStorage
  else if (typeof window !== 'undefined') {
    const storedRole = localStorage.getItem('debug_role') as Role;
    if (storedRole && roles.some(r => r.value === storedRole)) {
      activeRole = storedRole;
      console.log('[RoleSwitcher] Using stored debug role:', storedRole);
    }
  }
  
  // Track local changes with state
  const [currentRole, setCurrentRole] = React.useState<Role>(activeRole);
  
  // Make sure currentRole updates when prop changes
  React.useEffect(() => {
    if (propUser?.role && roles.some(r => r.value === propUser.role)) {
      setCurrentRole(propUser.role);
    }
  }, [propUser?.role]);

  // Update global debug role when changing role
  const handleRoleChange = (newRole: Role) => {
    console.log('[RoleSwitcher] Changing role to:', newRole);
    setCurrentRole(newRole);
    
    // Update global state
    if (typeof window !== 'undefined') {
      // Store the debug role in localStorage for persistence
      localStorage.setItem('debug_role', newRole);
      
      // Update the global debug role
      window.__debugRole = newRole;
      
      // Dispatch event for other components to listen
      const event = new CustomEvent('debug-role-change', { detail: { role: newRole } });
      window.dispatchEvent(event);
    }
  };
  
  // If no user provided, return loading state
  if (!propUser) {
    return <div className="w-[180px] h-10 bg-muted animate-pulse rounded-md"></div>;
  }
  
  return (
    <Select
      value={currentRole}
      onValueChange={handleRoleChange}
    >
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
