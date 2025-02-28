'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/Shadcn/button';

export function DashboardHeader() {
  const t = useTranslations('Dashboard');

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <div className="flex items-center space-x-2">
        <Button>Run Tests</Button>
      </div>
    </div>
  );
} 