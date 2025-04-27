'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Card, CardContent } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

const DASHBOARD_URLS = {
  configOverview:
    'd/558a7504-0f4e-45b7-9662-5dd43f382a87/job-execution-metrics?orgId=1&from=now-7d&to=now&timezone=browser&theme=dark&var-team_name=7fdeb4bb-3639-4ec3-959f-b54769a219ce',
  executionMetrics:
    'd/558a7504-0f4e-45b7-9662-5dd43f382a87/job-execution-metrics?orgId=1&from=now-7d&to=now&timezone=browser&theme=dark&var-team_name=7fdeb4bb-3639-4ec3-959f-b54769a219ce',
  executionDetails:
    'd/5be5172d-0105-4bd9-b5a6-8f1dfe4c5536/job-execution-details?orgId=1&from=now-7d&to=now&timezone=browser&theme=dark&var-team_name=7fdeb4bb-3639-4ec3-959f-b54769a219ce',
};

// Base URL for your Grafana instance - update this with your actual Grafana URL
const GRAFANA_BASE_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

interface GrafanaDashboardProps {
  dashboardUrl: string;
  title: string;
  teamId: string;
}

function GrafanaDashboard({ dashboardUrl, title, teamId }: GrafanaDashboardProps) {
  // Replace the placeholder team ID with the actual team ID
  const urlWithTeamId = dashboardUrl.replace('7fdeb4bb-3639-4ec3-959f-b54769a219ce', teamId);
  const fullUrl = `${GRAFANA_BASE_URL}${urlWithTeamId}`;

  return (
    <div className="w-full h-[600px] rounded-md overflow-hidden border border-border">
      <iframe src={fullUrl} title={title} width="100%" height="100%" frameBorder="0" />
    </div>
  );
}

interface ReportsContentClientProps {
  user: User | null;
  teamDetails: Team | null;
}

export function ReportsContentClient({ user: _user, teamDetails }: ReportsContentClientProps) {
  const t = useTranslations('reports');
  const [activeTab, setActiveTab] = useState('overview');

  // Get the active team ID from props
  const teamId = teamDetails?.id || '7fdeb4bb-3639-4ec3-959f-b54769a219ce'; // Fallback to default

  console.log(
    `[@component:ReportsContentClient] Using team ID: ${teamId}, name: ${teamDetails?.name || 'Unknown'}`,
  );

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

            <TabsContent value="overview" className="mt-0">
              <GrafanaDashboard
                dashboardUrl={DASHBOARD_URLS.configOverview}
                title={t('config_overview')}
                teamId={teamId}
              />
            </TabsContent>

            <TabsContent value="metrics" className="mt-0">
              <GrafanaDashboard
                dashboardUrl={DASHBOARD_URLS.executionMetrics}
                title={t('execution_metrics')}
                teamId={teamId}
              />
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              <GrafanaDashboard
                dashboardUrl={DASHBOARD_URLS.executionDetails}
                title={t('execution_details')}
                teamId={teamId}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
