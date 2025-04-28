'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';

import { Card, CardContent } from '@/components/shadcn/card';
import {
  getBarChartConfig,
  getStatConfig,
  isSupportedPanelType,
} from '@/lib/utils/grafanaChartUtils';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ReportsGrafanaDashboardClientProps {
  dashboardUid: string;
}

export function ReportsGrafanaDashboardClient({
  dashboardUid,
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
        console.log(
          '[@component:ReportsGrafanaDashboardClient] API response:',
          JSON.stringify(data, null, 2),
        );
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
    isSupportedPanelType(panel.type),
  );

  return (
    <div className="space-y-6">
      {supportedPanels.length === 0 && (
        <div className="text-muted-foreground text-center">{t('no_supported_panels')}</div>
      )}
      {supportedPanels.map((panel: any) => (
        <Card key={panel.id} className="mb-4">
          <CardContent className="pt-4 px-4 pb-4">
            <h3 className="text-lg font-medium mb-2">{panel.title}</h3>
            {panel.type === 'stat' && (
              <div className="text-3xl font-bold">{getStatConfig(panel).value}</div>
            )}
            {panel.type === 'barchart' && (
              <div style={{ height: '200px' }}>
                <Bar {...getBarChartConfig(panel)} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <div className="mt-6 text-center">
        <a
          href={`${process.env.NEXT_PUBLIC_GRAFANA_URL}/d/${dashboardUid}`}
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
