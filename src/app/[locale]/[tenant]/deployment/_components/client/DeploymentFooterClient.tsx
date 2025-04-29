'use client';

import { RefreshCw, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const [copied, setCopied] = useState(false);
  const { logs, loading: logsLoading, error: logsError, fetchLogs } = useRenderLogs(modalOpen);
  const t = useTranslations('deployment');

  // Determine status dot color based on health response
  const isHealthy = health && health.success;
  const statusColor = healthLoading
    ? 'bg-yellow-500 animate-blink'
    : isHealthy
      ? 'bg-green-500'
      : 'bg-red-500';

  // Function to copy logs to clipboard
  const copyLogs = () => {
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

  return (
    <footer className="flex items-center justify-end p-4 border-t border-gray-200">
      <div className="flex items-center space-x-2">
        <span className={cn('w-3 h-3 rounded-full', statusColor)} />
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {t('render_logs_button')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto bg-gray-900 dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-gray-100 dark:text-white">
                {t('render_logs_title')}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {logsLoading ? (
                <p className="text-gray-400 dark:text-gray-400">{t('loading_logs')}</p>
              ) : logsError ? (
                <p className="text-red-400 dark:text-red-400">
                  {t('error_logs', { message: logsError })}
                </p>
              ) : logs ? (
                <pre className="bg-gray-800 p-4 rounded-md text-sm overflow-x-auto text-gray-100 dark:text-white">
                  {JSON.stringify(logs, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-400 dark:text-gray-400">{t('no_logs')}</p>
              )}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                onClick={() => fetchLogs()}
                variant="secondary"
                size="sm"
                disabled={logsLoading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                {t('refresh_logs')}
              </Button>
              <Button
                onClick={copyLogs}
                variant="secondary"
                size="sm"
                disabled={!logs || logsLoading}
              >
                <Copy className="w-4 h-4 mr-1" />
                {copied ? t('copied_logs') : t('copy_logs')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
