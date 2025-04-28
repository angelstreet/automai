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
import { Bar, Line } from 'react-chartjs-2';

import { Card, CardContent } from '@/components/shadcn/card';
import {
  getStatConfig,
  isSupportedPanelType,
  getUpdatedBarChartConfig,
} from '@/lib/utils/grafanaChartUtils';

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

// Shared cache object outside component to persist across renders and tabs
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Helper functions for cache management
const getCacheKey = (dashboardUid: string, panelId: string) => `grafana_${dashboardUid}_${panelId}`;

const getFromCache = (dashboardUid: string, panelId: string) => {
  if (typeof window === 'undefined') return null;

  try {
    const key = getCacheKey(dashboardUid, panelId);
    const item = sessionStorage.getItem(key);

    if (!item) return null;

    const { data, timestamp } = JSON.parse(item);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp < CACHE_DURATION_MS) {
      console.log(
        `[@component:ReportsGrafanaDashboardClient] Using cached data for panel ${panelId}`,
      );
      return data;
    } else {
      console.log(`[@component:ReportsGrafanaDashboardClient] Cache expired for panel ${panelId}`);
      return null;
    }
  } catch (e) {
    console.error('[@component:ReportsGrafanaDashboardClient] Error retrieving from cache:', e);
    return null;
  }
};

const saveToCache = (dashboardUid: string, panelId: string, data: any) => {
  if (typeof window === 'undefined') return;

  try {
    const key = getCacheKey(dashboardUid, panelId);
    const item = JSON.stringify({
      data,
      timestamp: Date.now(),
    });

    sessionStorage.setItem(key, item);
  } catch (e) {
    console.error('[@component:ReportsGrafanaDashboardClient] Error saving to cache:', e);
  }
};

// Utility function to process time series data
const getTimeSeriesConfig = (_panel: any, data: any) => {
  const frames = data?.results?.A?.frames || [];
  if (!frames.length) {
    return {
      datasets: [],
      labels: [],
    };
  }

  const frame = frames[0];
  const fields = frame.schema.fields;
  const values = frame.data.values;

  // If timeseries doesn't have typical format, try to handle common variations
  if (fields.length < 2 || !values.length || values.length < 2) {
    console.warn(
      '[@component:ReportsGrafanaDashboardClient] Time series data has unexpected format',
    );
    return {
      datasets: [],
      labels: [],
    };
  }

  try {
    // Handle SQL timeseries panel data format
    // Typically: Date field, Status field, Count field
    let timeValues = values[0] || [];
    let labels = [];

    // Try to format date labels
    if (fields[0].name.toLowerCase().includes('date')) {
      labels = timeValues.map((ts: any) => {
        if (typeof ts === 'string') {
          return new Date(ts).toLocaleDateString();
        } else if (typeof ts === 'number') {
          return new Date(ts).toLocaleDateString();
        }
        return String(ts);
      });
    } else {
      labels = timeValues.map((v: any) => String(v));
    }

    // Group datasets by status field (if available)
    const datasets = [];
    const statusIndex = fields.findIndex((f: any) => f.name.toLowerCase() === 'status');
    const countIndex = fields.findIndex((f: any) => f.name.toLowerCase().includes('count'));

    if (statusIndex !== -1 && countIndex !== -1 && values.length > countIndex) {
      // Group by status
      const statusValues = values[statusIndex];
      const countValues = values[countIndex];
      const uniqueStatuses = [...new Set(statusValues)];

      // Create a dataset for each status
      uniqueStatuses.forEach((status, idx) => {
        const color = getColorForIndex(idx);
        const dataPoints = Array(labels.length).fill(0);

        // Map count values to their respective time slots
        for (let i = 0; i < statusValues.length; i++) {
          if (statusValues[i] === status) {
            const timeLabel = labels.indexOf(
              timeValues[i] instanceof Date
                ? timeValues[i].toLocaleDateString()
                : new Date(timeValues[i]).toLocaleDateString(),
            );
            if (timeLabel !== -1) {
              dataPoints[timeLabel] = countValues[i];
            }
          }
        }

        datasets.push({
          label: String(status),
          data: dataPoints,
          borderColor: color,
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
          fill: false,
        });
      });
    } else {
      // Fallback for simple time series
      for (let i = 1; i < fields.length; i++) {
        const color = getColorForIndex(i - 1);
        datasets.push({
          label: fields[i].name,
          data: values[i] || [],
          borderColor: color,
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
          fill: false,
        });
      }
    }

    return {
      labels,
      datasets,
    };
  } catch (error) {
    console.error(
      '[@component:ReportsGrafanaDashboardClient] Error processing time series data:',
      error,
    );
    return {
      datasets: [],
      labels: [],
    };
  }
};

