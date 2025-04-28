'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef } from 'react';

import { Card, CardContent } from '@/components/shadcn/card';
import { fetchDashboard, fetchPanelData } from '@/lib/utils/grafana-data';
import { isSupportedPanelType } from '@/lib/utils/grafanaChartUtils';
import { GrafanaDashboard, GrafanaPanel, GrafanaPanelData } from '@/types-new/grafana-constants';

import {
  BarChartPanelClient,
  TimeSeriesPanelClient,
  TablePanelClient,
  StatPanelClient,
  BargaugePanelClient,
} from './GrafanaChartComponentsClient';
import {
  CellContentModalClient,
  ChartLoadingIndicatorClient,
  ChartErrorDisplayClient,
} from './GrafanaUtilComponentsClient';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
);

interface ReportsGrafanaDashboardClientProps {
  dashboardUid: string;
  teamDetails?: {
    id: string;
  } | null;
}

export function ReportsGrafanaDashboardClient({
  dashboardUid,
  teamDetails,
}: ReportsGrafanaDashboardClientProps) {
  const [dashboard, setDashboard] = useState<GrafanaDashboard | null>(null);
  const [panelData, setPanelData] = useState<Record<string | number, GrafanaPanelData>>({});
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('reports');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [isJsonContent, setIsJsonContent] = useState(false);

  // Track in-progress requests to prevent duplicates
  const pendingRequests = useRef<Record<string, boolean>>({});

  // Fetch dashboard structure
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetchDashboard(dashboardUid)
      .then((dashboardData) => {
        if (dashboardData) {
          setDashboard(dashboardData);
        }
        setLoading(false);
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
    const panelsToProcess = dashboard.panels.filter((panel: GrafanaPanel) =>
      isSupportedPanelType(panel.type),
    );

    Promise.all(
      panelsToProcess.map((panel: GrafanaPanel) => {
        const panelId = panel.id;
        const requestKey = `${dashboardUid}_${panelId}`;

        // Skip if this request is already in progress
        if (pendingRequests.current[requestKey]) {
          console.log(
            `[@component:ReportsGrafanaDashboardClient] Request already in progress for panel ${panelId}`,
          );
          return Promise.resolve({ panelId, data: null, skipped: true });
        }

        // Mark as pending
        pendingRequests.current[requestKey] = true;

        return fetchPanelData(dashboardUid, panel, dashboard.time)
          .then((data) => {
            // Clear pending flag
            delete pendingRequests.current[requestKey];
            return { panelId, data };
          })
          .catch((err) => {
            // Clear pending flag
            delete pendingRequests.current[requestKey];
            return { panelId, error: String(err) };
          });
      }),
    ).then((results) => {
      // Filter out skipped requests
      const validResults = results.filter((r: any) => !r.skipped);

      if (validResults.length > 0) {
        setPanelData((prevData) => {
          const newData = { ...prevData };
          validResults.forEach((result: any) => {
            if (result.data) {
              newData[result.panelId] = result.data;
            }
          });
          return newData;
        });
      }

      setDataLoading(false);
    });
  }, [dashboard, dashboardUid]);

  // Build the Grafana URL with proper parameters
  const getGrafanaUrl = () => {
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'https://automai.grafana.net';
    const baseUrl = `${grafanaUrl}/d/${dashboardUid}`;
    const params = new URLSearchParams({
      orgId: '1',
      from: 'now-7d',
      to: 'now',
      timezone: 'browser',
    });

    // Add team parameter if available
    if (teamDetails?.id) {
      params.append('var-team_name', teamDetails.id);
    }

    return `${baseUrl}?${params.toString()}`;
  };

  // Handle cell click for table modal
  const handleCellClick = (title: string, content: string, isJson: boolean) => {
    setModalTitle(title);
    setModalContent(content);
    setIsJsonContent(isJson);
    setModalOpen(true);
  };

  if (loading) {
    return <ChartLoadingIndicatorClient />;
  }

  if (error) {
    return <ChartErrorDisplayClient error={error} />;
  }

  if (!dashboard) {
    return <div className="text-muted-foreground text-center p-8">{t('no_dashboard_data')}</div>;
  }

  // Filter supported panels
  const supportedPanels = (dashboard.panels || []).filter((panel: GrafanaPanel) =>
    isSupportedPanelType(panel.type),
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {supportedPanels.length === 0 && (
        <div className="text-muted-foreground text-center col-span-2">
          {t('no_supported_panels')}
        </div>
      )}

      {supportedPanels.map((panel: GrafanaPanel) => (
        <Card key={panel.id} className={`mb-2 ${panel.type === 'table' ? 'col-span-2' : ''}`}>
          <CardContent className="pt-2 px-4 pb-2 flex flex-col items-center justify-center">
            <h3 className="text-lg font-medium">{panel.title}</h3>

            {dataLoading ? (
              <div className="text-muted-foreground">Loading panel data...</div>
            ) : (
              <>
                {panel.type === 'stat' && (
                  <StatPanelClient panel={panel} data={panelData[panel.id]} />
                )}

                {panel.type === 'bargauge' && <BargaugePanelClient data={panelData[panel.id]} />}

                {panel.type === 'barchart' && (
                  <BarChartPanelClient panel={panel} data={panelData[panel.id]} />
                )}

                {panel.type === 'timeseries' && (
                  <TimeSeriesPanelClient data={panelData[panel.id]} />
                )}

                {panel.type === 'table' && (
                  <TablePanelClient
                    panel={panel}
                    data={panelData[panel.id]}
                    onCellClick={handleCellClick}
                  />
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
          href={getGrafanaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline text-xs"
        >
          {t('open_in_grafana')}
        </a>
      </div>

      <CellContentModalClient
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        content={modalContent}
        isJson={isJsonContent}
      />
    </div>
  );
}
