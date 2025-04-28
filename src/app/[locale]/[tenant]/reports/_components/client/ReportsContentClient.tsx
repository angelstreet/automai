'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Card, CardContent } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Team } from '@/types/context/teamContextType';
import { DASHBOARD_UIDS } from '@/types-new/grafana-constants';

import { ReportsGrafanaDashboardClient } from './ReportsGrafanaDashboardClient';

interface ReportsContentClientProps {
  teamDetails: Team | null;
}

export function ReportsContentClient({ teamDetails }: ReportsContentClientProps) {
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
              <ReportsGrafanaDashboardClient
                dashboardUid={DASHBOARD_UIDS.configOverview}
                teamDetails={teamDetails}
              />
            </TabsContent>

            <TabsContent value="metrics" className="mt-0 relative">
              <ReportsGrafanaDashboardClient
                dashboardUid={DASHBOARD_UIDS.executionMetrics}
                teamDetails={teamDetails}
              />
            </TabsContent>

            <TabsContent value="details" className="mt-0 relative">
              <ReportsGrafanaDashboardClient
                dashboardUid={DASHBOARD_UIDS.executionDetails}
                teamDetails={teamDetails}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
