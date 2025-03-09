'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/shadcn/button';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { useRole } from '@/context/RoleContext';

function DashboardHeaderComponent() {
  const t = useTranslations('Dashboard');
  const { role } = useRole();

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Role:</span>
          <RoleSwitcher className="w-[150px]" />
        </div>
        {role === 'admin' && (
          <Button variant="outline">Admin Settings</Button>
        )}
        {(role === 'developer' || role === 'admin') && (
          <Button>Run Tests</Button>
        )}
        {role === 'operator' && (
          <Button variant="secondary">Monitor System</Button>
        )}
      </div>
    </div>
  );
}

// Use React.memo to prevent unnecessary re-renders
export const DashboardHeader = React.memo(DashboardHeaderComponent);
