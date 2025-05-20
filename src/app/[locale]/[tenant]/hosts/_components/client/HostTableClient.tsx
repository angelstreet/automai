'use client';

import { Terminal, RefreshCw, XCircle, ScrollText, MoreHorizontal, FolderPlus } from 'lucide-react';
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
import AddToWorkspace from '@/components/workspace/AddToWorkspace';
import { Host } from '@/types/component/hostComponentType';

interface HostTableClientProps {
  hosts: (Host & { animationDelay?: number })[];
  selectedHosts: Set<string>;
  selectMode: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (host: Host, options?: { skipRevalidation?: boolean }) => Promise<boolean>;
  activeWorkspace?: string | null;
}

export function HostTableClient({
  hosts,
  selectedHosts: _selectedHosts,
  selectMode,
  onSelect,
  onDelete,
  onTestConnection,
  activeWorkspace,
}: HostTableClientProps) {
  const router = useRouter();
  const t = useTranslations('common');

  // Get locale and tenant from the current path
  const getPathSegments = () => {
    const pathSegments = window.location.pathname.split('/');
    return {
      locale: pathSegments[1] || 'en',
      tenant: pathSegments[2] || 'trial',
    };
  };

  const getStatusDot = (status: string) => {
    const baseClasses = 'h-3 w-3 rounded-full';

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

  const handleTerminalClick = (host: Host) => {
    const { locale, tenant } = getPathSegments();

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
        <TableBody key="host-table-body">
          {hosts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="text-sm text-muted-foreground">
                  {activeWorkspace ? 'No hosts found in this workspace' : 'No hosts found'}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            hosts.map((host) => (
              <TableRow
                key={host.id}
                className="h-10"
                onClick={() => selectMode && onSelect(host.id)}
              >
                <TableCell className="py-2">
                  <div className="flex justify-center">{getStatusDot(host.status)}</div>
                </TableCell>
                <TableCell className="font-medium py-2">{host.name}</TableCell>
                <TableCell className="py-2">
                  {host.ip}
                  {host.port ? `:${host.port}` : ''}
                </TableCell>
                <TableCell className="py-2">
                  {(() => {
                    switch (host.status) {
                      case 'connected':
                        return host.updated_at
                          ? new Date(host.updated_at).toLocaleString()
                          : new Date().toLocaleString();
                      case 'testing':
                        return <span className="text-yellow-500">{t('testing')}</span>;
                      case 'failed':
                        return <span className="text-red-500">{t('failed')}</span>;
                      default:
                        return t('never');
                    }
                  })()}
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
                          key={`logs-${host.id}`}
                          onClick={() => {
                            const { locale, tenant } = getPathSegments();
                            router.push(`/${locale}/${tenant}/logs/${host.name}`);
                          }}
                          className="py-1.5"
                        >
                          <ScrollText className="mr-2 h-3.5 w-3.5" />
                          <span className="text-sm">{t('logs')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          key={`refresh-${host.id}`}
                          onClick={() => onTestConnection?.(host, { skipRevalidation: false })}
                          className="py-1.5"
                        >
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          <span className="text-sm">{t('refresh')}</span>
                        </DropdownMenuItem>
                        <AddToWorkspace
                          itemType="host"
                          itemId={host.id}
                          trigger={
                            <DropdownMenuItem
                              key={`workspace-${host.id}`}
                              onSelect={(e) => {
                                e.preventDefault();
                              }}
                              className="py-1.5"
                            >
                              <FolderPlus className="mr-2 h-3.5 w-3.5" />
                              <span className="text-sm">Workspaces</span>
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuItem
                          key={`delete-${host.id}`}
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
