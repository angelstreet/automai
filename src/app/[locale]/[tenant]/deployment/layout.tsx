'use client';

import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';

export default function DeploymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deployment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage deployments and CI/CD integrations
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
            onClick={() => document.dispatchEvent(new CustomEvent('refresh-deployments'))}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          <button 
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => document.dispatchEvent(new CustomEvent('toggle-deployment-view'))}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Deployment
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
} 