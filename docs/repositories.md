import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ExternalLink, RefreshCw, Search, Filter } from 'lucide-react';

// Sample data - in a real app this would come from your backend
const sampleProviders = [
  { id: 1, name: 'GitHub', instanceName: 'GitHub (Personal)', url: 'https://github.com', token: 'gh_token123', color: '#24292e', type: 'github' },
  { id: 2, name: 'GitLab', instanceName: 'GitLab (Personal)', url: 'https://gitlab.com', token: 'gl_token456', color: '#fc6d26', type: 'gitlab' },
  { id: 3, name: 'Gitea', instanceName: 'Company Gitea', url: 'https://gitea.company.com', token: 'gt_token789', color: '#609926', type: 'gitea' },
  { id: 4, name: 'Gitea', instanceName: 'Personal Gitea', url: 'https://gitea.personal-server.net', token: 'gt_token101', color: '#4d7d1e', type: 'gitea' },
];

const sampleRepos = [
  { id: 1, name: 'frontend-app', provider: 'GitHub', owner: 'user1', stars: 12, lastUpdated: '2024-12-01', url: 'https://github.com/user1/frontend-app' },
  { id: 2, name: 'api-service', provider: 'GitLab', owner: 'user1', stars: 5, lastUpdated: '2024-11-15', url: 'https://gitlab.com/user1/api-service' },
  { id: 3, name: 'utils', provider: 'Gitea', owner: 'team-a', stars: 3, lastUpdated: '2024-10-22', url: 'https://gitea.io/team-a/utils' },
  { id: 4, name: 'docs', provider: 'GitHub', owner: 'user1', stars: 7, lastUpdated: '2024-12-10', url: 'https://github.com/user1/docs' },
  { id: 5, name: 'database-migrations', provider: 'GitLab', owner: 'team-b', stars: 9, lastUpdated: '2024-11-28', url: 'https://gitlab.com/team-b/database-migrations' },
];

const GitRepoAggregator = () => {
  // State
  const [providers, setProviders] = useState(sampleProviders);
  const [repos, setRepos] = useState(sampleRepos);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Provider form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    token: '',
    color: '#000000'
  });

  // Modal for adding/editing providers
  const ProviderModal = () => {
    const isEditing = Boolean(editingProvider);
    
    const handleSubmit = (e) => {
      e.preventDefault();
      
      if (isEditing) {
        // Update existing provider
        setProviders(providers.map(p => 
          p.id === editingProvider.id ? { ...formData, id: editingProvider.id } : p
        ));
        setEditingProvider(null);
      } else {
        // Add new provider
        setProviders([...providers, { ...formData, id: Date.now() }]);
      }
      
      setShowAddProviderModal(false);
      setFormData({ name: '', url: '', token: '', color: '#000000' });
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Provider' : 'Add New Provider'}</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Provider Name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded p-2"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Base URL</label>
              <input
                type="url"
                className="w-full border border-gray-300 rounded p-2"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">API Token</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded p-2"
                value={formData.token}
                onChange={(e) => setFormData({...formData, token: e.target.value})}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex items-center">
                <input
                  type="color"
                  className="h-10 w-10 mr-2"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
                <span className="text-sm">{formData.color}</span>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded"
                onClick={() => {
                  setShowAddProviderModal(false);
                  setEditingProvider(null);
                  setFormData({ name: '', url: '', token: '', color: '#000000' });
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {isEditing ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Handle editing a provider
  const handleEditProvider = (provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      url: provider.url,
      token: provider.token,
      color: provider.color
    });
    setShowAddProviderModal(true);
  };

  // Handle deleting a provider
  const handleDeleteProvider = (providerId) => {
    if (confirm("Are you sure you want to delete this provider? All associated repositories will be removed from the view.")) {
      setProviders(providers.filter(p => p.id !== providerId));
      // Also filter out repos from this provider
      const providerName = providers.find(p => p.id === providerId)?.name;
      if (providerName) {
        setRepos(repos.filter(r => r.provider !== providerName));
      }
    }
  };

  // Filter repos based on search and selected providers
  const filteredRepos = repos.filter(repo => {
    const matchesSearch = searchQuery === '' || 
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProvider = selectedProviders.length === 0 || 
      selectedProviders.includes(repo.provider);
    
    return matchesSearch && matchesProvider;
  });

  // Toggle provider filter
  const toggleProviderFilter = (providerName) => {
    setSelectedProviders(prev => 
      prev.includes(providerName)
        ? prev.filter(p => p !== providerName)
        : [...prev, providerName]
    );
  };

  // Simulate refreshing repos
  const refreshRepos = () => {
    setIsLoading(true);
    // In a real app, you would fetch from your API here
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Git Repository Aggregator</h1>
      
      {/* Providers Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Git Providers</h2>
          <button
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded"
            onClick={() => setShowAddProviderModal(true)}
          >
            <Plus size={16} className="mr-1" />
            Add Provider
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(provider => (
            <div 
              key={provider.id}
              className="border rounded-lg overflow-hidden shadow-sm"
              style={{ borderLeft: `4px solid ${provider.color}` }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg">{provider.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      className="p-1 text-gray-500 hover:text-blue-600"
                      onClick={() => handleEditProvider(provider)}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="p-1 text-gray-500 hover:text-red-600"
                      onClick={() => handleDeleteProvider(provider.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 truncate mt-1">{provider.url}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {repos.filter(r => r.provider === provider.name).length} repositories
                  </span>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={selectedProviders.includes(provider.name)}
                      onChange={() => toggleProviderFilter(provider.name)}
                    />
                    <span className="text-xs">Filter</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Repositories Section */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <h2 className="text-xl font-semibold">Repositories</h2>
          
          <div className="flex items-center space-x-3">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search repositories..."
                className="pl-8 pr-4 py-2 border rounded w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
            </div>
            
            <button 
              className="flex items-center px-3 py-2 border rounded"
              onClick={refreshRepos}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Filters */}
        {selectedProviders.length > 0 && (
          <div className="flex items-center mb-4 gap-2">
            <Filter size={16} className="text-gray-500" />
            <div className="flex flex-wrap gap-2">
              {selectedProviders.map(provider => {
                const providerData = providers.find(p => p.name === provider);
                return (
                  <span 
                    key={provider}
                    className="px-2 py-1 rounded-full text-xs flex items-center gap-1"
                    style={{ backgroundColor: `${providerData?.color}20`, color: providerData?.color }}
                  >
                    {provider}
                    <button onClick={() => toggleProviderFilter(provider)}>×</button>
                  </span>
                );
              })}
              <button 
                className="text-xs text-blue-600"
                onClick={() => setSelectedProviders([])}
              >
                Clear all
              </button>
            </div>
          </div>
        )}
        
        {/* Repository List */}
        {filteredRepos.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repository</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stars</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRepos.map(repo => {
                  const providerData = providers.find(p => p.name === repo.provider);
                  return (
                    <tr key={repo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium">{repo.name}</div>
                            <div className="text-sm text-gray-500">{repo.owner}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="px-2 py-1 rounded-full text-xs"
                          style={{ backgroundColor: `${providerData?.color}20`, color: providerData?.color }}
                        >
                          {repo.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{repo.stars}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{repo.lastUpdated}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a 
                          href={repo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 flex items-center justify-end"
                        >
                          View <ExternalLink size={14} className="ml-1" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border rounded-lg">
            <p className="text-gray-500">No repositories found matching your criteria.</p>
          </div>
        )}
      </div>
      
      {/* Add/Edit Provider Modal */}
      {showAddProviderModal && <ProviderModal />}
    </div>
  );
};

export default GitRepoAggregator;