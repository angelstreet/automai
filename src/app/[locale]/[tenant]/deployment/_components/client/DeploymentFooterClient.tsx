'use client';

import { RefreshCw, Copy, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { cn } from '@/lib/utils';

// Custom hook for fetching Render health
function useRenderHealth(type: 'main' | 'python') {
  const [health, setHealth] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        console.log(`[@component:DeploymentFooterClient] Fetching Render ${type} health status`);
        setLoading(true);
        const response = await fetch(`/api/render-health/${type}`);
        if (!response.ok) {
          throw new Error(`Health check failed with status: ${response.status}`);
        }
        const data = await response.json();
        setHealth(data);
        console.log(
          `[@component:DeploymentFooterClient] Render ${type} health status fetched:`,
          data.message,
        );
      } catch (err: any) {
        console.error(
          `[@component:DeploymentFooterClient] Error fetching Render ${type} health:`,
          err.message,
        );
        setError(err.message || 'Failed to fetch health status');
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [type]);

  return { health, loading, error };
}

// Custom hook for fetching Render logs
function useRenderLogs(type: 'main' | 'python', fetchOnDemand: boolean) {
  const [logs, setLogs] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchLogs = useCallback(async () => {
    // Prevent duplicate fetches if already loading or already fetched
    if (loading || (hasFetched && logs)) {
      return logs;
    }

    try {
      console.log(`[@component:DeploymentFooterClient] Fetching Render ${type} logs`);
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/render-logs/${type}`);
      if (!response.ok) {
        throw new Error(`Logs fetch failed with status: ${response.status}`);
      }
      const data = await response.json();
      setLogs(data.data);
      setHasFetched(true);
      console.log(`[@component:DeploymentFooterClient] Render ${type} logs fetched successfully`);
      return data.data;
    } catch (err: any) {
      console.error(
        `[@component:DeploymentFooterClient] Error fetching Render ${type} logs:`,
        err.message,
      );
      setError(err.message || 'Failed to fetch logs');
      setLogs(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [type, loading, logs, hasFetched]);

  useEffect(() => {
    let _isMounted = true;

    if (fetchOnDemand && !hasFetched) {
      fetchLogs();
    }

    return () => {
      _isMounted = false;
    };
  }, [fetchOnDemand, fetchLogs, hasFetched]);

  // Clear state when modal closes
  useEffect(() => {
    if (!fetchOnDemand) {
      // Keep the data in cache for performance, but reset loading state
      setLoading(false);
    }
  }, [fetchOnDemand]);

  return { logs, loading, error, fetchLogs };
}

// Custom hook for fetching Upstash Redis health
function useUpstashHealth() {
  const [health, setHealth] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        console.log(`[@component:DeploymentFooterClient] Fetching Upstash Redis health status`);
        setLoading(true);
        const response = await fetch(`/api/upstash-health`);
        if (!response.ok) {
          throw new Error(`Health check failed with status: ${response.status}`);
        }
        const data = await response.json();
        setHealth(data);
        console.log(
          `[@component:DeploymentFooterClient] Upstash Redis health status fetched:`,
          data.message,
        );
      } catch (err: any) {
        console.error(
          `[@component:DeploymentFooterClient] Error fetching Upstash Redis health:`,
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

// Custom hook for fetching Upstash Redis logs
function useUpstashLogs(fetchOnDemand: boolean) {
  const [logs, setLogs] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchLogs = useCallback(async () => {
    // Prevent duplicate fetches if already loading or already fetched
    if (loading || (hasFetched && logs)) {
      return logs;
    }

    try {
      console.log(`[@component:DeploymentFooterClient] Fetching Upstash Redis logs`);
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/upstash-logs`);
      if (!response.ok) {
        throw new Error(`Logs fetch failed with status: ${response.status}`);
      }
      const data = await response.json();
      setLogs(data.data);
      setHasFetched(true);
      console.log(`[@component:DeploymentFooterClient] Upstash Redis logs fetched successfully`);
      return data.data;
    } catch (err: any) {
      console.error(
        `[@component:DeploymentFooterClient] Error fetching Upstash Redis logs:`,
        err.message,
      );
      setError(err.message || 'Failed to fetch logs');
      setLogs(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading, logs, hasFetched]);

  useEffect(() => {
    let _isMounted = true;

    if (fetchOnDemand && !hasFetched) {
      fetchLogs();
    }

    return () => {
      _isMounted = false;
    };
  }, [fetchOnDemand, fetchLogs, hasFetched]);

  // Clear state when modal closes
  useEffect(() => {
    if (!fetchOnDemand) {
      // Keep the data in cache for performance, but reset loading state
      setLoading(false);
    }
  }, [fetchOnDemand]);

  return { logs, loading, error, fetchLogs };
}

export function DeploymentFooterClient() {
  const { health: mainHealth, loading: mainHealthLoading } = useRenderHealth('main');
  const { health: slaveHealth, loading: slaveHealthLoading } = useRenderHealth('python');
  const { health: upstashHealth, loading: upstashHealthLoading } = useUpstashHealth();
  const [mainModalOpen, setMainModalOpen] = useState(false);
  const [slaveModalOpen, setSlaveModalOpen] = useState(false);
  const [upstashModalOpen, setUpstashModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Data states for each service
  const [mainLogs, setMainLogs] = useState<any>(null);
  const [mainLogsLoading, setMainLogsLoading] = useState(false);
  const [mainLogsError, setMainLogsError] = useState<string | null>(null);

  const [slaveLogs, setSlaveLogs] = useState<any>(null);
  const [slaveLogsLoading, setSlaveLogsLoading] = useState(false);
  const [slaveLogsError, setSlaveLogsError] = useState<string | null>(null);

  const [upstashLogs, setUpstashLogs] = useState<any>(null);
  const [upstashLogsLoading, setUpstashLogsLoading] = useState(false);
  const [upstashLogsError, setUpstashLogsError] = useState<string | null>(null);

  const t = useTranslations('deployment');

  // Determine status dot colors for all services
  const isMainHealthy = mainHealth && mainHealth.success;
  const isSlaveHealthy = slaveHealth && slaveHealth.success;
  const isUpstashHealthy = upstashHealth && upstashHealth.success;

  const mainStatusColor = mainHealthLoading
    ? 'bg-yellow-500 animate-blink'
    : isMainHealthy
      ? 'bg-green-500'
      : 'bg-red-500';

  const slaveStatusColor = slaveHealthLoading
    ? 'bg-yellow-500 animate-blink'
    : isSlaveHealthy
      ? 'bg-green-500'
      : 'bg-red-500';

  const upstashStatusColor = upstashHealthLoading
    ? 'bg-yellow-500 animate-blink'
    : isUpstashHealthy
      ? 'bg-green-500'
      : 'bg-red-500';

  // Function to copy logs to clipboard
  const copyLogs = (logs: any) => {
    if (logs) {
      navigator.clipboard
        .writeText(JSON.stringify(logs, null, 2))
        .then(() => {
          setCopied(true);
          console.log('[@component:DeploymentFooterClient] Logs copied to clipboard');
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error('[@component:DeploymentFooterClient] Failed to copy logs:', err);
        });
    }
  };

  // Parse logs to extract only timestamps and messages
  const parseLogsForDisplay = (logs: any) => {
    if (!logs) return '';

    try {
      // Check if logs.logs is an array (assuming the API response structure)
      if (logs.logs && Array.isArray(logs.logs)) {
        // Extract and format timestamp and message from each log entry
        return logs.logs
          .map((log: any) => {
            // Format the timestamp as DD/MM/YYYY, HH:MM:SS
            let timestamp = 'Unknown time';
            if (log.timestamp) {
              const date = new Date(log.timestamp);
              timestamp = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
                .toString()
                .padStart(2, '0')}/${date.getFullYear()}, ${date
                .getHours()
                .toString()
                .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
                .getSeconds()
                .toString()
                .padStart(2, '0')}`;
            }

            // Get the message
            const message = log.message || 'No message';

            // Return formatted log entry
            return `${timestamp}\n${message}`;
          })
          .join('\n\n');
      }

      // Fallback for unexpected log structure
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('[@component:DeploymentFooterClient] Error parsing logs:', error);
      return JSON.stringify(logs, null, 2);
    }
  };

  // Fetch handlers for each service - these fetch data THEN open the modal
  const fetchMainLogs = async () => {
    try {
      console.log(
        '[@component:DeploymentFooterClient] Fetching Render Main logs before opening modal',
      );
      setMainLogsLoading(true);
      setMainLogsError(null);

      const response = await fetch('/api/render-logs/main');
      if (!response.ok) {
        throw new Error(`Logs fetch failed with status: ${response.status}`);
      }

      const data = await response.json();
      setMainLogs(data.data);
      console.log('[@component:DeploymentFooterClient] Render Main logs fetched successfully');

      // Only open modal after data is fetched
      setMainModalOpen(true);
    } catch (err: any) {
      console.error(
        '[@component:DeploymentFooterClient] Error fetching Render Main logs:',
        err.message,
      );
      setMainLogsError(err.message || 'Failed to fetch logs');
      setMainLogs(null);
    } finally {
      setMainLogsLoading(false);
    }
  };

  const fetchSlaveLogs = async () => {
    try {
      console.log(
        '[@component:DeploymentFooterClient] Fetching Render Python logs before opening modal',
      );
      setSlaveLogsLoading(true);
      setSlaveLogsError(null);

      const response = await fetch('/api/render-logs/python');
      if (!response.ok) {
        throw new Error(`Logs fetch failed with status: ${response.status}`);
      }

      const data = await response.json();
      setSlaveLogs(data.data);
      console.log('[@component:DeploymentFooterClient] Render Python logs fetched successfully');

      // Only open modal after data is fetched
      setSlaveModalOpen(true);
    } catch (err: any) {
      console.error(
        '[@component:DeploymentFooterClient] Error fetching Render Python logs:',
        err.message,
      );
      setSlaveLogsError(err.message || 'Failed to fetch logs');
      setSlaveLogs(null);
    } finally {
      setSlaveLogsLoading(false);
    }
  };

  const fetchUpstashLogs = async () => {
    try {
      console.log(
        '[@component:DeploymentFooterClient] Fetching Upstash Redis logs before opening modal',
      );
      setUpstashLogsLoading(true);
      setUpstashLogsError(null);

      const response = await fetch('/api/upstash-logs');
      if (!response.ok) {
        throw new Error(`Logs fetch failed with status: ${response.status}`);
      }

      const data = await response.json();
      setUpstashLogs(data.data);
      console.log('[@component:DeploymentFooterClient] Upstash Redis logs fetched successfully');

      // Only open modal after data is fetched
      setUpstashModalOpen(true);
    } catch (err: any) {
      console.error(
        '[@component:DeploymentFooterClient] Error fetching Upstash Redis logs:',
        err.message,
      );
      setUpstashLogsError(err.message || 'Failed to fetch logs');
      setUpstashLogs(null);
    } finally {
      setUpstashLogsLoading(false);
    }
  };

  // Refresh handlers - only for the refresh button inside the modal
  const refreshMainLogs = async () => {
    try {
      console.log('[@component:DeploymentFooterClient] Refreshing Render Main logs');
      setMainLogsLoading(true);
      setMainLogsError(null);

      const response = await fetch('/api/render-logs/main');
      if (!response.ok) {
        throw new Error(`Logs fetch failed with status: ${response.status}`);
      }

      const data = await response.json();
      setMainLogs(data.data);
      console.log('[@component:DeploymentFooterClient] Render Main logs refreshed successfully');
    } catch (err: any) {
      console.error(
        '[@component:DeploymentFooterClient] Error refreshing Render Main logs:',
        err.message,
      );
      setMainLogsError(err.message || 'Failed to fetch logs');
    } finally {
      setMainLogsLoading(false);
    }
  };

  const refreshSlaveLogs = async () => {
    try {
      console.log('[@component:DeploymentFooterClient] Refreshing Render Python logs');
      setSlaveLogsLoading(true);
      setSlaveLogsError(null);

      const response = await fetch('/api/render-logs/python');
      if (!response.ok) {
        throw new Error(`Logs fetch failed with status: ${response.status}`);
      }

      const data = await response.json();
      setSlaveLogs(data.data);
      console.log('[@component:DeploymentFooterClient] Render Python logs refreshed successfully');
    } catch (err: any) {
      console.error(
        '[@component:DeploymentFooterClient] Error refreshing Render Python logs:',
        err.message,
      );
      setSlaveLogsError(err.message || 'Failed to fetch logs');
    } finally {
      setSlaveLogsLoading(false);
    }
  };

  const refreshUpstashLogs = async () => {
    try {
      console.log('[@component:DeploymentFooterClient] Refreshing Upstash Redis logs');
      setUpstashLogsLoading(true);
      setUpstashLogsError(null);

      const response = await fetch('/api/upstash-logs');
      if (!response.ok) {
        throw new Error(`Logs fetch failed with status: ${response.status}`);
      }

      const data = await response.json();
      setUpstashLogs(data.data);
      console.log('[@component:DeploymentFooterClient] Upstash Redis logs refreshed successfully');
    } catch (err: any) {
      console.error(
        '[@component:DeploymentFooterClient] Error refreshing Upstash Redis logs:',
        err.message,
      );
      setUpstashLogsError(err.message || 'Failed to fetch logs');
    } finally {
      setUpstashLogsLoading(false);
    }
  };

  const LogsDialog = ({
    onOpenChange,
    logs,
    loading,
    error,
    refreshLogs,
    title,
  }: {
    onOpenChange: (open: boolean) => void;
    logs: any;
    loading: boolean;
    error: string | null;
    refreshLogs: () => void;
    title: string;
  }) => (
    <DialogContent
      className="max-w-[90%] min-w-[75vw] w-[1000px] max-h-[80vh] overflow-hidden bg-gray-900 dark:bg-gray-900 flex flex-col relative"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <button
        onClick={() => onOpenChange(false)}
        className="absolute top-3 right-3 z-20 rounded-full p-1 bg-gray-800 hover:bg-gray-700 text-gray-100 focus:outline-none"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <DialogHeader className="sticky top-0 z-10 bg-gray-900 dark:bg-gray-900 py-1 border-b border-gray-800">
        <DialogTitle className="text-gray-100 dark:text-white">{title}</DialogTitle>
      </DialogHeader>

      <div className="flex-grow overflow-y-auto px-4">
        {loading ? (
          <p className="text-gray-400 dark:text-gray-400">{t('loading_logs')}</p>
        ) : error ? (
          <p className="text-red-400 dark:text-red-400">{t('error_logs', { message: error })}</p>
        ) : logs ? (
          <div className="bg-gray-800 p-2 rounded-md text-xs text-gray-100 dark:text-white">
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                maxWidth: '100%',
                overflow: 'hidden',
                fontFamily: 'monospace',
                lineHeight: '1.3',
              }}
            >
              {parseLogsForDisplay(logs)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-400">{t('no_logs')}</p>
        )}
      </div>

      <div className="sticky z-10 bg-gray-900 dark:bg-gray-900 py-1 border-t border-gray-800 px-4">
        <div className="flex justify-end space-x-2">
          <Button onClick={refreshLogs} variant="secondary" size="sm" disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('refresh_logs')}
          </Button>
          <Button
            onClick={() => copyLogs(logs)}
            variant="secondary"
            size="sm"
            disabled={!logs || loading}
          >
            <Copy className="w-4 h-4 mr-1" />
            {copied ? t('copied_logs') : t('copy_logs')}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <footer className="flex items-center justify-end p-4 border-t border-gray-200">
      <div className="flex items-center space-x-4">
        {/* Main Logs Section */}
        <div className="flex items-center space-x-2">
          <span className={cn('w-3 h-3 rounded-full', mainStatusColor)} />
          <Button variant="outline" size="sm" onClick={fetchMainLogs} disabled={mainLogsLoading}>
            Render Main
          </Button>
          <Dialog open={mainModalOpen} onOpenChange={setMainModalOpen}>
            <LogsDialog
              onOpenChange={setMainModalOpen}
              logs={mainLogs}
              loading={mainLogsLoading}
              error={mainLogsError}
              refreshLogs={refreshMainLogs}
              title="Render Main Service Logs"
            />
          </Dialog>
        </div>

        {/* Slave Python Logs Section */}
        <div className="flex items-center space-x-2">
          <span className={cn('w-3 h-3 rounded-full', slaveStatusColor)} />
          <Button variant="outline" size="sm" onClick={fetchSlaveLogs} disabled={slaveLogsLoading}>
            Render Python
          </Button>
          <Dialog open={slaveModalOpen} onOpenChange={setSlaveModalOpen}>
            <LogsDialog
              onOpenChange={setSlaveModalOpen}
              logs={slaveLogs}
              loading={slaveLogsLoading}
              error={slaveLogsError}
              refreshLogs={refreshSlaveLogs}
              title="Render Python Service Logs"
            />
          </Dialog>
        </div>

        {/* Upstash Redis Logs Section */}
        <div className="flex items-center space-x-2">
          <span className={cn('w-3 h-3 rounded-full', upstashStatusColor)} />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUpstashLogs}
            disabled={upstashLogsLoading}
          >
            Upstash Redis
          </Button>
          <Dialog open={upstashModalOpen} onOpenChange={setUpstashModalOpen}>
            <LogsDialog
              onOpenChange={setUpstashModalOpen}
              logs={upstashLogs}
              loading={upstashLogsLoading}
              error={upstashLogsError}
              refreshLogs={refreshUpstashLogs}
              title="Upstash Redis Queue List"
            />
          </Dialog>
        </div>
      </div>
      <style jsx>{`
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.2;
          }
        }
        .animate-blink {
          animation: blink 1.5s infinite;
        }
      `}</style>
    </footer>
  );
}
