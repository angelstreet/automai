import { Host } from '@/types/hosts';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { HostCard } from './HostCard';

interface HostGridProps {
  hosts: Host[];
  selectedHosts: Set<string>;
  selectMode: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (host: Host) => void;
}

export function HostGrid({
  hosts,
  selectedHosts,
  selectMode,
  onSelect,
  onDelete,
  onTestConnection,
}: HostGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {hosts.map((host) => (
        <div
          key={host.id}
          className={cn({
            'opacity-70': selectMode && !selectedHosts.has(host.id),
          })}
        >
          <div className="relative">
            {selectMode && (
              <div className="absolute right-4 top-4 z-10">
                <Checkbox
                  checked={selectedHosts.has(host.id)}
                  onCheckedChange={() => onSelect(host.id)}
                  aria-label="Select host"
                />
              </div>
            )}
            <HostCard host={host} onDelete={onDelete} onTestConnection={onTestConnection} />
          </div>
        </div>
      ))}
    </div>
  );
}
