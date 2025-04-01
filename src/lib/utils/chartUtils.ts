/**
 * Chart Utilities
 * Utilities for creating and formatting chart data
 */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
if (typeof window !== 'undefined') {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
}

/**
 * Chart data point interface
 */
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
}

/**
 * Chart dataset interface
 */
export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  color?: string;
}

/**
 * Color palette for charts
 */
export const CHART_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#dc2626', // Red
  '#ca8a04', // Yellow
  '#9333ea', // Purple
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#059669', // Emerald
];

/**
 * Generate random color from the palette
 */
export function getRandomColor(): string {
  return CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)];
}

/**
 * Format number with appropriate suffix (K, M, B)
 */
export function formatNumber(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toString();
}

/**
 * Generate chart data for time series
 */
export function generateTimeSeriesData(
  data: { timestamp: string | Date; value: number }[],
  label: string,
  color?: string
): ChartDataset {
  return {
    label,
    data: data.map(point => ({
      x: typeof point.timestamp === 'string' ? new Date(point.timestamp) : point.timestamp,
      y: point.value,
    })),
    color: color || getRandomColor(),
  };
}

/**
 * Format date for charts based on the date range
 */
export function formatChartDate(date: Date, range: 'day' | 'week' | 'month' | 'year'): string {
  switch (range) {
    case 'day':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'week':
      return date.toLocaleDateString([], { weekday: 'short' });
    case 'month':
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    case 'year':
      return date.toLocaleDateString([], { month: 'short' });
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Generate random data for a chart
 */
export function generateRandomChartData(
  count: number,
  min: number = 0,
  max: number = 100,
  label: string = 'Random Data',
  color?: string
): ChartDataset {
  const data: ChartDataPoint[] = [];
  
  for (let i = 0; i < count; i++) {
    data.push({
      x: i,
      y: Math.floor(Math.random() * (max - min + 1)) + min,
    });
  }
  
  return {
    label,
    data,
    color: color || getRandomColor(),
  };
}

/**
 * Generate data for a pie chart
 */
export function generatePieChartData(
  labels: string[],
  values: number[],
  colors?: string[]
): { labels: string[]; data: number[]; colors: string[] } {
  if (labels.length !== values.length) {
    throw new Error('Labels and values arrays must have the same length');
  }
  
  const generatedColors = colors || labels.map(() => getRandomColor());
  
  return {
    labels,
    data: values,
    colors: generatedColors,
  };
}

/**
 * Group time series data by time period
 */
export function groupTimeSeriesByPeriod(
  data: { timestamp: string | Date; value: number }[],
  period: 'hour' | 'day' | 'week' | 'month'
): { timestamp: Date; value: number }[] {
  // Convert string timestamps to Date objects
  const dates = data.map(point => ({
    timestamp: typeof point.timestamp === 'string' ? new Date(point.timestamp) : point.timestamp,
    value: point.value,
  }));
  
  // Group by the specified period
  const groupedData: Record<string, number[]> = {};
  
  dates.forEach(point => {
    let key: string;
    
    switch (period) {
      case 'hour':
        key = new Date(
          point.timestamp.getFullYear(),
          point.timestamp.getMonth(),
          point.timestamp.getDate(),
          point.timestamp.getHours()
        ).toISOString();
        break;
      case 'day':
        key = new Date(
          point.timestamp.getFullYear(),
          point.timestamp.getMonth(),
          point.timestamp.getDate()
        ).toISOString();
        break;
      case 'week':
        // Get the start of the week (Sunday)
        const day = point.timestamp.getDay(); // 0 = Sunday, 6 = Saturday
        const diff = point.timestamp.getDate() - day;
        key = new Date(
          point.timestamp.getFullYear(),
          point.timestamp.getMonth(),
          diff
        ).toISOString();
        break;
      case 'month':
        key = new Date(
          point.timestamp.getFullYear(),
          point.timestamp.getMonth(),
          1
        ).toISOString();
        break;
      default:
        key = point.timestamp.toISOString();
    }
    
    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    
    groupedData[key].push(point.value);
  });
  
  // Calculate the average for each group
  return Object.entries(groupedData).map(([key, values]) => ({
    timestamp: new Date(key),
    value: values.reduce((sum, value) => sum + value, 0) / values.length,
  })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// Export chart utility functions
const chartUtils = {
  CHART_COLORS,
  getRandomColor,
  formatNumber,
  generateTimeSeriesData,
  formatChartDate,
  generateRandomChartData,
  generatePieChartData,
  groupTimeSeriesByPeriod,
};

export default chartUtils;