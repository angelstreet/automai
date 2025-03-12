'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { GitBranch, Plus, RefreshCw, Search, Filter, Star } from 'lucide-react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { useToast } from '@/components/shadcn/use-toast';
import { Repository, ConnectRepositoryValues } from './types';
import { REPOSITORY_CATEGORIES } from './_components/constants';

// Import components
import { EnhancedRepositoryCard } from './_components/EnhancedRepositoryCard';
import { RepositoryExplorer } from './_components/RepositoryExplorer';
import { EnhancedConnectRepositoryDialog } from './_components/EnhancedConnectRepositoryDialog';

export default function EnhancedRepositoryPage() {
  const { toast } = useToast();
  const t = useTranslations('repositories');

  // State for repositories and UI
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pinnedRepos, setPinnedRepos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [filterCategory, setFilterCategory] = useState('All');
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [isExplorerView, setIsExplorerView] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  useEffect(() => {
    // Fetch repositories
    const fetchRepositories = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would be an API call
        const response = await fetch('/api/repositories');
        if (response.ok) {
          const data = await response.json();
          setRepositories(data);
        } else {
          throw new Error('Failed to fetch repositories');
        }
      } catch (error) {
        console.error('Error fetching repositories:', error);
        
        // For demo purposes, set mock data
        const mockData: Repository[] = [
          {
            id: '1',
            name: 'deployment-scripts',
            description: 'CI/CD and deployment automation scripts',
            providerType: 'github',
            providerId: 'github-1',
            isPrivate: false,
            language: 'Python',
            lastSyncedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            defaultBranch: 'main',
            syncStatus: 'SYNCED',
            owner: 'company',
            url: 'https://github.com/company/deployment-scripts',
            createdAt: new Date(Date.now() - 3000000000).toISOString(),
            updated_at: new Date(Date.now() - 172800000).toISOString()
          },
          {
            id: '2',
            name: 'system-utils',
            description: 'System monitoring and maintenance utilities',
            providerType: 'github',
            providerId: 'github-1',
            isPrivate: true,
            language: 'Bash',
            lastSyncedAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
            defaultBranch: 'main',
            syncStatus: 'SYNCED',
            owner: 'username',
            url: 'https://github.com/username/system-utils',
            createdAt: new Date(Date.now() - 5000000000).toISOString(),
            updated_at: new Date(Date.now() - 432000000).toISOString()
          },
          {
            id: '3',
            name: 'data-pipelines',
            description: 'ETL and data processing pipelines',
            providerType: 'gitlab',
            providerId: 'gitlab-1',
            isPrivate: false,
            language: 'Python',
            lastSyncedAt: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
            defaultBranch: 'master',
            syncStatus: 'IDLE',
            owner: 'department',
            url: 'https://gitlab.com/department/data-pipelines',
            createdAt: new Date(Date.now() - 4000000000).toISOString(),
            updated_at: new Date(Date.now() - 604800000).toISOString()
          }
        ];
        setRepositories(mockData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  // Handle repository pinning/unpinning
  const handleTogglePinned = (id: string) => {
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

  // Handle repository sync
  const handleSyncRepository = async (id: string) => {
    setSyncingRepoId(id);
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update repository status
      setRepositories(prev => 
        prev.map(repo => 
          repo.id === id 
            ? { 
                ...repo, 
                syncStatus: 'SYNCED', 
                lastSyncedAt: new Date().toISOString() 
              } 
            : repo
        )
      );
      
      toast({
        title: 'Success',
        description: t('syncSuccess'),
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: t('syncFailed'),
        variant: 'destructive',
      });
    } finally {
      setSyncingRepoId(null);
    }
  };

  // Handle refreshing all repositories
  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update all repositories
      setRepositories(prev => 
        prev.map(repo => ({ 
          ...repo, 
          syncStatus: 'SYNCED', 
          lastSyncedAt: new Date().toISOString() 
        }))
      );
      
      toast({
        title: 'Success',
        description: t('refreshSuccess'),
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: t('refreshFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Handle repository connection
  const handleConnectRepository = (values: ConnectRepositoryValues) => {
    console.log('Connect repository:', values);
    
    // In a real app, this would be an API call
    // For demo purposes, add a mock repository
    if (values.type === 'quick-clone' && values.url) {
      const repoName = values.url.split('/').pop()?.replace('.git', '') || 'repo';
      const newRepo: Repository = {
        id: `repo-${Date.now()}`,
        name: repoName,
        description: 'Imported repository',
        providerType: 'github',
        providerId: 'github-1',
        isPrivate: false,
        defaultBranch: 'main',
        language: 'JavaScript',
        syncStatus: 'SYNCED',
        owner: 'imported',
        url: values.url,
        lastSyncedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setRepositories(prev => [newRepo, ...prev]);
    }
    
    toast({
      title: 'Success',
      description: t('connectSuccess'),
    });
  };

  // Filter repositories based on search query and category
  const filteredRepositories = repositories.filter(repo => {
    const matchesSearch = 
      searchQuery === '' || 
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = filterCategory === 'All'; // In a real app, would check repo tags
    
    return matchesSearch && matchesCategory;
  });

  // Sort repositories
  const sortedRepositories = [...filteredRepositories].sort((a, b) => {
    // Always show pinned repositories first in all tabs
    if (pinnedRepos.has(a.id) && !pinnedRepos.has(b.id)) return -1;
    if (!pinnedRepos.has(a.id) && pinnedRepos.has(b.id)) return 1;
    
    // Then apply selected sort
    switch(sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'lastUpdated':
        return new Date(b.lastSyncedAt || 0).getTime() - new Date(a.lastSyncedAt || 0).getTime();
      default:
        return 0;
    }
  });
  
  // Get repositories for current tab
  const getTabRepositories = () => {
    switch(activeTab) {
      case 'pinned':
        return sortedRepositories.filter(repo => pinnedRepos.has(repo.id));
      case 'public':
        return sortedRepositories.filter(repo => !repo.isPrivate);
      case 'private':
        return sortedRepositories.filter(repo => repo.isPrivate);
      case 'all':
      default:
        return sortedRepositories;
    }
  };
  
  const displayRepositories = getTabRepositories();

  // Select repository for viewing
  const handleViewRepository = (repo: Repository) => {
    setSelectedRepository(repo);
    setIsExplorerView(true);
  };

  // Return to repositories list
  const handleBackToList = () => {
    setSelectedRepository(null);
    setIsExplorerView(false);
  };

  if (isExplorerView && selectedRepository) {
    return (
      <div className="container mx-auto py-6">
        <RepositoryExplorer 
          repository={selectedRepository} 
          onBack={handleBackToList} 
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title={t('repositories')} 
        description={t('repositories_description')}
      >
        <Button onClick={() => setConnectDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add_provider')}
        </Button>
      </PageHeader>

      <div className="mt-6">
        <Card className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>{t('repositoryExplorer')}</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastUpdated">{t('lastUpdated')}</SelectItem>
                    <SelectItem value="name">{t('name')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={handleRefreshAll} 
                  disabled={isRefreshingAll}
                >
                  {isRefreshingAll ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {t('refreshing')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t('refresh')}
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchRepositories')}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {REPOSITORY_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t('all')}</TabsTrigger>
                <TabsTrigger value="pinned">
                  <Star className="h-4 w-4 mr-1" />
                  {t('pinned')}
                </TabsTrigger>
                <TabsTrigger value="public">{t('public')}</TabsTrigger>
                <TabsTrigger value="private">{t('private')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">{t('loading')}</p>
                    </div>
                  </div>
                ) : displayRepositories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayRepositories.map(repo => (
                      <div 
                        key={repo.id} 
                        onClick={() => handleViewRepository(repo)}
                        className="cursor-pointer"
                      >
                        <EnhancedRepositoryCard
                          repository={repo}
                          onSync={handleSyncRepository}
                          isSyncing={syncingRepoId === repo.id}
                          onTogglePinned={handleTogglePinned}
                          isPinned={pinnedRepos.has(repo.id)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={t('no_repositories')}
                    description={
                      searchQuery || filterCategory !== 'All' 
                        ? t('no_repos_found')
                        : t('no_repositories_description')
                    }
                    icon={<GitBranch className="h-6 w-6" />}
                    action={
                      <Button onClick={() => setConnectDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('add_provider')}
                      </Button>
                    }
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <EnhancedConnectRepositoryDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onSubmit={handleConnectRepository}
      />
    </div>
  );
}