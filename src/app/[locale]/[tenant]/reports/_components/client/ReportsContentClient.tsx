'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useState } from 'react';

import { Card, CardContent } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

const DASHBOARD_URLS = {
  configOverview:
    'd/558a7504-0f4e-45b7-9662-5dd43f382a87/job-execution-metrics?orgId=1&from=now-7d&to=now&timezone=browser',
  executionMetrics:
    'd/558a7504-0f4e-45b7-9662-5dd43f382a87/job-execution-metrics?orgId=1&from=now-7d&to=now&timezone=browser',
  executionDetails:
    'd/5be5172d-0105-4bd9-b5a6-8f1dfe4c5536/job-execution-details?orgId=1&from=now-7d&to=now&timezone=browser',
};

// Base URL for your Grafana instance - update this with your actual Grafana URL
const GRAFANA_BASE_URL = process.env.NEXT_PUBLIC_GRAFANA_URL;

interface GrafanaDashboardProps {
  dashboardUrl: string;
  title: string;
  teamId: string;
  theme: string;
}

function GrafanaDashboard({ dashboardUrl, title, teamId, theme }: GrafanaDashboardProps) {
  // Add team_name and theme parameters to the URL
  const urlWithParams = `${dashboardUrl}&var-team_name=${teamId}&theme=${theme}`;

  // Ensure there are no double slashes when combining base URL and dashboard URL
  const baseUrl = GRAFANA_BASE_URL.endsWith('/') ? GRAFANA_BASE_URL.slice(0, -1) : GRAFANA_BASE_URL;
  const fullUrl = `${baseUrl}/${urlWithParams}`;
  console.log(`[@component:ReportsContentClient] Full URL: ${fullUrl}`);
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
  const { resolvedTheme } = useTheme();

  // Get the active team ID from props
  const teamId = teamDetails?.id || '7fdeb4bb-3639-4ec3-959f-b54769a219ce'; // Fallback to default

  // Grafana only supports 'light' or 'dark' themes
  // Map our app theme to Grafana's supported theme values
  const grafanaTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  console.log(`[@component:ReportsContentClient] Using team ID: ${teamId}, theme: ${grafanaTheme}`);

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
                theme={grafanaTheme}
              />
            </TabsContent>

            <TabsContent value="metrics" className="mt-0">
              <GrafanaDashboard
                dashboardUrl={DASHBOARD_URLS.executionMetrics}
                title={t('execution_metrics')}
                teamId={teamId}
                theme={grafanaTheme}
              />
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              <GrafanaDashboard
                dashboardUrl={DASHBOARD_URLS.executionDetails}
                title={t('execution_details')}
                teamId={teamId}
                theme={grafanaTheme}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
