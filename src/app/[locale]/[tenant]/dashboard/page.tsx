'use client';

import { useEffect } from 'react';
import { DashboardHeader } from './_components/DashboardHeader';
import { DashboardTabs } from './_components/DashboardTabs';

export default function DashboardPage() {
  // Log when the dashboard page renders
  useEffect(() => {
    console.log('Dashboard page rendered at:', new Date().toISOString());
  }, []);

  return (
    <div className="flex-1 space-y-4">
      <DashboardHeader />
      <DashboardTabs />
    </div>
  );
}
