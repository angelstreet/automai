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
  getStatConfig,
  isSupportedPanelType,
  getUpdatedBarChartConfig,
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
  const [panelData, setPanelData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('reports');

  // Fetch dashboard structure
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
          setLoading(false);
        } else {
          setDashboard(data.dashboard);
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [dashboardUid]);

  // Fetch data for each panel once dashboard is loaded
  useEffect(() => {
    if (!dashboard || !dashboard.panels) return;

    setDataLoading(true);
    const panelsToProcess = dashboard.panels.filter((panel: any) =>
      isSupportedPanelType(panel.type),
    );

    Promise.all(
      panelsToProcess.map((panel: any) => {
        // Ensure each query has the correct datasource information
        const updatedQueries = panel.targets.map((query: any) => {
          if (!query.datasource || query.datasource.uid === 'unknown') {
            console.log(
              `[@component:ReportsGrafanaDashboardClient] Setting fallback datasource for panel ${panel.id}`,
            );
            return {
              ...query,
              datasource: {
                uid: 'dek6nh62v9j40b',
                type: 'grafana-postgresql-datasource',
              },
            };
          }
          return query;
        });
        return fetch('/api/grafana-panel-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dashboardUid,
            panelId: panel.id,
            queries: updatedQueries,
            timeRange: dashboard.time,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            console.log(
              `[@component:ReportsGrafanaDashboardClient] Panel ${panel.id} response data:`,
              JSON.stringify(data, null, 2),
            );
            return { panelId: panel.id, data };
          })
          .catch((err) => {
            console.error(
              `[@component:ReportsGrafanaDashboardClient] Error fetching data for panel ${panel.id}:`,
              err,
            );
            return { panelId: panel.id, error: String(err) };
          });
      }),
    ).then((results: Array<{ panelId: string; data?: any; error?: string }>) => {
      const newPanelData: Record<string, any> = {};
      results.forEach((result) => {
        newPanelData[result.panelId] = result;
      });
      setPanelData(newPanelData);
      setDataLoading(false);
    });
  }, [dashboard, dashboardUid]);

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {supportedPanels.length === 0 && (
        <div className="text-muted-foreground text-center col-span-2">
          {t('no_supported_panels')}
        </div>
      )}
      {supportedPanels.map((panel: any) => (
        <Card key={panel.id} className="mb-2">
          <CardContent className="pt-2 px-4 pb-2">
            <h3 className="text-lg font-medium">{panel.title}</h3>
            {dataLoading ? (
              <div className="text-muted-foreground">Loading panel data...</div>
            ) : (
              <>
                {panel.type === 'stat' && (
                  <div className="">
                    {panelData[panel.id]?.data?.results?.A?.frames?.[0]?.data?.values?.[0]?.[0] ??
                      getStatConfig(panel).value}
                  </div>
                )}
                {panel.type === 'barchart' && (
                  <div style={{ height: '200px' }}>
                    <Bar {...getUpdatedBarChartConfig(panel, panelData[panel.id]?.data)} />
                  </div>
                )}
                {panelData[panel.id]?.error && (
                  <div className="text-destructive text-sm">
                    Error loading data: {panelData[panel.id].error}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
      <div className="mt-2 text-right col-span-2">
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
