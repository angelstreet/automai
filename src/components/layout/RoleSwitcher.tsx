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
  // Get user from context if not provided as prop
  const userContext = useUser();
  const user = propUser || userContext?.user;
  
  // Debug log user role
  React.useEffect(() => {
    console.log('[RoleSwitcher] User data:', {
      propUserExists: !!propUser,
      contextUserExists: !!userContext?.user,
      userRole: user?.role || 'not set',
      currentContextRole: userContext?.user?.role || 'not in context'
    });
  }, [propUser, userContext?.user, user?.role]);
  
  // Initialize with stored debug role, user role, or default to 'viewer'
  const [currentRole, setCurrentRole] = React.useState<Role>(() => {
    if (typeof window !== 'undefined') {
      // Check localStorage first for debug role override
      const storedRole = localStorage.getItem('debug_role') as Role;
      if (storedRole && roles.some((r) => r.value === storedRole)) {
        return storedRole;
      }
      
      // Otherwise use actual user role if available
      if (user?.role && roles.some((r) => r.value === user.role)) {
        return user.role;
      }
    }
    return 'viewer';
  });

  // Update global debug role on initialization and when user role changes
  React.useEffect(() => {
    if (typeof window !== 'undefined' && currentRole) {
      window.__debugRole = currentRole;
    }
  }, []);
  
  // Also update the role when user data changes (for example after login)
  React.useEffect(() => {
    if (user?.role && !localStorage.getItem('debug_role')) {
      // Only update if there's no manual debug role override
      setCurrentRole(user.role);
    }
  }, [user?.role]);

  return (
    <Select
      value={currentRole}
      onValueChange={(value: Role) => {
        // Set local state
        setCurrentRole(value);

        // Use the global dispatcher to update everywhere
        if (typeof window !== 'undefined') {
          window.__dispatchRoleChange(value);
        }
      }}
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
