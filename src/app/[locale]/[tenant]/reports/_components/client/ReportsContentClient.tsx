'use client';

import { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

// Constants for dashboard URLs - update these with your actual Grafana URLs
// These should be relative to your Grafana base URL
const DASHBOARD_URLS = {
  configOverview:
    '/d/job-configuration-overview/job-configuration-overview?orgId=1&from=now-24h&to=now&theme=light',
  executionMetrics:
    '/d/job-execution-metrics/job-execution-metrics?orgId=1&from=now-24h&to=now&theme=light',
  executionDetails:
    '/d/job-execution-details/job-execution-details?orgId=1&from=now-24h&to=now&theme=light',
};

// Base URL for your Grafana instance - update this with your actual Grafana URL
const GRAFANA_BASE_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

interface GrafanaDashboardProps {
  dashboardUrl: string;
  title: string;
}

function GrafanaDashboard({ dashboardUrl, title }: GrafanaDashboardProps) {
  const fullUrl = `${GRAFANA_BASE_URL}${dashboardUrl}`;

  return (
    <div className="w-full h-[600px] rounded-md overflow-hidden border border-border">
      <iframe src={fullUrl} title={title} width="100%" height="100%" frameBorder="0" />
    </div>
  );
}

export function ReportsContentClient() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Job Monitoring Dashboards</CardTitle>
          <CardDescription>
            View real-time metrics about your job configurations and executions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Configuration Overview</TabsTrigger>
              <TabsTrigger value="metrics">Execution Metrics</TabsTrigger>
              <TabsTrigger value="details">Execution Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <GrafanaDashboard
                dashboardUrl={DASHBOARD_URLS.configOverview}
                title="Job Configuration Overview"
              />
            </TabsContent>

            <TabsContent value="metrics" className="mt-0">
              <GrafanaDashboard
                dashboardUrl={DASHBOARD_URLS.executionMetrics}
                title="Job Execution Metrics"
              />
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              <GrafanaDashboard
                dashboardUrl={DASHBOARD_URLS.executionDetails}
                title="Job Execution Details"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
