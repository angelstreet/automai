/**
 * Repositories constants
 * Mock repositories data
 */

const MOCK_REPOSITORIES = [
    {
      id: '1',
      name: 'deployment-scripts',
      description: 'CI/CD and deployment automation scripts',
      provider: 'github',
      isPrivate: false,
      language: 'Python',
      lastSyncedAt: 'a few days ago',
      defaultBranch: 'main',
      syncStatus: 'SYNCED',
      owner: 'company'
    },
    {
      id: '2',
      name: 'system-utils',
      description: 'System monitoring and maintenance utilities for cloud environments',
      provider: 'github',
      isPrivate: true,
      language: 'Bash',
      lastSyncedAt: '5 days ago',
      defaultBranch: 'main',
      syncStatus: 'SYNCED',
      owner: 'username'
    },
    {
      id: '3',
      name: 'data-pipelines',
      description: 'ETL and data processing pipelines for analytics',
      provider: 'gitlab',
      isPrivate: false,
      language: 'Python',
      lastSyncedAt: '1 week ago',
      defaultBranch: 'master',
      syncStatus: 'IDLE',
      owner: 'department'
    }
  ];
  
  // Repository Card Component
  const RepositoryCard = ({ repository, isPinned, isHovered, onPin }) => {
    return (
      <div 
        className={`border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md p-4 relative ${isHovered ? 'shadow-md' : ''}`}
      >
        <div className="absolute top-2 right-2">
          <button 
            className={`p-1 rounded-full ${isPinned ? 'text-yellow-500' : 'text-gray-400'}`}
            onClick={onPin}
          >
            <Star className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <GitBranch className="h-5 w-5" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold truncate">
              {repository.name}
            </div>
            <div className="truncate text-xs text-gray-500">
              {repository.owner}/{repository.name}
            </div>
          </div>
          {repository.isPrivate ? (
            <div className="px-2 py-1 rounded-full text-xs flex items-center border">
              <Lock className="h-3 w-3 mr-1" />
              Private
            </div>
          ) : (
            <div className="px-2 py-1 rounded-full text-xs flex items-center bg-gray-100">
              <Globe className="h-3 w-3 mr-1" />
              Public
            </div>
          )}
        </div>
        
        <div className="mt-2 text-sm text-gray-600 line-clamp-2">
          {repository.description}
        </div>
        
        <div className="mt-4 flex items-center text-xs text-gray-500">
          <GitBranch className="h-3 w-3 mr-1" />
          {repository.defaultBranch || 'main'}
          <div 
            className={`ml-2 px-2 py-0.5 rounded-full text-xs 
              ${repository.language === 'Python' ? 'bg-blue-100 text-blue-800' : 
                repository.language === 'Bash' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
          >
            {repository.language}
          </div>
          <div className="ml-auto flex items-center">
            <div className="h-3 w-3 mr-1">⏱️</div>
            {repository.lastSyncedAt}
          </div>
        </div>
        
        {isHovered && (
          <div className="mt-4 pt-2 border-t flex justify-between">
            <div className="flex items-center gap-2">
              <div className={`px-2 py-0.5 rounded-full text-xs ${repository.syncStatus === 'SYNCED' ? 'bg-blue-100 text-blue-800' : 'border'}`}>
                {repository.syncStatus}
              </div>
            </div>
            <div className="flex gap-1">
              <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-md flex items-center">
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </button>
              <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-md flex items-center">
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };