import { ChartData, ChartOptions } from 'chart.js';

/**
 * Utility functions for rendering Grafana panels with Chart.js
 */

// Basic configuration for a stat panel (single value display)
export const getStatConfig = (panel: any): { value: number | string; title: string } => {
  // For preview, since we don't have actual data, we'll use placeholder
  // In a full implementation, this would extract data from panel.targets or a separate data API call
  return {
    value: 'N/A (Preview)',
    title: panel.title || 'Stat Panel',
  };
};

// Basic configuration for a bar chart panel
export const getBarChartConfig = (
  panel: any,
): { data: ChartData<'bar'>; options: ChartOptions<'bar'> } => {
  // Placeholder data for preview
  // In full implementation, this would map data from panel.targets response
  const labels = ['Placeholder 1', 'Placeholder 2', 'Placeholder 3'];
  const data = {
    labels,
    datasets: [
      {
        label: panel.title || 'Bar Chart',
        data: [10, 20, 30],
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

// Map Grafana panel types to our rendering functions
export const panelTypeToConfig = {
  stat: getStatConfig,
  barchart: getBarChartConfig,
  // Add other types like 'line', 'graph', 'table' in future iterations
};

// Check if a panel type is supported
export const isSupportedPanelType = (type: string): boolean => {
  return type in panelTypeToConfig;
};
