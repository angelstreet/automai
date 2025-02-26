import { Machine } from '@/types/virtualization';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Terminal, BarChart2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface HostTableProps {
  machines: Machine[];
  selectedMachines: Set<string>;
  selectMode: boolean;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (machine: Machine) => void;
}

export function HostTable({
  machines,
  selectedMachines,
  selectMode,
  onSelect,
  onSelectAll,
  onDelete,
  onTestConnection,
}: HostTableProps) {
  const router = useRouter();
  const t = useTranslations('Virtualization');

  // Get status badge based on machine status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('connected')}</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t('failed')}</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('pending')}</Badge>;
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
                  checked={selectedMachines.size === machines.length}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead>Name</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Connected</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {machines.map((machine) => (
            <TableRow key={machine.id} className={cn({
              "bg-muted/50": selectedMachines.has(machine.id),
            })}>
              {selectMode && (
                <TableCell>
                  <Checkbox
                    checked={selectedMachines.has(machine.id)}
                    onCheckedChange={() => onSelect(machine.id)}
                    aria-label="Select row"
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{machine.name}</TableCell>
              <TableCell>{machine.ip}{machine.port ? `:${machine.port}` : ''}</TableCell>
              <TableCell>{getStatusBadge(machine.status)}</TableCell>
              <TableCell>{formatDate(machine.lastConnected ? new Date(machine.lastConnected) : undefined)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/terminals/${machine.name}`)}
                    disabled={machine.status !== 'connected'}
                  >
                    <Terminal className="h-4 w-4 mr-2" />
                    Terminal
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onTestConnection?.(machine)}>
                        Refresh
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/metrics/${machine.name}`)}>
                        Metrics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/logs/${machine.name}`)}>
                        Logs
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete?.(machine.id)} className="text-destructive">
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