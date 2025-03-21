'use client';

import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { DeploymentWizard, DeploymentList } from './_components';
import { useDeployment } from '@/context';

const DeploymentPage = () => {
  const [view, setView] = useState('list'); // 'list' or 'create'
  const { isRefreshing, fetchDeployments } = useDeployment();

  const handleRefresh = () => {
    fetchDeployments();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        
        <div className="flex-1"></div>
        
        <div className="flex items-center gap-2 ml-auto">
          {view === 'list' && (
            <button 
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
          <button 
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setView(view === 'list' ? 'create' : 'list')}
          >
            {view === 'list' ? (
              <>
                <Plus className="h-4 w-4 mr-1" />
                New Deployment
              </>
            ) : (
              'Back to List'
            )}
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <DeploymentList onViewDeployment={(id) => console.log('View deployment:', id)} />
      ) : (
        <DeploymentWizard onComplete={() => setView('list')} />
      )}
    </>
  );
};

export default DeploymentPage;