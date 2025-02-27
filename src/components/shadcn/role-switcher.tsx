import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { type Role } from '@/context/role-context';

const roles: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'tester', label: 'Tester' },
  { value: 'viewer', label: 'Viewer' },
];

interface RoleSwitcherProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  className?: string;
}

export function RoleSwitcher({ currentRole, onRoleChange, className }: RoleSwitcherProps) {
  const handleValueChange = (value: Role) => {
    // Dispatch a custom event when the role changes
    const event = new CustomEvent('roleChange', { detail: value });
    window.dispatchEvent(event);
    onRoleChange(value);
  };

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
