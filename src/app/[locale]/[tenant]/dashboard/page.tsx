'use client';

import { DashboardHeader } from './_components/DashboardHeader';
import { DashboardTabs } from './_components/DashboardTabs';

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4">
      <DashboardHeader />
      <DashboardTabs />
    </div>
  );
}
