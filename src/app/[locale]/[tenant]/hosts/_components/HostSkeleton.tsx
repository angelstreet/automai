'use client';

import { Grid, List, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Skeleton } from '@/components/shadcn/skeleton';

export default function HostSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Grid className="h-4 w-4" />
        </Button>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Host
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="border rounded-lg p-4 hover:shadow-sm transition-shadow duration-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48 mb-1" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex justify-between mt-4">
                <Skeleton className="h-6 w-16" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
