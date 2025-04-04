'use client';

import { Terminal, MoreHorizontal, RefreshCw, XCircle, ScrollText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

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
import { Host } from '@/types/component/hostComponentType';

interface HostCardClientProps {
  host: Host & { animationDelay?: number };
  onDelete?: (id: string) => void;
  onTestConnection?: (host: Host) => Promise<boolean>;
}

export function HostCardClient({ host, onDelete, onTestConnection }: HostCardClientProps) {
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
    const delayClass =
      host.animationDelay !== undefined ? `delay-${Math.min(host.animationDelay, 5)}` : '';

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
                  className={`${baseClasses} host-testing-animation ring-2 ring-yellow-300 ring-opacity-60 ${delayClass}`}
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

    // Build the correct path with locale and tenant
    const terminalPath = `/${locale}/${tenant}/terminals/${host.name.toLowerCase()}`;
    console.log(`Redirecting to terminal: ${terminalPath}`);
    router.push(terminalPath);
  };

  const handleRefreshClick = async () => {
    if (!onTestConnection || isRefreshing) return;

    try {
      setIsRefreshing(true);
      setLocalStatus('testing');

      console.log('[HostCardClient] Testing connection for:', host.name);
      const success = await onTestConnection(host);

      if (success) {
        console.log('[HostCardClient] Connection successful');
        setLocalStatus('connected');
      } else {
        console.error('[HostCardClient] Connection failed');
        setLocalStatus('failed');
      }
    } catch (error: any) {
      console.error('[HostCardClient] Error testing connection:', error);
      setErrorMessage(error.message || 'Connection test failed');
      setShowErrorDialog(true);
      setLocalStatus('failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      console.log('[HostCardClient] Deleting host:', host.name);
      await onDelete(host.id);
      setIsDeleted(true);
    } catch (error: any) {
      console.error('[HostCardClient] Error deleting host:', error);
      setErrorMessage(error.message || 'Delete operation failed');
      setShowErrorDialog(true);
    } finally {
      setIsDeleting(false);
    }
  };

  // If the host has been deleted, don't render the card
  if (isDeleted) {
    return null;
  }

  return (
    <>
      <Card className="h-full overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="relative p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusDot(localStatus)}
              <CardTitle className="text-lg font-semibold">{host.name}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                  className="py-2"
                >
                  <ScrollText className="mr-2 h-4 w-4" />
                  <span>{t('logs')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefreshClick} className="py-2">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{t('refresh')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive py-2">
                  <XCircle className="mr-2 h-4 w-4" />
                  <span>{t('delete')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="mt-1 text-sm truncate">
            {host.description || `${host.ip}${host.port ? `:${host.port}` : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('ip_address')}</span>
              <span className="font-medium">
                {host.ip}
                {host.port ? `:${host.port}` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('type')}</span>
              <span className="font-medium capitalize">{host.type || 'Unknown'}</span>
            </div>
            {localStatus === 'connected' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 gap-1"
                onClick={handleTerminalClick}
              >
                <Terminal className="h-4 w-4" />
                <span>{t('open_terminal')}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('error')}</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>{t('close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
