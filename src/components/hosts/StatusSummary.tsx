import { Badge } from '@/components/shadcn/badge';
import { CheckCircle2, AlertCircle, Server } from 'lucide-react';

interface StatusSummaryProps {
  vmStatusSummary: {
    running: number;
    warning: number;
    error: number;
    total: number;
  };
  onStatusFilter?: (status: string | null) => void;
  selectedFilters?: Set<string>;
}

export function StatusSummary({
  vmStatusSummary,
  onStatusFilter = () => {},
  selectedFilters = new Set<string>(),
}: StatusSummaryProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center">
        <Badge
          variant="outline"
          className={`
            px-3 py-1 cursor-pointer transition-colors
            ${
              selectedFilters.has('running')
                ? 'bg-green-500/20 text-green-500 border-green-500/40'
                : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/15'
            }
          `}
          onClick={() => {
            if (selectedFilters.has('running')) {
              const newFilters = new Set(selectedFilters);
              newFilters.delete('running');
              onStatusFilter(newFilters.size ? Array.from(newFilters)[0] : null);
            } else {
              onStatusFilter('running');
            }
          }}
        >
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Running: {vmStatusSummary.running}
        </Badge>
      </div>
      <div className="flex items-center">
        <Badge
          variant="outline"
          className={`
            px-3 py-1 cursor-pointer transition-colors
            ${
              selectedFilters.has('warning')
                ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40'
                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/15'
            }
          `}
          onClick={() => {
            if (selectedFilters.has('warning')) {
              const newFilters = new Set(selectedFilters);
              newFilters.delete('warning');
              onStatusFilter(newFilters.size ? Array.from(newFilters)[0] : null);
            } else {
              onStatusFilter('warning');
            }
          }}
        >
          <AlertCircle className="mr-1 h-4 w-4" />
          Warning: {vmStatusSummary.warning}
        </Badge>
      </div>
      <div className="flex items-center">
        <Badge
          variant="outline"
          className={`
            px-3 py-1 cursor-pointer transition-colors
            ${
              selectedFilters.has('error')
                ? 'bg-red-500/20 text-red-500 border-red-500/40'
                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15'
            }
          `}
          onClick={() => {
            if (selectedFilters.has('error')) {
              const newFilters = new Set(selectedFilters);
              newFilters.delete('error');
              onStatusFilter(newFilters.size ? Array.from(newFilters)[0] : null);
            } else {
              onStatusFilter('error');
            }
          }}
        >
          <AlertCircle className="mr-1 h-4 w-4" />
          Error: {vmStatusSummary.error}
        </Badge>
      </div>
      <div className="flex items-center">
        <Badge
          variant="outline"
          className={`
            px-3 py-1 cursor-pointer transition-colors
            ${
              selectedFilters.size === 0
                ? 'bg-blue-500/20 text-blue-500 border-blue-500/40'
                : 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/15'
            }
          `}
          onClick={() => onStatusFilter(null)}
        >
          <Server className="mr-1 h-4 w-4" />
          Total: {vmStatusSummary.total}
        </Badge>
      </div>
    </div>
  );
}
