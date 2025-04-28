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

import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
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

// Utility function to process table data
const getTableData = (_panel: any, data: any) => {
  try {
    const frames = data?.results?.A?.frames;
    if (!frames || !frames.length) {
      return {
        headers: [],
        rows: [],
      };
    }

    const frame = frames[0];
    const fields = frame.schema.fields || [];
    const values = frame.data.values || [];

    // Extract headers from fields
    const headers = fields.map((field: any) => ({
      name: field.name,
      config: field.config || {},
    }));

    // Transform column-oriented data to row-oriented for table display
    const rows = [];
    if (values.length > 0 && values[0].length > 0) {
      // Find time/date column index if exists
      const timeColumnIndex = fields.findIndex(
        (field: any) =>
          field.name.toLowerCase() === 'time' ||
          field.name.toLowerCase().includes('date') ||
          field.name.toLowerCase().includes('created'),
      );

      for (let rowIndex = 0; rowIndex < values[0].length; rowIndex++) {
        const row: any[] = [];
        for (let colIndex = 0; colIndex < values.length; colIndex++) {
          // Format the value based on field type if needed
          let value = values[colIndex][rowIndex];

          // Format special values (dates, percentages, etc.)
          const fieldConfig = headers[colIndex]?.config;

          // Special formatting for timestamp/date columns
          if (colIndex === timeColumnIndex && value) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                // Format as "YYYY-MM-DD HH:MM:SS"
                value = date.toLocaleString();
              }
            } catch {
              // Keep original value if date parsing fails
            }
          } else if (fieldConfig?.unit === 'percent') {
            value = `${parseFloat(value).toFixed(2)}%`;
          } else if (fieldConfig?.unit?.includes('time') && typeof value === 'number') {
            // Format timestamps if needed
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              value = date.toLocaleString();
            }
          }

          row.push(value);
        }
        rows.push(row);
      }

      // If we found a time column, sort rows by that column (most recent first)
      if (timeColumnIndex !== -1) {
        rows.sort((a, b) => {
          const dateA = new Date(a[timeColumnIndex]);
          const dateB = new Date(b[timeColumnIndex]);

          // Check if both are valid dates
          if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            return dateB.getTime() - dateA.getTime(); // Most recent first
          }
          return 0;
        });
      }
    }

    return {
      headers,
      rows,
    };
  } catch (error) {
    console.error('[@component:ReportsGrafanaDashboardClient] Error processing table data:', error);
    return {
      headers: [],
      rows: [],
    };
  }
};

// Add a helper function for status color mapping
const getStatusColorClass = (status: string): string => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('success') || statusLower === 'succeeded') {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  }
  if (statusLower.includes('fail') || statusLower === 'failed' || statusLower === 'error') {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  }
  if (statusLower.includes('pending') || statusLower === 'waiting') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  }
  if (
    statusLower.includes('progress') ||
    statusLower === 'in_progress' ||
    statusLower === 'running'
  ) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
  }
  return '';
};

interface ReportsGrafanaDashboardClientProps {
  dashboardUid: string;
}

