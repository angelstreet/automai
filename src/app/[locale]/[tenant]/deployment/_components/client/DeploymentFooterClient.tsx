'use client';

import { RefreshCw, Copy, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { cn } from '@/lib/utils';

type ServiceStatus = {
  loading: boolean;
  status: string | null;
};

type LogsData = {
  logs?: Array<{
    timestamp?: string;
    message?: string;
  }>;
  [key: string]: any;
};

export function DeploymentFooterClient() {
  const t = useTranslations('deployment');
  const c = useTranslations('common');

  // Simple state for health status
  const [healthStatus, setHealthStatus] = useState<Record<string, ServiceStatus>>({
    'main-prod': { loading: true, status: null },
    'main-preprod': { loading: true, status: null },
    'python-prod': { loading: true, status: null },
    'python-preprod': { loading: true, status: null },
  });

  // Simple state for logs
  const [logs, setLogs] = useState<LogsData | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [activeService, setActiveService] = useState('');
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [upstashLogs, setUpstashLogs] = useState<any>(null);
  const [upstashLogsLoading, setUpstashLogsLoading] = useState(false);
  const [upstashLogsError, setUpstashLogsError] = useState<string | null>(null);
  const [upstashModalOpen, setUpstashModalOpen] = useState(false);

  // Upstash health
  const [upstashHealth, setUpstashHealth] = useState<ServiceStatus>({
    loading: true,
    status: null,
  });

  // Fetch health status on component load for all services
  useEffect(() => {
    const fetchHealthStatus = async (service: string) => {
      try {
        console.log(`[@component:DeploymentFooterClient] Fetching health for ${service}`);
        const response = await fetch(`/api/render-health/${service}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        const data = await response.json();
        setHealthStatus((prev) => ({
          ...prev,
          [service]: { loading: false, status: data.success ? 'ok' : 'error' },
        }));
      } catch (error) {
        console.error(
          `[@component:DeploymentFooterClient] Error fetching ${service} health:`,
          error,
        );
        setHealthStatus((prev) => ({
          ...prev,
          [service]: { loading: false, status: 'error' },
        }));
      }
    };

    const fetchUpstashHealth = async () => {
      try {
        console.log('[@component:DeploymentFooterClient] Fetching Upstash health');
        const response = await fetch('/api/upstash-health', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        const data = await response.json();
        setUpstashHealth({ loading: false, status: data.status === 'ok' ? 'ok' : 'error' });
      } catch (error: any) {
        console.error('[@component:DeploymentFooterClient] Error fetching Upstash health:', error);
        setUpstashHealth({ loading: false, status: 'error' });
      }
    };

    // Fetch all services health on load
    fetchHealthStatus('main-prod');
    fetchHealthStatus('main-preprod');
    fetchHealthStatus('python-prod');
    fetchHealthStatus('python-preprod');
    fetchUpstashHealth();
  }, []);

  // Function to fetch logs when button is clicked
  const fetchLogs = async (service: string) => {
    try {
      setLogsLoading(true);
      setLogsError(null);
      setActiveService(service);

      console.log(`[@component:DeploymentFooterClient] Fetching logs for ${service}`);
      const response = await fetch(`/api/render-logs/${service}`, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }

      const data = await response.json();
      setLogs(data.logs);
      setLogsModalOpen(true);
    } catch (error: any) {
      console.error(
        `[@component:DeploymentFooterClient] Error fetching logs for ${service}:`,
        error,
      );
      setLogsError(error.message);
      setLogsModalOpen(true);
    } finally {
      setLogsLoading(false);
    }
  };

  // Function to fetch Upstash logs
  const fetchUpstashLogs = async () => {
    try {
      setUpstashLogsLoading(true);
      setUpstashLogsError(null);

      console.log('[@component:DeploymentFooterClient] Fetching Upstash logs');
      const response = await fetch('/api/upstash-logs', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Failed to fetch Upstash logs: ${response.status}`);
      }

      const data = await response.json();
      setUpstashLogs(data.data);
      setUpstashModalOpen(true);
    } catch (error: any) {
      console.error('[@component:DeploymentFooterClient] Error fetching Upstash logs:', error);
      setUpstashLogsError(error.message);
      setUpstashModalOpen(true);
    } finally {
      setUpstashLogsLoading(false);
    }
  };

  // Function to copy logs to clipboard
  const copyLogs = (logsData: any) => {
    if (logsData) {
      navigator.clipboard
        .writeText(JSON.stringify(logsData, null, 2))
        .then(() => {
          console.log('[@component:DeploymentFooterClient] Logs copied to clipboard');
          const copyButton = document.querySelector('.copy-button');
          if (copyButton) {
            copyButton.textContent = 'Copied';
            setTimeout(() => {
              if (copyButton) {
                copyButton.textContent = 'Copy';
              }
            }, 2000);
          }
        })
        .catch((err) => {
          console.error('[@component:DeploymentFooterClient] Failed to copy logs:', err);
        });
    }
  };

  // Parse logs for display
  const parseLogsForDisplay = (logsData: LogsData | null) => {
    if (!logsData) return '';

    try {
      if (logsData.logs && Array.isArray(logsData.logs)) {
        return logsData.logs
          .map((log) => {
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
            const message = log.message || 'No message';
            return `${timestamp}\n${message}`;
          })
          .join('\n\n');
      }
      return JSON.stringify(logsData, null, 2);
    } catch (error) {
      console.error('[@component:DeploymentFooterClient] Error parsing logs:', error);
      return JSON.stringify(logsData, null, 2);
    }
  };

  // Helper function to determine status color
  const getStatusColor = (service: string) => {
    const status = service === 'upstash' ? upstashHealth : healthStatus[service];
    if (status.loading) {
      return 'bg-yellow-500 animate-blink';
    }
    return status.status === 'ok' ? 'bg-green-500' : 'bg-red-500';
  };

  // Generic dialog component for displaying logs
  const LogsDialog = ({ title }: { title: string }) => (
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
        onClick={() => setLogsModalOpen(false)}
        className="absolute top-3 right-3 z-20 rounded-full p-1 bg-gray-800 hover:bg-gray-700 text-gray-100 focus:outline-none"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <DialogHeader className="sticky top-0 z-10 bg-gray-900 dark:bg-gray-900 py-1 border-b border-gray-800">
        <DialogTitle className="text-gray-100 dark:text-white">{title}</DialogTitle>
      </DialogHeader>

      <div className="flex-grow overflow-y-auto px-4">
        {logsLoading ? (
          <p className="text-gray-400 dark:text-gray-400">{t('loading_logs')}</p>
        ) : logsError ? (
          <p className="text-red-400 dark:text-red-400">
            {t('error_logs', { message: logsError })}
          </p>
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
          <Button
            onClick={() => fetchLogs(activeService)}
            variant="secondary"
            size="sm"
            disabled={logsLoading}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('refresh_logs')}
          </Button>
          <Button
            onClick={() => copyLogs(logs)}
            variant="secondary"
            size="sm"
            disabled={!logs || logsLoading}
            className="copy-button"
          >
            <Copy className="w-4 h-4 mr-1" />
            {c('copy')}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  // Similar dialog for Upstash
  const UpstashLogsDialog = () => (
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
        onClick={() => setUpstashModalOpen(false)}
        className="absolute top-3 right-3 z-20 rounded-full p-1 bg-gray-800 hover:bg-gray-700 text-gray-100 focus:outline-none"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <DialogHeader className="sticky top-0 z-10 bg-gray-900 dark:bg-gray-900 py-1 border-b border-gray-800">
        <DialogTitle className="text-gray-100 dark:text-white">
          Upstash Redis Queue List
        </DialogTitle>
      </DialogHeader>

      <div className="flex-grow overflow-y-auto px-4">
        {upstashLogsLoading ? (
          <p className="text-gray-400 dark:text-gray-400">{t('loading_logs')}</p>
        ) : upstashLogsError ? (
          <p className="text-red-400 dark:text-red-400">
            {t('error_logs', { message: upstashLogsError })}
          </p>
        ) : upstashLogs ? (
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
              {JSON.stringify(upstashLogs, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-400">{t('no_logs')}</p>
        )}
      </div>

      <div className="sticky z-10 bg-gray-900 dark:bg-gray-900 py-1 border-t border-gray-800 px-4">
        <div className="flex justify-end space-x-2">
          <Button
            onClick={fetchUpstashLogs}
            variant="secondary"
            size="sm"
            disabled={upstashLogsLoading}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('refresh_logs')}
          </Button>
          <Button
            onClick={() => copyLogs(upstashLogs)}
            variant="secondary"
            size="sm"
            disabled={!upstashLogs || upstashLogsLoading}
            className="copy-button"
          >
            <Copy className="w-4 h-4 mr-1" />
            {c('copy')}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <footer className="flex items-center justify-end p-4 border-t border-gray-200">
      <div className="flex items-center space-x-4 flex-wrap gap-y-2">
        {/* Main Prod */}
        <div className="flex items-center space-x-2">
          <span className={cn('w-3 h-3 rounded-full', getStatusColor('main-prod'))} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs('main-prod')}
            disabled={logsLoading}
          >
            Render Main (Prod)
          </Button>
        </div>

        {/* Python Prod */}
        <div className="flex items-center space-x-2">
          <span className={cn('w-3 h-3 rounded-full', getStatusColor('python-prod'))} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs('python-prod')}
            disabled={logsLoading}
          >
            Render Python (Prod)
          </Button>
        </div>

        {/* Main Preprod */}
        <div className="flex items-center space-x-2">
          <span className={cn('w-3 h-3 rounded-full', getStatusColor('main-preprod'))} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs('main-preprod')}
            disabled={logsLoading}
          >
            Render Main (Preprod)
          </Button>
        </div>

        {/* Python Preprod */}
        <div className="flex items-center space-x-2">
          <span className={cn('w-3 h-3 rounded-full', getStatusColor('python-preprod'))} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs('python-preprod')}
            disabled={logsLoading}
          >
            Render Python (Preprod)
          </Button>
        </div>

        {/* Upstash Redis */}
        <div className="flex items-center space-x-2">
          <span className={cn('w-3 h-3 rounded-full', getStatusColor('upstash'))} />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUpstashLogs}
            disabled={upstashLogsLoading}
          >
            Upstash Redis
          </Button>
        </div>
      </div>

      {/* Modal for Render logs */}
      <Dialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
        <LogsDialog
          title={
            activeService
              ? `Render ${
                  activeService.split('-')[0]
                    ? activeService.split('-')[0].charAt(0).toUpperCase() +
                      activeService.split('-')[0].slice(1)
                    : 'Service'
                } Logs (${
                  activeService.split('-')[1]
                    ? activeService.split('-')[1].charAt(0).toUpperCase() +
                      activeService.split('-')[1].slice(1)
                    : ''
                })`
              : 'Render Service Logs'
          }
        />
      </Dialog>

      {/* Modal for Upstash logs */}
      <Dialog open={upstashModalOpen} onOpenChange={setUpstashModalOpen}>
        <UpstashLogsDialog />
      </Dialog>

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
