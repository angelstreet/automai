'use client';

import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/shadcn/button';

export function HostActions() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
      >
        {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
      </Button>
      <Button size="sm" className="h-8">
        <Plus className="h-4 w-4 mr-2" />
        Add Host
      </Button>
    </div>
  );
} 