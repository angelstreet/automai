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
  activeWorkspace?: string | null;
}

export function HostGridClient({
  hosts,
  selectedHosts,
  selectMode,
  onSelect,
  onDelete,
  onTestConnection,
  activeWorkspace,
}: HostGridClientProps) {
  if (hosts.length === 0) {
    return (
      <div className="w-full p-4 text-center">
        <div className="text-sm text-muted-foreground">
          {activeWorkspace ? 'No hosts found in this workspace' : 'No hosts found'}
        </div>
      </div>
    );
  }

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
