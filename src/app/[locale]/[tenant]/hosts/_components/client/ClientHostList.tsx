'use client';

import { useState } from 'react';
import { Host } from '../../types';
import { HostGrid } from '../HostGrid';
import { HostTable } from '../HostTable';

interface ClientHostListProps {
  initialHosts: Host[];
}

export default function ClientHostList({ initialHosts }: ClientHostListProps) {
  const [hosts] = useState<Host[]>(initialHosts);
  const [viewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts] = useState<Set<string>>(new Set());

  // Empty state for no hosts
  if (hosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg border border-dashed">
        <p className="mb-2 text-lg font-medium">No hosts found</p>
        <p className="text-muted-foreground mb-4">Add your first host to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {viewMode === 'grid' ? (
        <HostGrid
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={() => {}}
          onDelete={() => {}}
          onTestConnection={() => Promise.resolve(false)}
        />
      ) : (
        <HostTable
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={() => {}}
          onDelete={() => {}}
          onTestConnection={() => Promise.resolve(false)}
        />
      )}
    </div>
  );
}
