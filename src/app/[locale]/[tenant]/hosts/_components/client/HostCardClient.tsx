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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip';
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

  const getStatusDot = (status: string) => {
    const baseClasses = 'h-4 w-4 rounded-full transition-colors duration-300';

    if (!status) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className={`${baseClasses} bg-gray-400`} />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('unknown')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    switch (status) {
      case 'connected':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className={`${baseClasses} bg-green-500`} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('connected')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'failed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className={`${baseClasses} bg-red-500`} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('failed')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'testing':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className={`${baseClasses} host-testing-animation ring-2 ring-yellow-300 ring-opacity-60`}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('testing')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'pending':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className={`${baseClasses} bg-yellow-500`} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('pending')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className={`${baseClasses} bg-orange-500`} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('unknown')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };

  const handleTerminalClick = () => {
    // Get the current URL path segments to extract locale and tenant
    const pathSegments = window.location.pathname.split('/');
    const locale = pathSegments[1] || 'en';
    const tenant = pathSegments[2] || 'default';

    // Set current host for terminal to use
    try {
      // Data should already be in sessionStorage, so just logging and confirming
      // that we're accessing this host
      console.log('Accessing terminal for host:', {
        name: host.name,
        id: host.id,
        is_windows: host.is_windows === true,
        os_type: host.os_type || 'unknown',
      });

      // Still store current host reference for direct access
      sessionStorage.setItem('currentHost', `host_${host.id}`);
      sessionStorage.setItem('currentHostLastAccessed', Date.now().toString());

      // For debugging - check if the host was properly stored earlier
      const storedHost = sessionStorage.getItem(`host_${host.id}`);
      const storedHostByName = sessionStorage.getItem(`host_name_${host.name.toLowerCase()}`);

      if (!storedHost && !storedHostByName) {
        console.warn('Warning: Host not found in sessionStorage, storing it now');

        // Ensure is_windows is explicitly included and is a boolean
        const hostWithExplicitWindows = {
          ...host,
          is_windows: host.is_windows === true,
        };

        // Store it now as a fallback
        sessionStorage.setItem(`host_${host.id}`, JSON.stringify(hostWithExplicitWindows));
        sessionStorage.setItem(
          `host_name_${host.name.toLowerCase()}`,
          JSON.stringify(hostWithExplicitWindows),
        );
        sessionStorage.setItem('currentHost_full', JSON.stringify(hostWithExplicitWindows));
      } else {
        console.log('Host found in sessionStorage:', {
          byId: !!storedHost,
          byName: !!storedHostByName,
        });

        // For debugging - also store the full object directly
        sessionStorage.setItem(
          'currentHost_full',
          JSON.stringify({
            ...host,
            is_windows: host.is_windows === true,
          }),
        );
      }
    } catch (e) {
      console.error('Error processing host for terminal:', e);
    }

    // Build the correct path with locale and tenant
    const terminalPath = `/${locale}/${tenant}/terminals/${host.name.toLowerCase()}`;
    console.log(`Redirecting to terminal: ${terminalPath}`);
    router.push(terminalPath);
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
      <Card className="relative w-[300px]">
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center">
              <div className="w-[200px] flex items-center">
                <div className="mr-2">{getStatusDot(localStatus)}</div>
                <CardTitle className="text-base font-semibold truncate flex-1">
                  {host.name}
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-xs">
              {host.ip}
              {host.port ? `:${host.port}` : ''}
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
