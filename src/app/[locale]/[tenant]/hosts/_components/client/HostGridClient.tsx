'use client';

import { Checkbox } from '@/components/shadcn/checkbox';
import { cn } from '@/lib/utils';
import { Host } from '@/types/component/hostComponentType';

import { HostCardClient } from './HostCardClient';

interface HostGridClientProps {
  hosts: Host[];
  selectedHosts: Set<string>;
  selectMode: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (host: Host, options?: { skipRevalidation?: boolean }) => Promise<boolean>;
}

export function HostGridClient({
  hosts,
  selectedHosts,
  selectMode,
  onSelect,
  onDelete,
  onTestConnection,
}: HostGridClientProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {hosts.map((host) => (
        <div
          key={host.id}
          className={cn({
            'opacity-70': selectMode && !selectedHosts.has(host.id),
          })}
        >
          <div className="relative h-full">
            {selectMode && (
              <div className="absolute right-4 top-4 z-10">
                <Checkbox
                  checked={selectedHosts.has(host.id)}
                  onCheckedChange={() => onSelect(host.id)}
                  aria-label="Select host"
                />
              </div>
            )}
            <HostCardClient
              host={host}
              onDelete={onDelete}
              onTestConnection={onTestConnection}
              key={`card-${host.id}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
