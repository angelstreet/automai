import React, { useState } from 'react';
import { GitBranch, Plus, RefreshCw, Search, Filter, Star, ArrowLeft, ExternalLink, Lock, Globe } from 'lucide-react';

// Mock repositories data
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

export default function RepositoryPagePreview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [pinnedRepos, setPinnedRepos] = useState(new Set(['1']));
  const [hoveredRepo, setHoveredRepo] = useState(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  
  // Toggle pinned status
  const handleTogglePinned = (id) => {
    setPinnedRepos(prev => {
      const newPinned = new Set(prev);
      if (newPinned.has(id)) {
        newPinned.delete(id);
      } else {
        newPinned.add(id);
      }
      return newPinned;
    });
  };
  
  // Filter repos based on tab
  const getTabRepositories = () => {
    switch(activeTab) {
      case 'pinned':
        return MOCK_REPOSITORIES.filter(repo => pinnedRepos.has(repo.id));
      case 'public':
        return MOCK_REPOSITORIES.filter(repo => !repo.isPrivate);
      case 'private':
        return MOCK_REPOSITORIES.filter(repo => repo.isPrivate);
      case 'all':
      default:
        return MOCK_REPOSITORIES;
    }
  };
  
  const displayRepositories = getTabRepositories();
  
  // Mock dialog for UI demo
  const ConnectDialog = ({ open, onClose }) => {
    if (!open) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-4 shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Connect Repository</h2>
          <p className="text-gray-600 mb-4">Connect to a Git provider to browse repositories</p>
          
          <div className="flex gap-2 justify-end">
            <button 
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={onClose}
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="text-gray-600">Browse, manage and execute scripts from your connected repositories</p>
        </div>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          onClick={() => setShowConnectDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </button>
      </div>

      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Repository Explorer</h2>
            <button className="px-3 py-1.5 border rounded-md hover:bg-gray-50 flex items-center text-sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                placeholder="Search repositories..."
                className="pl-8 pr-4 py-2 border rounded w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select className="border rounded px-3 py-2">
                <option>All Categories</option>
                <option>Deployment</option>
                <option>Data Processing</option>
                <option>Testing</option>
              </select>
              <button className="p-2 border rounded">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-4 pt-4">
          <div className="flex border-b">
            <button 
              className={`px-4 py-2 border-b-2 font-medium text-sm ${activeTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button 
              className={`px-4 py-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'pinned' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
              onClick={() => setActiveTab('pinned')}
            >
              <Star className="h-4 w-4 mr-1" />
              Pinned
            </button>
            <button 
              className={`px-4 py-2 border-b-2 font-medium text-sm ${activeTab === 'public' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
              onClick={() => setActiveTab('public')}
            >
              Public
            </button>
            <button 
              className={`px-4 py-2 border-b-2 font-medium text-sm ${activeTab === 'private' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
              onClick={() => setActiveTab('private')}
            >
              Private
            </button>
          </div>
          
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayRepositories.map(repo => (
                <div 
                  key={repo.id} 
                  onMouseEnter={() => setHoveredRepo(repo.id)}
                  onMouseLeave={() => setHoveredRepo(null)}
                >
                  <RepositoryCard
                    repository={repo}
                    isPinned={pinnedRepos.has(repo.id)}
                    isHovered={hoveredRepo === repo.id}
                    onPin={(e) => {
                      e.stopPropagation(); 
                      handleTogglePinned(repo.id);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <ConnectDialog 
        open={showConnectDialog} 
        onClose={() => setShowConnectDialog(false)}
      />
    </div>
  );
}