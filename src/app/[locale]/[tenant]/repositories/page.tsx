'use client';

import {
  GitBranch,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Star,
  ExternalLink,
  Lock,
  Globe } 
  from 'lucide-react';
import React, { useState } from 'react';


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