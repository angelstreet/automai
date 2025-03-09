'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

function DashboardHeaderComponent() {
  const t = useTranslations('Dashboard');
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
    </div>
  );
}

// Use React.memo to prevent unnecessary re-renders
export const DashboardHeader = React.memo(DashboardHeaderComponent);
