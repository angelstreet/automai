// Utility functions for processing Grafana data

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION_MS = 5 * 60 * 1000;

// Helper functions for cache management
export const getCacheKey = (dashboardUid: string, panelId: string) =>
  `grafana_${dashboardUid}_${panelId}`;

export const getFromCache = (dashboardUid: string, panelId: string) => {
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

export const saveToCache = (dashboardUid: string, panelId: string, data: any) => {
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
export const processTimeSeriesData = (panel: any, data: any) => {
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
export const getColorForIndex = (index: number) => {
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
export const processBargaugeData = (panel: any, data: any) => {
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
export const processTableData = (panel: any, data: any) => {
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
export const getStatusColorClass = (status: string): string => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('success') || statusLower === 'succeeded') {
    return 'text-green-600 dark:text-green-400';
  }
  if (statusLower.includes('fail') || statusLower === 'failed' || statusLower === 'error') {
    return 'text-red-600 dark:text-red-400';
  }
  if (statusLower.includes('pending') || statusLower === 'waiting') {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (
    statusLower.includes('progress') ||
    statusLower === 'in_progress' ||
    statusLower === 'running'
  ) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return '';
};
