export interface GrafanaPanelData {
  results?: {
    A?: {
      frames?: Array<{
        schema: {
          fields: Array<{
            name: string;
            config?: any;
          }>;
        };
        data: {
          values: any[][];
        };
      }>;
    };
  };
  error?: string;
}

export interface GrafanaPanel {
  id: string | number;
  title: string;
  type: string;
  targets: any[];
  options?: any;
}

export interface GrafanaDashboard {
  uid: string;
  panels: GrafanaPanel[];
  time?: {
    from: string;
    to: string;
  };
}

// Cache configuration
export const GRAFANA_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Panel types that are supported for rendering
export const SUPPORTED_PANEL_TYPES = ['stat', 'bargauge', 'barchart', 'timeseries', 'table'];

// Color palette for charts
export const CHART_COLORS = [
  'rgb(75, 192, 192)', // teal
  'rgb(255, 99, 132)', // red
  'rgb(54, 162, 235)', // blue
  'rgb(255, 206, 86)', // yellow
  'rgb(153, 102, 255)', // purple
  'rgb(255, 159, 64)', // orange
];

// Dashboard UIDs
export const DASHBOARD_UIDS = {
  configOverview: '565c9d0e-1c43-424e-8705-623ee13c51df',
  executionMetrics: '558a7504-0f4e-45b7-9662-5dd43f382a87',
  executionDetails: '5be5172d-0105-4bd9-b5a6-8f1dfe4c5536',
};