// Helper to generate consistent colors
const getColorForIndex = (index: number) => {
  const colors = [
    'rgb(75, 192, 192)', // teal
    'rgb(255, 99, 132)', // red
    'rgb(54, 162, 235)', // blue
    'rgb(255, 206, 86)', // yellow
    'rgb(153, 102, 255)', // purple
    'rgb(255, 159, 64)', // orange
  ];
  return colors[index % colors.length];
};

// Utility function to handle bargauge panel data
const getBargaugeValue = (_panel: any, data: any) => {
  try {
    const frames = data?.results?.A?.frames;
    if (!frames || !frames.length) return 'No data';

    const frame = frames[0];
    const fieldValues = frame.data.values;

    // For bar gauge panels, typically:
    // First field is the name/category (index 0)
    // Second field is the numeric value (index 1)
    if (fieldValues && fieldValues.length >= 2) {
      // Sometimes bar gauge shows a configuration name and its value
      // Return the numeric value (typically second column)
      return fieldValues[1][0];
    }

    // If there's only one value, return it
    if (fieldValues && fieldValues.length === 1) {
      return fieldValues[0][0];
    }

    return 'No data';
  } catch (error) {
    console.error(
      '[@component:ReportsGrafanaDashboardClient] Error processing bargauge data:',
      error,
    );
    return 'Error';
  }
};

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

  // Track in-progress requests to prevent duplicates
  const pendingRequests = useRef<Record<string, boolean>>({});

  // Fetch dashboard structure
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

  // Fetch data for each panel once dashboard is loaded
  useEffect(() => {
    if (!dashboard || !dashboard.panels) return;

    setDataLoading(true);
    const panelsToProcess = dashboard.panels.filter((panel: any) =>
      isSupportedPanelType(panel.type),
    );

    Promise.all(
      panelsToProcess.map((panel: any) => {
        const panelId = panel.id;
        const requestKey = `${dashboardUid}_${panelId}`;

        // Skip if this request is already in progress
        if (pendingRequests.current[requestKey]) {
          console.log(
            `[@component:ReportsGrafanaDashboardClient] Request already in progress for panel ${panelId}`,
          );
          return Promise.resolve({ panelId, data: null, skipped: true });
        }

        // Check cache first
        const cachedData = getFromCache(dashboardUid, panelId);
        if (cachedData) {
          return Promise.resolve({ panelId, data: cachedData });
        }

        // Mark as pending
        pendingRequests.current[requestKey] = true;

        // Ensure each query has the correct datasource information
        const updatedQueries = panel.targets.map((query: any) => {
          if (!query.datasource || query.datasource.uid === 'unknown') {
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
            panelId,
            queries: updatedQueries,
            timeRange: dashboard.time,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            // Save to cache
            saveToCache(dashboardUid, panelId, data);

            // Clear pending flag
            delete pendingRequests.current[requestKey];

            return { panelId, data };
          })
          .catch((err) => {
            console.error(
              `[@component:ReportsGrafanaDashboardClient] Error fetching data for panel ${panelId}:`,
              err,
            );

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
              newData[result.panelId] = result;
            }
          });
          return newData;
        });
      }

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
          <CardContent className="pt-2 px-4 pb-2 flex flex-col items-center justify-center">
            <h3 className="text-lg font-medium">{panel.title}</h3>
            {dataLoading ? (
              <div className="text-muted-foreground">Loading panel data...</div>
            ) : (
              <>
                {panel.type === 'stat' && (
                  <div className="text-2xl font-medium mt-2">
                    {panelData[panel.id]?.data?.results?.A?.frames?.[0]?.data?.values?.[0]?.[0] ??
                      getStatConfig(panel).value}
                  </div>
                )}
                {panel.type === 'bargauge' && (
                  <div className="text-2xl font-medium mt-2">
                    {getBargaugeValue(panel, panelData[panel.id]?.data)}
                  </div>
                )}
                {panel.type === 'barchart' && (
                  <div style={{ height: '200px' }}>
                    <Bar {...getUpdatedBarChartConfig(panel, panelData[panel.id]?.data)} />
                  </div>
                )}
                {panel.type === 'timeseries' && (
                  <div style={{ height: '200px' }}>
                    <Line
                      data={getTimeSeriesConfig(panel, panelData[panel.id]?.data)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                          },
                        },
                      }}
                    />
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
