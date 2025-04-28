import { ChartData, ChartOptions } from 'chart.js';
import { SUPPORTED_PANEL_TYPES } from '@/types-new/grafana-constants';

/**
 * Utility functions for rendering Grafana panels with Chart.js
 */

// Basic configuration for a stat panel (single value display)
export const getStatConfig = (panel: any): { value: number | string; title: string } => {
  // Return a default value if no data is available
  return {
    value: '',
    title: panel.title || 'Stat Panel',
  };
};

// Basic configuration for a bar chart panel
export const getBarChartConfig = (
  panel: any,
): { data: ChartData<'bar'>; options: ChartOptions<'bar'> } => {
  // Return an empty configuration if no real data is available
  const data = {
    labels: [],
    datasets: [
      {
        label: panel.title || 'Bar Chart',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };
  return { data, options };
};

// Updated configuration for a bar chart panel with fetched data
export const getUpdatedBarChartConfig = (
  panel: any,
  data: any,
): { data: ChartData<'bar'>; options: ChartOptions<'bar'> } => {
  // Default to placeholder if no data is available
  if (
    !data ||
    !data.results ||
    !data.results.A ||
    !data.results.A.frames ||
    !data.results.A.frames[0]
  ) {
    return getBarChartConfig(panel);
  }

  const frame = data.results.A.frames[0];
  const labels = frame.data.values[0] || [];
  const values = frame.data.values[1] || [];

  const chartData = {
    labels,
    datasets: [
      {
        label: panel.title || 'Bar Chart',
        data: values,
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return { data: chartData, options };
};

// Map Grafana panel types to our rendering functions
export const panelTypeToConfig = {
  stat: getStatConfig,
  barchart: getBarChartConfig,
  timeseries: getBarChartConfig, // Adding timeseries to use the same base config as barchart for now
  bargauge: getStatConfig, // Adding support for bargauge panel type
  table: getStatConfig, // Adding support for table panel type
  // Add other types like 'line', 'graph', 'table' in future iterations
};

// Check if a panel type is supported
export const isSupportedPanelType = (type: string): boolean => {
  return SUPPORTED_PANEL_TYPES.includes(type);
};
