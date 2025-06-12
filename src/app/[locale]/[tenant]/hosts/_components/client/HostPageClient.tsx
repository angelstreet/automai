'use client';

import { useState } from 'react';
import { Host } from '@/types/component/hostComponentType';
import HostContentClient from './HostContentClient';
import HostActionsClient from './HostActionsClient';

interface HostPageClientProps {
  initialHosts: Host[];
}

export default function HostPageClient({ initialHosts }: HostPageClientProps) {
  // Simple local state for view mode
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const toggleViewMode = () => {
    setViewMode(current => current === 'grid' ? 'table' : 'grid');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex-1" />
        <HostActionsClient 
          hostCount={initialHosts.length}
          viewMode={viewMode}
          onViewModeToggle={toggleViewMode}
        />
      </div>
      
      <HostContentClient 
        initialHosts={initialHosts}
        viewMode={viewMode}
      />
    </div>
  );
} 