'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog';
import { cn } from '@/lib/utils';

// Custom hook for fetching Render health status
function useRenderHealth() {
  const [health, setHealth] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        console.log('[@component:DeploymentFooterClient] Fetching Render health status');
        setLoading(true);
        const response = await fetch('/api/render-health');
        if (!response.ok) {
          throw new Error(`Health check failed with status: ${response.status}`);
        }
        const data = await response.json();
        setHealth(data);
        console.log(
          '[@component:DeploymentFooterClient] Render health status fetched:',
          data.message,
        );
      } catch (err: any) {
        console.error(
          '[@component:DeploymentFooterClient] Error fetching Render health:',
          err.message,
        );
        setError(err.message || 'Failed to fetch health status');
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return { health, loading, error };
}

// Custom hook for fetching Render logs
function useRenderLogs(fetchOnDemand: boolean) {
  const [logs, setLogs] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      console.log('[@component:DeploymentFooterClient] Fetching Render logs');
      setLoading(true);
      setError(null);
      const response = await fetch('/api/render-logs');
      if (!response.ok) {
        throw new Error(`Logs fetch failed with status: ${response.status}`);
      }
      const data = await response.json();
      setLogs(data.data);
      console.log('[@component:DeploymentFooterClient] Render logs fetched successfully');
      return data.data;
    } catch (err: any) {
      console.error('[@component:DeploymentFooterClient] Error fetching Render logs:', err.message);
      setError(err.message || 'Failed to fetch logs');
      setLogs(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fetchOnDemand) {
      fetchLogs();
    }
  }, [fetchOnDemand]);

  return { logs, loading, error, fetchLogs };
}

export function DeploymentFooterClient() {
  const { health, loading: healthLoading } = useRenderHealth();
  const [modalOpen, setModalOpen] = useState(false);
  const { logs, loading: logsLoading, error: logsError, fetchLogs } = useRenderLogs(modalOpen);

  // Determine status dot color based on health response
  const isHealthy = health && health.success;
  const statusColor = healthLoading ? 'bg-gray-400' : isHealthy ? 'bg-green-500' : 'bg-red-500';

  return (
    <footer className="flex items-center justify-end p-4 border-t border-gray-200">
      <div className="flex items-center space-x-2">
        <span className={cn('w-3 h-3 rounded-full', statusColor)} />
        <span className="text-sm text-gray-600">
          {healthLoading ? 'Checking Render...' : health?.message || 'Render Status Unknown'}
        </span>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Render Logs
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Render Logs for automai-ssh-worker</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {logsLoading ? (
                <p className="text-gray-500">Loading logs...</p>
              ) : logsError ? (
                <p className="text-red-500">Error: {logsError}</p>
              ) : logs ? (
                <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(logs, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-500">No logs available. Click to refresh.</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => fetchLogs()}
                variant="secondary"
                size="sm"
                disabled={logsLoading}
              >
                Refresh Logs
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </footer>
  );
}
