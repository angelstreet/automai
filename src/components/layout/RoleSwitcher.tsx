import * as React from 'react';
import { Role, useRole } from '@/context/RoleContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { cn } from '@/lib/utils';

const roles: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'tester', label: 'Tester' },
  { value: 'viewer', label: 'Viewer' },
];

interface RoleSwitcherProps {
  className?: string;
}

export function RoleSwitcher({ className }: RoleSwitcherProps) {
  const { currentRole, setCurrentRole, isLoading } = useRole();
  
  const handleValueChange = (value: Role) => {
    // Dispatch a custom event when the role changes
    const event = new CustomEvent('roleChange', { detail: value });
    window.dispatchEvent(event);
    setCurrentRole(value);
  };

  if (isLoading) {
    return (
      <div className={cn('w-[200px] h-10 bg-muted animate-pulse rounded-md', className)} />
    );
  }

  return (
    <Select value={currentRole} onValueChange={handleValueChange}>
      <SelectTrigger className={cn('w-[200px]', className)}>
        <SelectValue>{roles.find((role) => role.value === currentRole)?.label}</SelectValue>
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
