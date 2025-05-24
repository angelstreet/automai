'use client';

import {
  Terminal,
  RefreshCw,
  XCircle,
  ScrollText,
  MoreHorizontal,
  FolderPlus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

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

// Group hosts by their public IP (gateway) - same logic as grid
function groupHostsByPublicIP(hosts: Host[]) {
  const groups = new Map<string, Host[]>();

  hosts.forEach((host) => {
    const publicIP = host.ip;
    if (!groups.has(publicIP)) {
      groups.set(publicIP, []);
    }
    groups.get(publicIP)!.push(host);
  });

  return Array.from(groups.entries()).map(([ip, hosts]) => ({
    publicIP: ip,
    hosts: hosts,
    count: hosts.length,
  }));
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

  // Initialize with all groups expanded
  const hostGroups = groupHostsByPublicIP(hosts);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(hostGroups.map((group) => group.publicIP)),
  );

  // Get locale and tenant from the current path
  const getPathSegments = () => {
    const pathSegments = window.location.pathname.split('/');
    return {
      locale: pathSegments[1] || 'en',
      tenant: pathSegments[2] || 'trial',
    };
  };

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

  const toggleGroup = (publicIP: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(publicIP)) {
      newExpanded.delete(publicIP);
    } else {
      newExpanded.add(publicIP);
    }
    setExpandedGroups(newExpanded);
  };

  const getStatusDot = (status: string, hostType?: string) => {
    const baseClasses = 'h-3 w-3 rounded-full';

    // For devices, always show grey dot since we can't verify connectivity
    if (hostType === 'device') {
      return <div className={`${baseClasses} bg-gray-400`} title="Device (status unknown)" />;
    }

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
    console.log(`[@component:HostTableClient] Opening terminal for host: ${host.name}`);

    // Dispatch event to open terminal modal
    window.dispatchEvent(
      new CustomEvent('OPEN_TERMINAL_MODAL', {
        detail: { host },
      }),
    );
  };

  if (hosts.length === 0) {
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
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="text-sm text-muted-foreground">
                  {activeWorkspace ? 'No hosts found in this workspace' : 'No hosts found'}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

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
          {hostGroups.map(({ publicIP, hosts: groupHosts, count }) => {
            const isExpanded = expandedGroups.has(publicIP);
            const isStandalone = count === 1;

            return (
              <React.Fragment key={publicIP}>
                {/* Group Header Row */}
                <TableRow
                  className="bg-muted/50 hover:bg-muted cursor-pointer"
                  onClick={() => toggleGroup(publicIP)}
                >
                  <TableCell className="py-2">
                    <div className="flex justify-center">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell colSpan={4} className="font-medium py-2 text-sm">
                    {isStandalone
                      ? `Standalone Device (${count} device)`
                      : `Network: ${publicIP} (${count} ${count === 1 ? 'device' : 'devices'})`}
                  </TableCell>
                </TableRow>

                {/* Individual Host Rows */}
                {isExpanded &&
                  groupHosts.map((host) => (
                    <TableRow
                      key={host.id}
                      className="h-10"
                      onClick={() => selectMode && onSelect(host.id)}
                    >
                      <TableCell className="py-2 pl-8">
                        <div className="flex justify-center">
                          {getStatusDot(host.status, host.type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium py-2">
                        <div className="flex items-center space-x-2">
                          <span>{host.name}</span>
                          {host.device_type && getDeviceTypeBadge(host.device_type)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {host.ip_local || host.ip}
                        {host.type !== 'device' && host.port ? `:${host.port}` : ''}
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
                                onClick={() =>
                                  onTestConnection?.(host, { skipRevalidation: false })
                                }
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
                  ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
