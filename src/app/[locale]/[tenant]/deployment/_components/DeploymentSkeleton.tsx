import { Skeleton } from '@/components/shadcn/skeleton';

export function DeploymentSkeleton() {
  // Create an array to represent 6 deployment items
  const skeletonItems = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="w-full space-y-4">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>

      {/* List skeleton */}
      <div className="rounded-md border">
        <div className="border-b p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>

        {skeletonItems.map((index) => (
          <div key={index} className="p-4 border-b last:border-0">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex space-x-2 items-center">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
