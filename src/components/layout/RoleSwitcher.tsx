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
  const { role: currentRole } = useUser();
  
  // Find the role label for display
  const roleLabel = roles.find(r => r.value === currentRole)?.label || 'Unknown Role';

  return (
    <div className={cn("w-[180px] px-3 py-2 flex items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background", className)}>
      <span>{roleLabel}</span>
    </div>
  );
}

// Use React.memo to prevent unnecessary re-renders
export const RoleSwitcher = React.memo(RoleSwitcherComponent);
