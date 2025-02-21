'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RoleSwitcher, type Role } from '@/components/ui/role-switcher';

interface DashboardHeaderProps {
  tenant: string;
}

export function DashboardHeader({ tenant }: DashboardHeaderProps) {
  const t = useTranslations('Dashboard');
  const [currentRole, setCurrentRole] = useState<Role>('admin');

  const handleRoleChange = (role: Role) => {
    setCurrentRole(role);
    // Here you would typically update the role in your auth context/state management
  };

  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-3">
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold">{tenant}</h2>
        <RoleSwitcher
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          className="ml-4"
        />
      </div>
      <div className="flex items-center space-x-4">
        {/* Add other header items here (notifications, user menu, etc.) */}
      </div>
    </div>
  );
} 