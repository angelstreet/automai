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
import { Host } from '../types';
import { useHost } from '@/context';

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
  const [isDeleted, setIsDeleted] = useState(false);
  const t = useTranslations('Common');
  
  const { testConnection, removeHost } = useHost();

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'connected':
        return <div className="h-3 w-3 rounded-full bg-green-500 mr-2" />;
      case 'failed':
        return <div className="h-3 w-3 rounded-full bg-red-500 mr-2" />;
      case 'pending':
        return <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2" />;
      case 'testing':
        return <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse mr-2" />;
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-300 mr-2" />;
    }
  };

  const handleTerminalClick = () => {
    router.push(`/hosts/terminals/${host.id}`);
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      if (onTestConnection) {
        await onTestConnection(host);
      } else {
        await testConnection(host.id);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete && !removeHost) return;
    
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(host.id);
      } else {
        await removeHost(host.id);
      }
      setIsDeleted(true);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDeleted) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-3 right-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                {getStatusDot(host.status)}
                <span className="text-xs font-medium">
                  {host.status === 'connected' && 'Connected'}
                  {host.status === 'failed' && 'Failed'}
                  {host.status === 'pending' && 'Pending'}
                  {host.status === 'testing' && 'Testing'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {host.status === 'connected' && 'Host is connected and ready'}
              {host.status === 'failed' && 'Connection failed'}
              {host.status === 'pending' && 'Connection pending'}
              {host.status === 'testing' && 'Testing connection...'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <CardHeader>
        <CardTitle>{host.name}</CardTitle>
        <CardDescription>
          {host.description || `${host.type} host @ ${host.ip}`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <p className="text-sm font-medium">Type</p>
            <p className="text-sm">{host.type}</p>
          </div>
          <div>
            <p className="text-sm font-medium">IP Address</p>
            <p className="text-sm">{host.ip}</p>
          </div>
          {host.port && (
            <div>
              <p className="text-sm font-medium">Port</p>
              <p className="text-sm">{host.port}</p>
            </div>
          )}
          {host.user && (
            <div>
              <p className="text-sm font-medium">Username</p>
              <p className="text-sm">{host.user}</p>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTerminalClick}
            className="flex-1"
          >
            <Terminal className="h-4 w-4 mr-2" />
            Terminal
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Test
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {host.status === 'failed' && host.errorMessage && (
                <DropdownMenuItem onClick={() => setShowError(true)}>
                  <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  View Error
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleTerminalClick}>
                <Terminal className="h-4 w-4 mr-2" />
                Open Terminal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} disabled={isDeleting}>
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                {isDeleting ? 'Deleting...' : 'Delete Host'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>

      <Dialog open={showError} onOpenChange={setShowError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connection Error</DialogTitle>
          </DialogHeader>
          <div className="bg-red-50 p-4 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Connection to {host.ip} failed
                </h3>
                <p className="mt-2 text-sm text-red-700 whitespace-pre-wrap font-mono">
                  {host.errorMessage || 'Unknown error'}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
