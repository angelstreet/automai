'use client';

import { Terminal, RefreshCw, XCircle, ScrollText, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { Host } from '@/types/hosts';

interface HostTableProps {
  hosts: Host[];
  onDelete?: (id: string) => void;
  onTestConnection?: (host: Host) => void;
}

export function HostTable({ hosts, onDelete, onTestConnection }: HostTableProps) {
  const router = useRouter();
  const t = useTranslations('Common');

  const getStatusDot = (status: string) => {
    const baseClasses = 'h-3 w-3 rounded-full';

    switch (status) {
      case 'connected':
        return <div className={`${baseClasses} bg-green-500`} title={t('connected')} />;
      case 'failed':
        return <div className={`${baseClasses} bg-red-500`} title={t('failed')} />;
      case 'pending':
        return <div className={`${baseClasses} bg-yellow-500`} title={t('pending')} />;
      default:
        return <div className={`${baseClasses} bg-gray-400`} title={t('unknown')} />;
    }
  };

  const handleTerminalClick = (host: Host) => {
    // Get the current URL path segments to extract locale and tenant
    const pathSegments = window.location.pathname.split('/');
    const locale = pathSegments[1] || 'en';
    const tenant = pathSegments[2] || 'default';

    // Build the correct path with locale and tenant
    const terminalPath = `/${locale}/${tenant}/terminals/${host.name.toLowerCase()}`;
    console.log(`Redirecting to terminal: ${terminalPath}`);
    router.push(terminalPath);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead className="w-[40px] py-2">Status</TableHead>
            <TableHead className="py-2">Name</TableHead>
            <TableHead className="py-2">Address</TableHead>
            <TableHead className="py-2">Last Connected</TableHead>
            <TableHead className="w-[120px] py-2">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hosts.map((host) => (
            <TableRow key={host.id} className="h-10">
              <TableCell className="py-2">
                <div className="flex justify-center">{getStatusDot(host.status)}</div>
              </TableCell>
              <TableCell className="font-medium py-2">{host.name}</TableCell>
              <TableCell className="py-2">
                {host.ip}
                {host.port ? `:${host.port}` : ''}
              </TableCell>
              <TableCell className="py-2">
                {host.lastConnected
                  ? new Date(host.lastConnected).toLocaleString()
                  : host.status === 'connected'
                    ? new Date().toLocaleString()
                    : t('never')}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleTerminalClick(host)}
                    disabled={host.status !== 'connected'}
                  >
                    <Terminal className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[140px]">
                      <DropdownMenuItem
                        onClick={() => router.push(`/logs/${host.name}`)}
                        className="py-1.5"
                      >
                        <ScrollText className="mr-2 h-3.5 w-3.5" />
                        <span className="text-sm">{t('logs')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTestConnection?.(host)} className="py-1.5">
                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                        <span className="text-sm">{t('refresh')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(host.id)}
                        className="text-destructive py-1.5"
                      >
                        <XCircle className="mr-2 h-3.5 w-3.5" />
                        <span className="text-sm">{t('delete')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
