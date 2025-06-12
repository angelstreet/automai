'use client';

import { useEffect, useState } from 'react';

import { Skeleton } from '@/components/shadcn/skeleton';

interface HostSkeletonProps {
  hostCount?: number;
}

export default function HostSkeleton({ hostCount = 0 }: HostSkeletonProps) {
  // Get view mode from Zustand store
  // Note: This is a client component using hooks in a component that might be rendered on the server
  // We need to handle this carefully to avoid hydration issues
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Simple default - no store access needed
  }, []);

  // Calculate how many items to show in skeleton
  // Minimum of 3 for better visual (even when only 1-2 hosts exist)
  // Maximum of 6 to avoid too much skeleton content
  const itemsToShow = hostCount > 0 ? Math.max(3, Math.min(hostCount, 6)) : 0;

  // Render header with action buttons
  const renderHeader = () => (
    <div className="flex justify-between items-center mb-6">
      <Skeleton className="h-8 w-64" />
      <div className="flex items-center gap-2">
        {/* Only show toggle and refresh buttons if we have hosts */}
        {hostCount > 0 && (
          <>
            <Skeleton className="h-8 w-8 rounded" /> {/* Toggle view button */}
            <Skeleton className="h-8 w-24 rounded" /> {/* Refresh button */}
          </>
        )}
        <Skeleton className="h-8 w-28 rounded" /> {/* Add button (always visible) */}
      </div>
    </div>
  );

  // Render grid view skeleton
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array(itemsToShow)
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
  );

  // Render table view skeleton
  const renderTableView = () => (
    <div className="rounded-md border">
      {/* Table Header */}
      <div className="border-b bg-muted/40 px-4 py-3 flex items-center gap-4">
        <Skeleton className="h-4 w-4 rounded" /> {/* Checkbox */}
        <div className="grid grid-cols-6 gap-4 w-full">
          <Skeleton className="h-5 w-28" /> {/* Name */}
          <Skeleton className="h-5 w-24" /> {/* Type */}
          <Skeleton className="h-5 w-32" /> {/* IP Address */}
          <Skeleton className="h-5 w-20" /> {/* Status */}
          <Skeleton className="h-5 w-28" /> {/* Created */}
          <Skeleton className="h-5 w-16" /> {/* Actions */}
        </div>
      </div>

      {/* Table Rows */}
      {Array(itemsToShow)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="border-b px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-4 w-4 rounded" /> {/* Checkbox */}
            <div className="grid grid-cols-6 gap-4 w-full">
              <Skeleton className="h-5 w-32" /> {/* Name */}
              <Skeleton className="h-5 w-16" /> {/* Type */}
              <Skeleton className="h-5 w-28" /> {/* IP Address */}
              <Skeleton className="h-5 w-20" /> {/* Status */}
              <Skeleton className="h-5 w-24" /> {/* Created */}
              <div className="flex space-x-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            </div>
          </div>
        ))}
    </div>
  );

  // If hostCount is 0, show empty state skeleton
  if (hostCount === 0) {
    return (
      <div className="space-y-4 p-4">
        {renderHeader()}
        <div className="p-6 flex flex-col items-center justify-center border rounded-lg min-h-[200px]">
          <Skeleton className="h-10 w-10 rounded-full mb-4" /> {/* Icon */}
          <Skeleton className="h-6 w-48 mb-2" /> {/* Title */}
          <Skeleton className="h-4 w-64 mb-6" /> {/* Description */}
          <Skeleton className="h-9 w-32 rounded" /> {/* Button */}
        </div>
      </div>
    );
  }

  // Otherwise show normal skeleton with grid/table content
  return (
    <div className="space-y-4 p-4">
      {renderHeader()}
      {!mounted || viewMode === 'grid' ? renderGridView() : renderTableView()}
    </div>
  );
}
