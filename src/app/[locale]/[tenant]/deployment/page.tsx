import React, { useState } from 'react';
import { Plus, List, LayoutGrid, RefreshCw } from 'lucide-react';
import DeploymentWizard from './_components/DeploymentWizard';
import DeploymentList from './_components/DeploymentList';

const DeploymentPage = () => {
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  const handleRefresh = () => {
    setIsRefreshing(true);
    // In a real app, this would fetch fresh data
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deployments</h1>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-1 mr-2 flex">
                  <button 
                    className={`p-1 rounded ${viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Table view"
                  >
                    <List className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button 
                    className={`p-1 rounded ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                <button 
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </>
            )}
            <button 
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setView(view === 'list' ? 'create' : 'list')}
            >
              {view === 'list' ? (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  New Deployment
                </>
              ) : (
                'Back to List'
              )}
            </button>
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {view === 'list' 
            ? 'Manage and monitor your deployments across all environments'
            : 'Create a new deployment to run scripts on selected hosts'
          }
        </p>
      </div>

      {view === 'list' ? (
        <DeploymentList />
      ) : (
        <DeploymentWizard onComplete={() => setView('list')} />
      )}
    </div>
  );
};

export default DeploymentPage;