// Modal component for displaying cell content
const CellContentModal = ({
  isOpen,
  onClose,
  title,
  content,
  isJson = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  isJson?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  // Format JSON content for better readability if needed
  const formattedContent = isJson
    ? (() => {
        try {
          return JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          return content;
        }
      })()
    : content;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-4 max-h-[50vh]">
          <pre className="text-sm p-4 bg-gray-100 dark:bg-gray-900 rounded overflow-auto whitespace-pre-wrap break-words">
            {formattedContent}
          </pre>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button onClick={copyToClipboard}>{copied ? 'Copied!' : 'Copy to Clipboard'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function ReportsGrafanaDashboardClient({
  dashboardUid,
}: ReportsGrafanaDashboardClientProps) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [panelData, setPanelData] = useState<Record<string, any>>({});
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
        <Card key={panel.id} className={`mb-2 ${panel.type === 'table' ? 'col-span-2' : ''}`}>
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
                {panel.type === 'table' && (
                  <div className="w-full overflow-auto max-h-[350px] mt-2">
                    {(() => {
                      const tableData = getTableData(panel, panelData[panel.id]?.data);
                      if (tableData.headers.length === 0 || tableData.rows.length === 0) {
                        return <div className="text-muted-foreground">No data available</div>;
                      }

                      return (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {tableData.headers.map((header: any, i: number) => (
                                <TableHead key={i} className="whitespace-nowrap">
                                  {header.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableData.rows.map((row: any[], rowIndex: number) => (
                              <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex: number) => {
                                  // Format different cell contents based on type
                                  const content =
                                    cell !== null && cell !== undefined ? String(cell) : '';
                                  const isJSON = content.startsWith('{') && content.endsWith('}');
                                  const isLongText = content.length > 60;

                                  // Check if this cell is a status cell
                                  const headerName =
                                    tableData.headers[cellIndex]?.name.toLowerCase() || '';
                                  const isStatusCell =
                                    headerName === 'status' || headerName.includes('status');

                                  // For status cells, apply appropriate color coding
                                  if (isStatusCell) {
                                    const statusColorClass = getStatusColorClass(content);
                                    return (
                                      <TableCell
                                        key={cellIndex}
                                        className={`whitespace-nowrap font-medium text-center rounded-md px-2 py-1 ${statusColorClass}`}
                                      >
                                        {content}
                                      </TableCell>
                                    );
                                  }

                                  // For JSON content
                                  if (isJSON) {
                                    try {
                                      // Try to parse and format JSON
                                      const jsonObj = JSON.parse(content);
                                      const formattedContent = Object.entries(jsonObj)
                                        .map(
                                          ([key, value]) =>
                                            `${key}: ${String(value).substring(0, 20)}${String(value).length > 20 ? '...' : ''}`,
                                        )
                                        .join(', ');

                                      return (
                                        <TableCell
                                          key={cellIndex}
                                          className="max-w-[300px] truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                          title="Click to view full content"
                                          onClick={() => {
                                            setModalTitle(
                                              `${panel.title} - ${tableData.headers[cellIndex]?.name || 'Output'}`,
                                            );
                                            setModalContent(content);
                                            setIsJsonContent(true);
                                            setModalOpen(true);
                                          }}
                                        >
                                          {`{${formattedContent.substring(0, 30)}${formattedContent.length > 30 ? '...' : ''}}`}
                                        </TableCell>
                                      );
                                    } catch {
                                      // Fallback if JSON parsing fails
                                      return (
                                        <TableCell
                                          key={cellIndex}
                                          className="max-w-[300px] truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                          title="Click to view full content"
                                          onClick={() => {
                                            setModalTitle(
                                              `${panel.title} - ${tableData.headers[cellIndex]?.name || 'Output'}`,
                                            );
                                            setModalContent(content);
                                            setIsJsonContent(false);
                                            setModalOpen(true);
                                          }}
                                        >
                                          {content.substring(0, 30)}...
                                        </TableCell>
                                      );
                                    }
                                  }

                                  // For long text content
                                  if (isLongText) {
                                    return (
                                      <TableCell
                                        key={cellIndex}
                                        className="max-w-[300px] truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                        title="Click to view full content"
                                        onClick={() => {
                                          setModalTitle(
                                            `${panel.title} - ${tableData.headers[cellIndex]?.name || 'Content'}`,
                                          );
                                          setModalContent(content);
                                          setIsJsonContent(false);
                                          setModalOpen(true);
                                        }}
                                      >
                                        {content.substring(0, 30)}...
                                      </TableCell>
                                    );
                                  }

                                  // For normal content
                                  return (
                                    <TableCell key={cellIndex} className="whitespace-nowrap">
                                      {content}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      );
                    })()}
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
      <CellContentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        content={modalContent}
        isJson={isJsonContent}
      />
    </div>
  );
}
