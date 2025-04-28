'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/shadcn/card';

interface ReportsGrafanaDashboardClientProps {
  dashboardUid: string;
  title: string;
}

export function ReportsGrafanaDashboardClient({
  dashboardUid,
  title,
}: ReportsGrafanaDashboardClientProps) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('reports');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/grafana-dashboard/${dashboardUid}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setDashboard(data.dashboard);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [dashboardUid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-destructive text-center p-8">
        {t('dashboard_load_error')}: {error}
      </div>
    );
  }
  if (!dashboard) {
    return <div className="text-muted-foreground text-center p-8">{t('no_dashboard_data')}</div>;
  }

  // Filter supported panels
  const supportedPanels = (dashboard.panels || []).filter((panel: any) =>
    ['stat', 'barchart', 'graph', 'table', 'line'].includes(panel.type),
  );

  return (
    <div className="space-y-6">
      {supportedPanels.length === 0 && (
        <div className="text-muted-foreground text-center">{t('no_supported_panels')}</div>
      )}
      {supportedPanels.map((panel: any) => (
        <Card key={panel.id} className="mb-4">
          <CardContent className="pt-4 px-4 pb-4">
            <div className="text-muted-foreground">
              Panel type: {panel.type} (Chart rendering coming soon)
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="mt-6 text-center">
        <a
          href={`https://automai.grafana.net/d/${dashboardUid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline text-xs"
        >
          {t('open_in_grafana')}
        </a>
      </div>
    </div>
  );
}
