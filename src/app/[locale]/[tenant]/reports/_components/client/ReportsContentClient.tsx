'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Card, CardContent } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Team } from '@/types/context/teamContextType';

import { ReportsGrafanaDashboardClient } from './ReportsGrafanaDashboardClient';

const DASHBOARD_UIDS = {
  configOverview: '565c9d0e-1c43-424e-8705-623ee13c51df',
  executionMetrics: '558a7504-0f4e-45b7-9662-5dd43f382a87',
  executionDetails: '5be5172d-0105-4bd9-b5a6-8f1dfe4c5536',
};

interface ReportsContentClientProps {
  teamDetails: Team | null;
}

export function ReportsContentClient({ teamDetails: _teamDetails }: ReportsContentClientProps) {
  const t = useTranslations('reports');
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-2 mt-2">
              <TabsTrigger value="overview">{t('config_overview')}</TabsTrigger>
              <TabsTrigger value="metrics">{t('execution_metrics')}</TabsTrigger>
              <TabsTrigger value="details">{t('execution_details')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0 relative">
              <ReportsGrafanaDashboardClient dashboardUid={DASHBOARD_UIDS.configOverview} />
            </TabsContent>

            <TabsContent value="metrics" className="mt-0 relative">
              <ReportsGrafanaDashboardClient dashboardUid={DASHBOARD_UIDS.executionMetrics} />
            </TabsContent>

            <TabsContent value="details" className="mt-0 relative">
              <ReportsGrafanaDashboardClient dashboardUid={DASHBOARD_UIDS.executionDetails} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
