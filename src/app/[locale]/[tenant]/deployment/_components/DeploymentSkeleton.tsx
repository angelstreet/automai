import { Skeleton } from '@/components/shadcn/skeleton';

export function DeploymentSkeleton() {
  // Create an array to represent 5 deployment items
  const skeletonItems = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className="w-full">
      <div className="bg-transparent dark:bg-transparent rounded-lg border-0 shadow-none">
        {/* Search and filters area */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-9 w-full sm:w-64 rounded-md" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </div>
        </div>

        {/* Tabs area */}
        <div className="p-4">
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex -mb-px">
              {['All', 'Scheduled', 'Pending', 'Active', 'Completed'].map((tab, _index) => (
                <Skeleton key={tab} className="h-8 w-24 mr-2" />
              ))}
            </div>
          </div>

          {/* Table area */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-transparent dark:bg-transparent">
                <tr>
                  {['Name', 'Repository', 'Status', 'Created', 'Runtime', 'Actions'].map((header) => (
                    <th key={header} className="px-2 py-1 text-left text-xs font-medium">
                      <Skeleton className="h-4 w-full max-w-[80px]" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-transparent dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                {skeletonItems.map((index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap flex justify-center space-x-2">
                      <Skeleton className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                      <Skeleton className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                      <Skeleton className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
