'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

function DashboardHeaderComponent() {
  const t = useTranslations('Dashboard');

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
    </div>
  );
}

// Use React.memo to prevent unnecessary re-renders
export const DashboardHeaderClient = React.memo(DashboardHeaderComponent);
