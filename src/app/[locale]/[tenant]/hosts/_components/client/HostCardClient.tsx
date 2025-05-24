'use client';

import { Terminal, MoreHorizontal, RefreshCw, XCircle, ScrollText, FolderPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shadcn/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import AddToWorkspace from '@/components/workspace/AddToWorkspace';
import { Host } from '@/types/component/hostComponentType';

interface HostCardClientProps {
  host: Host & { animationDelay?: number };
  onDelete?: (id: string) => void;
  onTestConnection?: (host: Host, options?: { skipRevalidation?: boolean }) => Promise<boolean>;
}

// Export both as default and named export for backward compatibility
export { HostCardClient as default, HostCardClient };

function HostCardClient({ host, onDelete, onTestConnection }: HostCardClientProps) {
  const router = useRouter();
  const t = useTranslations('common');

  // Group all state declarations together at the top
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [localStatus, setLocalStatus] = useState(host.status);

  // Update localStatus when host.status changes
  useEffect(() => {
    setLocalStatus(host.status);
  }, [host.status]);

  // Add logging for component mount and props
  useEffect(() => {
    console.log('[HostCardClient] Mounted for host:', host.id, {
      hasOnTestConnection: !!onTestConnection,
      hasOnDelete: !!onDelete,
    });
  }, [host.id, onTestConnection, onDelete]);

  const getDeviceTypeBadge = (deviceType?: string) => {
    if (!deviceType) return null;

    const getBadgeConfig = (type: string) => {
      switch (type) {
        case 'linux':
          return {
            color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            label: 'Linux',
            icon: '🐧',
          };
        case 'windows':
          return {
            color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
            label: 'Win',
            icon: '🪟',
          };
        case 'android_phone':
          return {
            color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            label: 'Phone',
            icon: '📱',
          };
        case 'android_tablet':
          return {
            color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            label: 'Tablet',
            icon: '📱',
          };
        case 'ios_phone':
          return {
            color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
            label: 'iPhone',
            icon: '📱',
          };
        case 'ios_tablet':
          return {
            color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
            label: 'iPad',
            icon: '📱',
          };
        case 'tv_tizen':
        case 'tv_lg':
        case 'tv_android':
        case 'appletv':
          return {
            color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            label: 'TV',
            icon: '📺',
          };
        case 'stb_eos':
        case 'stb_apollo':
          return {
            color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            label: 'STB',
            icon: '📦',
          };
        default:
          return {
            color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
            label: 'Device',
            icon: '📱',
          };
      }
    };

    const config = getBadgeConfig(deviceType);

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
        title={deviceType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} // Full name on hover
      >
        <span className="text-xs">{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  const getStatusDot = (status: string) => {
    const baseClasses = 'h-3 w-3 rounded-full';

    // For devices, always show grey dot since we can't verify connectivity
    if (host.type === 'device') {
      return <div className={`${baseClasses} bg-gray-400`} title="Device (status unknown)" />;
    }

    // For SSH hosts, show actual status
    switch (status) {
      case 'connected':
        return <div className={`${baseClasses} bg-green-500`} title={t('connected')} />;
      case 'failed':
        return <div className={`${baseClasses} bg-red-500`} title={t('failed')} />;
      case 'testing':
        return (
          <div
            className={`${baseClasses} host-testing-animation ring-2 ring-yellow-300 ring-opacity-60`}
            title={t('testing')}
          />
        );
      default:
        return <div className={`${baseClasses} bg-gray-400`} title={t('unknown')} />;
    }
  };

  const handleTerminalClick = () => {
    console.log(`[@component:HostCardClient] Opening terminal for host: ${host.name}`);

    // Dispatch event to open terminal modal
    window.dispatchEvent(
      new CustomEvent('OPEN_TERMINAL_MODAL', {
        detail: { host },
      }),
    );
  };

  const handleRefreshClick = useCallback(async () => {
    // Don't execute if already refreshing or deleting
    if (isRefreshing || isDeleting) {
      console.log(`[HostCardClient:${host.id}] Skipping refresh - already in progress or deleting`);
      return;
    }

    console.log(`[HostCardClient:${host.id}] Starting refresh for host:`, host.id);
    setIsRefreshing(true);
    setLocalStatus('testing'); // Set local status to testing immediately

    // No need to dispatch events here - HostListClient will handle it

    try {
      if (!onTestConnection) {
        throw new Error('Test connection callback not provided');
      }

      // Call parent component's handler, which will dispatch events
      console.log(`[HostCardClient:${host.id}] Calling onTestConnection`);
      const result = await onTestConnection(host);
      console.log(`[HostCardClient:${host.id}] Refresh result:`, {
        hostId: host.id,
        success: result,
      });

      // The status update will come from the parent through the host prop
    } catch (error) {
      console.error(`[HostCardClient:${host.id}] Refresh error:`, error);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      setShowErrorDialog(true);
      setLocalStatus('failed'); // Set status to failed on error
    } finally {
      setIsRefreshing(false);
      // No need to dispatch events here - HostListClient will handle it
    }
  }, [host, onTestConnection, isRefreshing, isDeleting]);

  const handleDeleteClick = useCallback(async () => {
    if (isDeleting || isRefreshing) {
      console.log('[HostCardClient] Skipping delete - already in progress or refreshing');
      return;
    }

    if (!onDelete) {
      console.error('[HostCardClient] Delete callback not provided');
      return;
    }

    console.log('[HostCardClient] Starting delete for host:', host.id);
    setIsDeleting(true);

    try {
      await onDelete(host.id);
      console.log('[HostCardClient] Host deleted successfully:', host.id);
      setIsDeleted(true);
    } catch (error) {
      console.error('[HostCardClient] Delete error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete host');
      setShowErrorDialog(true);
      setIsDeleting(false);
    }
  }, [host, onDelete, isDeleting, isRefreshing]);

  // If the host is deleted, don't render anything
  if (isDeleted) {
    return null;
  }

  return (
    <>
      <Card className="relative w-[260px]">
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <div className="mr-2">{getStatusDot(localStatus)}</div>
                <CardTitle className="text-base font-semibold truncate flex-1">
                  {host.name}
                </CardTitle>
              </div>
              {host.device_type && (
                <div className="ml-2">{getDeviceTypeBadge(host.device_type)}</div>
              )}
            </div>
            <CardDescription className="text-xs">
              {host.ip_local || host.ip}
              {host.type !== 'device' && host.port ? `:${host.port}` : ''}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem
                  onClick={() => {
                    const pathSegments = window.location.pathname.split('/');
                    const locale = pathSegments[1] || 'en';
                    const tenant = pathSegments[2] || 'default';
                    router.push(`/${locale}/${tenant}/logs/${host.name}`);
                  }}
                >
                  <ScrollText className="mr-2 h-4 w-4" />
                  <span>{t('logs')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleRefreshClick}
                  disabled={isRefreshing || isDeleting}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? t('refreshing') : t('refresh')}</span>
                </DropdownMenuItem>
                <AddToWorkspace
                  itemType="host"
                  itemId={host.id}
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                      }}
                      disabled={isDeleting || isRefreshing}
                    >
                      <FolderPlus className="mr-2 h-4 w-4" />
                      <span>Workspaces</span>
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  <span>{t('delete')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex flex-col space-y-2">
            <Button
              variant="default"
              size="sm"
              className="w-full mt-2"
              onClick={handleTerminalClick}
              disabled={localStatus !== 'connected'}
            >
              <Terminal className="h-4 w-4 mr-2" />
              {t('open')}
            </Button>
            <p className="text-xs mt-1 text-muted-foreground">
              {host.updated_at
                ? `${t('updated_at')}: ${new Date(host.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}`
                : `${t('updated_at')}: ${t('never')}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('error')}</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowErrorDialog(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
