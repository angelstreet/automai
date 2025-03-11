'use client';

import {
  Terminal,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  XCircle,
  ScrollText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
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
import { Host } from '@/types/hosts';

interface HostCardProps {
  host: Host;
  onDelete?: (id: string) => void;
  onTestConnection?: (host: Host) => void;
}

export function HostCard({ host, onDelete, onTestConnection }: HostCardProps) {
  const router = useRouter();
  const [showError, setShowError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const t = useTranslations('Common');

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
                <div className={`${baseClasses} bg-yellow-500 animate-pulse`} />
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
        os_type: host.os_type || 'unknown'
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
        sessionStorage.setItem(`host_name_${host.name.toLowerCase()}`, JSON.stringify(hostWithExplicitWindows));
        sessionStorage.setItem('currentHost_full', JSON.stringify(hostWithExplicitWindows));
      } else {
        console.log('Host found in sessionStorage:', {
          byId: !!storedHost,
          byName: !!storedHostByName
        });
        
        // For debugging - also store the full object directly
        sessionStorage.setItem('currentHost_full', JSON.stringify({
          ...host,
          is_windows: host.is_windows === true
        }));
      }
    } catch (e) {
      console.error('Error processing host for terminal:', e);
    }

    // Build the correct path with locale and tenant
    const terminalPath = `/${locale}/${tenant}/terminals/${host.name.toLowerCase()}`;
    console.log(`Redirecting to terminal: ${terminalPath}`);
    router.push(terminalPath);
  };

  const handleRefreshClick = async () => {
    if (isRefreshing || !onTestConnection || isDeleting) return;

    setIsRefreshing(true);
    try {
      await onTestConnection(host);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = () => {
    if (isDeleting) return;
    setIsDeleting(true);
    onDelete?.(host.id);
  };

  return (
    <>
      <Card className="relative w-[300px]">
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center">
              <div className="w-[200px] flex items-center">
                <div className="mr-2">{getStatusDot(host.status)}</div>
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
                <DropdownMenuItem onClick={() => router.push(`/logs/${host.name}`)}>
                  <ScrollText className="mr-2 h-4 w-4" />
                  <span>{t('logs')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefreshClick} disabled={isRefreshing || isDeleting}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? t('refreshing') : t('refresh')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
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
              disabled={host.status !== 'connected'}
            >
              <Terminal className="h-4 w-4 mr-2" />
              {t('terminal')}
            </Button>
            <p className="text-xs mt-1 text-muted-foreground">
              {host.updated_at
                ? `${t('updated_at')}: ${new Date(host.updated_at).toLocaleDateString()}`
                : `${t('updated_at')}: ${t('never')}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showError} onOpenChange={setShowError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              {t('connectionError')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium mb-2">{t('errorDetails')}:</p>
              <pre className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-xs">
                {host.errorMessage || t('noErrorDetails')}
              </pre>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>
                {t('updated_at')}:{' '}
                {host.updated_at ? new Date(host.updated_at).toLocaleString() : t('never')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
