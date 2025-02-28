'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/Shadcn/tabs';
import { StatsCards } from './StatsCards';
import { MainContent } from './MainContent';
import { TabContentCard } from './TabContentCard';

export function DashboardTabs() {
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
        <StatsCards />
        <MainContent />
      </TabsContent>

      <TabsContent value="analytics">
        <TabContentCard title="Analytics" />
      </TabsContent>

      <TabsContent value="reports">
        <TabContentCard title="Reports" />
      </TabsContent>

      <TabsContent value="notifications">
        <TabContentCard title="Notifications" />
      </TabsContent>
    </Tabs>
  );
} 