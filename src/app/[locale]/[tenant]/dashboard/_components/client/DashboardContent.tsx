'use client';

import { ReactNode } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

import { DashboardMainContentClient } from './DashboardMainContentClient';
import { DashboardStatsCardsClient } from './DashboardStatsCardsClient';
import { DashboardTabContentCardClient } from './DashboardTabContentCardClient';

interface DashboardContentProps {
  pageMetadata?: {
    title: string;
    description: string;
    actions?: ReactNode;
  };
}

export function DashboardContent({ pageMetadata }: DashboardContentProps = {}) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <div className="flex overflow-x-auto pb-2">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-4">
        <DashboardStatsCardsClient />
        <DashboardMainContentClient />
      </TabsContent>

      <TabsContent value="analytics">
        <DashboardTabContentCardClient title="Analytics" />
      </TabsContent>

      <TabsContent value="reports">
        <DashboardTabContentCardClient title="Reports" />
      </TabsContent>

      <TabsContent value="notifications">
        <DashboardTabContentCardClient title="Notifications" />
      </TabsContent>
    </Tabs>
  );
}
