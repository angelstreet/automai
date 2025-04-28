import { getFromCache, saveToCache } from './grafanaDataUtils';
import {
  GrafanaDashboard,
  GrafanaPanelData,
  SUPPORTED_PANEL_TYPES,
} from '@/types-new/grafana-constants';

// Function to fetch a Grafana dashboard by UID
export async function fetchDashboard(dashboardUid: string): Promise<GrafanaDashboard | null> {
  try {
    const response = await fetch(`/api/grafana-dashboard/${dashboardUid}`);
    const data = await response.json();

    if (data.error) {
      console.error(`[@utils:grafana-data] Error fetching dashboard: ${data.error}`);
      throw new Error(data.error);
    }

    return data.dashboard;
  } catch (error) {
    console.error(`[@utils:grafana-data] Error fetching dashboard:`, error);
    throw error;
  }
}

// Function to fetch data for a single panel
export async function fetchPanelData(
  dashboardUid: string,
  panel: { id: string | number; targets: any[] },
  timeRange?: { from: string; to: string },
): Promise<GrafanaPanelData> {
  const panelId = panel.id;

  // Check cache first
  const cachedData = getFromCache(dashboardUid, String(panelId));
  if (cachedData) {
    return cachedData;
  }

  try {
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

    const response = await fetch('/api/grafana-panel-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dashboardUid,
        panelId,
        queries: updatedQueries,
        timeRange,
      }),
    });

    const data = await response.json();

    // Save to cache
    saveToCache(dashboardUid, String(panelId), data);

    return data;
  } catch (error) {
    console.error(`[@utils:grafana-data] Error fetching panel data for ${panelId}:`, error);
    return { error: String(error) };
  }
}

// Function to fetch data for multiple panels
export async function fetchPanelsData(
  dashboardUid: string,
  dashboard: GrafanaDashboard,
): Promise<Record<string | number, GrafanaPanelData>> {
  // Filter supported panels
  const supportedPanels = dashboard.panels.filter((panel) =>
    SUPPORTED_PANEL_TYPES.includes(panel.type),
  );

  // Fetch data for each panel in parallel
  const results = await Promise.all(
    supportedPanels.map((panel) =>
      fetchPanelData(dashboardUid, panel, dashboard.time)
        .then((data) => ({ panelId: panel.id, data }))
        .catch((error) => ({ panelId: panel.id, error: String(error) })),
    ),
  );

  // Convert results to a map of panelId -> data
  const panelDataMap: Record<string | number, GrafanaPanelData> = {};

  results.forEach((result) => {
    if ('data' in result) {
      panelDataMap[result.panelId] = result.data;
    }
  });

  return panelDataMap;
}
