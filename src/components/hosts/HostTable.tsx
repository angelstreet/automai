import { Host } from '@/types/hosts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Terminal, BarChart2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface HostTableProps {
  hosts: Host[];
  selectedHosts: Set<string>;
  selectMode: boolean;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (host: Host) => void;
}

export function HostTable({
  hosts,
  selectedHosts,
  selectMode,
  onSelect,
  onSelectAll,
  onDelete,
  onTestConnection,
}: HostTableProps) {
  const router = useRouter();
  const t = useTranslations('Virtualization');

  // Get status badge based on host.status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {t('connected')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            {t('failed')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            {t('pending')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{t('unknown')}</Badge>;
    }
  };

  // Format date for last connected
  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {selectMode && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedHosts.size === hosts.length}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead>Name</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Connected</TableHead>
            <TableHead>Terminal</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hosts.map((host) => (
            <TableRow
              key={host.id}
              className={cn({
                'bg-muted/50': selectedHosts.has(host.id),
              })}
            >
              {selectMode && (
                <TableCell>
                  <Checkbox
                    checked={selectedHosts.has(host.id)}
                    onCheckedChange={() => onSelect(host.id)}
                    aria-label="Select row"
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{host.name}</TableCell>
              <TableCell>
                {host.ip}
                {host.port ? `:${host.port}` : ''}
              </TableCell>
              <TableCell>{getStatusBadge(host.status)}</TableCell>
              <TableCell>
                {formatDate(host.lastConnected ? new Date(host.lastConnected) : undefined)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => router.push(`/terminals/${host.name}`)}
                  disabled={host.status !== 'connected'}
                >
                  <Terminal className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onTestConnection?.(host)}>
                        Refresh
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/metrics/${host.name}`)}>
                        Metrics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/logs/${host.name}`)}>
                        Logs
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(host.id)}
                        className="text-destructive"
                      >
                        Delete
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
