import React from 'react';

export function JobRunsSkeleton() {
  return (
    <div className="container mx-auto p-4 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-12 mx-auto"></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-8 mx-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}