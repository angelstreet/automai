'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

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

// Group hosts by their public IP (gateway)
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

export function HostGridClient({
  hosts,
  selectedHosts,
  selectMode,
  onSelect,
  onDelete,
  onTestConnection,
  activeWorkspace,
}: HostGridClientProps) {
  // Initialize with all groups expanded
  const hostGroups = groupHostsByPublicIP(hosts);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(hostGroups.map((group) => group.publicIP)),
  );

  if (hosts.length === 0) {
    return (
      <div className="w-full p-4 text-center">
        <div className="text-sm text-muted-foreground">
          {activeWorkspace ? 'No hosts found in this workspace' : 'No hosts found'}
        </div>
      </div>
    );
  }

  const toggleGroup = (publicIP: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(publicIP)) {
      newExpanded.delete(publicIP);
    } else {
      newExpanded.add(publicIP);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="space-y-6">
      {hostGroups.map(({ publicIP, hosts: groupHosts, count }) => {
        const isExpanded = expandedGroups.has(publicIP);
        const isStandalone = count === 1;

        return (
          <div key={publicIP} className="space-y-3">
            {/* Group Header */}
            <div
              className="flex items-center space-x-2 cursor-pointer py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              onClick={() => toggleGroup(publicIP)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="font-medium text-sm text-foreground">
                {isStandalone
                  ? `Standalone Device (${count} device)`
                  : `Network: ${publicIP} (${count} ${count === 1 ? 'device' : 'devices'})`}
              </h3>
            </div>

            {/* Group Content */}
            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-7">
                {groupHosts.map((host) => (
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
            )}
          </div>
        );
      })}
    </div>
  );
}
