import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch, 
  Github, 
  GitMerge,
  RefreshCw,
  Search,
  Filter,
  Star,
  Globe,
  Lock,
  User,
  Users,
  Clock,
  Tag,
  Edit
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Custom SVG icons for the icons not available in lucide-react
const GiteaIcon = () => (
  <svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor">
    <path d="M16 0C7.212 0 0 7.212 0 16c0 7.499 5.203 13.797 12.208 15.408.5.094 1.011-.189 1.011-.689l-.008-2.864c-4.471.829-5.377-2.045-5.719-2.477-.699-1.191-2.352-1.494-1.858-2.062.586-.454 1.567-.143 2.502.79 1.248 1.245 2.848.654 3.553.261.109-.758.435-1.435.891-1.965-4.695-.855-7.143-3.646-7.143-6.965 0-1.565.56-3.088 1.674-4.331-.334-1.335-.167-2.758.488-3.974.139-.028 2.022-.438 4.608 1.709 2.481-.631 5.1-.631 7.582 0 2.585-2.147 4.469-1.737 4.608-1.709.655 1.216.822 2.639.488 3.974 1.114 1.243 1.674 2.766 1.674 4.331 0 3.319-2.448 6.11-7.143 6.965 1.356 1.573 1.272 3.923 1.272 4.724v3.152c0 .503.514.784 1.017.686C26.79 29.79 32 23.493 32 16c0-8.788-7.212-16-16-16z"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/>
    <path d="m12 5 7 7-7 7"/>
  </svg>
);

// Sample data for repositories with enhanced metadata
const SAMPLE_REPOSITORIES = [
  { 
    id: '1', 
    name: 'deployment-scripts',
    fullName: 'company/deployment-scripts',
    description: 'CI/CD and deployment automation scripts',
    provider: 'github',
    isPublic: false,
    isPinned: true,
    isOwned: false,
    isOrg: true,
    language: 'Python',
    lastUpdated: '2 days ago',
    stars: 12,
    tags: ['deployment', 'automation'],
    activity: 'High'
  },
  { 
    id: '2', 
    name: 'system-utils',
    fullName: 'username/system-utils', 
    description: 'System monitoring and maintenance utilities',
    provider: 'github',
    isPublic: true,
    isPinned: true,
    isOwned: true,
    isOrg: false,
    language: 'Bash',
    lastUpdated: '5 days ago',
    stars: 45,
    tags: ['monitoring', 'utility'],
    activity: 'Medium'
  },
  { 
    id: '3', 
    name: 'data-pipelines',
    fullName: 'department/data-pipelines', 
    description: 'ETL and data processing pipelines',
    provider: 'gitlab',
    isPublic: false,
    isPinned: false,
    isOwned: false,
    isOrg: true,
    language: 'Python',
    lastUpdated: '1 week ago',
    stars: 6,
    tags: ['data', 'etl'],
    activity: 'Low'
  },
  { 
    id: '4', 
    name: 'testing-frameworks',
    fullName: 'username/testing-frameworks', 
    description: 'Automation testing frameworks and utilities',
    provider: 'github',
    isPublic: true,
    isPinned: false,
    isOwned: true,
    isOrg: false,
    language: 'TypeScript',
    lastUpdated: '2 weeks ago',
    stars: 32,
    tags: ['testing', 'automation'],
    activity: 'Medium'
  },
  { 
    id: '5', 
    name: 'docs-generator',
    fullName: 'opensource/docs-generator', 
    description: 'Documentation generation tools',
    provider: 'gitea',
    isPublic: true,
    isPinned: false,
    isOwned: false,
    isOrg: true,
    language: 'JavaScript',
    lastUpdated: '1 month ago',
    stars: 120,
    tags: ['documentation', 'generator'],
    activity: 'High'
  },
  { 
    id: '6', 
    name: 'api-clients',
    fullName: 'department/api-clients', 
    description: 'API client libraries for internal services',
    provider: 'gitlab',
    isPublic: false,
    isPinned: false,
    isOwned: false,
    isOrg: true,
    language: 'Java',
    lastUpdated: '3 days ago',
    stars: 7,
    tags: ['api', 'client', 'internal'],
    activity: 'High'
  }
];

// Sample categories
const REPOSITORY_CATEGORIES = [
  'All',
  'Deployment',
  'Data Processing',
  'Testing',
  'Documentation',
  'APIs'
];

export default function EnhancedRepositoryPage() {
  // State for search, filters and organization
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [quickCloneUrl, setQuickCloneUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [repositories, setRepositories] = useState(SAMPLE_REPOSITORIES);
  const [activeTab, setActiveTab] = useState('all');

  // Handle quick clone
  const handleQuickClone = () => {
    if (!quickCloneUrl) return;
    
    setIsCloning(true);
    
    // Simulate API call
    setTimeout(() => {
      // Create a new repo object from the URL
      const newRepo = {
        id: Date.now().toString(),
        name: quickCloneUrl.split('/').pop().replace('.git', ''),
        fullName: quickCloneUrl.split('github.com/')[1]?.replace('.git', '') || 'unknown/repo',
        description: 'Imported from URL',
        provider: quickCloneUrl.includes('github.com') ? 'github' 
                 : quickCloneUrl.includes('gitlab.com') ? 'gitlab' : 'gitea',
        isPublic: true,
        isPinned: false,
        isOwned: false,
        isOrg: false,
        language: 'Unknown',
        lastUpdated: 'Just now',
        stars: 0,
        tags: ['imported'],
        activity: 'Low'
      };
      
      setRepositories([newRepo, ...repositories]);
      setQuickCloneUrl('');
      setIsCloning(false);
    }, 1500);
  };

  // Handle pinning a repository
  const togglePinRepository = (id) => {
    setRepositories(
      repositories.map(repo => 
        repo.id === id ? { ...repo, isPinned: !repo.isPinned } : repo
      )
    );
  };

  // Filter repositories based on current filters
  const getFilteredRepositories = () => {
    return repositories.filter(repo => {
      // Text search
      const matchesSearch = 
        searchQuery === '' || 
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Type filter
      const matchesType = 
        filterType === 'all' ||
        (filterType === 'public' && repo.isPublic) ||
        (filterType === 'private' && !repo.isPublic) ||
        (filterType === 'owned' && repo.isOwned) ||
        (filterType === 'org' && repo.isOrg) ||
        (filterType === 'pinned' && repo.isPinned);
      
      // Category filter
      const matchesCategory = 
        filterCategory === 'All' ||
        repo.tags.some(tag => tag.toLowerCase() === filterCategory.toLowerCase());
      
      return matchesSearch && matchesType && matchesCategory;
    });
  };

  // Sort repositories
  const getSortedRepositories = (repos) => {
    // Always show pinned repositories first if we're in the "all" tab
    if (activeTab === 'all' || activeTab === 'pinned') {
      repos = [...repos].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
    }
    
    // Then apply the selected sort
    return [...repos].sort((a, b) => {
      switch(sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stars':
          return b.stars - a.stars;
        case 'lastUpdated':
          // This is simplified - in a real app you'd use date objects
          return a.lastUpdated.localeCompare(b.lastUpdated);
        default:
          return 0;
      }
    });
  };

  const filteredRepositories = getFilteredRepositories();
  const sortedRepositories = getSortedRepositories(filteredRepositories);
  
  // Get repositories for the current tab
  const getTabRepositories = () => {
    switch(activeTab) {
      case 'pinned':
        return sortedRepositories.filter(repo => repo.isPinned);
      case 'public':
        return sortedRepositories.filter(repo => repo.isPublic);
      case 'private':
        return sortedRepositories.filter(repo => !repo.isPublic);
      case 'personal':
        return sortedRepositories.filter(repo => repo.isOwned);
      case 'org':
        return sortedRepositories.filter(repo => repo.isOrg);
      case 'all':
      default:
        return sortedRepositories;
    }
  };
  
  const displayRepositories = getTabRepositories();

  // Get icon for repository provider
  const getProviderIcon = (provider) => {
    switch(provider) {
      case 'github':
        return <Github className="h-5 w-5" />;
      case 'gitlab':
        return <GitMerge className="h-5 w-5" />;
      case 'gitea':
        return <span className="flex items-center justify-center h-5 w-5"><GiteaIcon /></span>;
      default:
        return <GitBranch className="h-5 w-5" />;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Repositories</h1>
            <p className="text-muted-foreground">
              Browse, organize and execute scripts from your connected repositories
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
            <Button>
              <span className="mr-2">+</span>
              Connect Repository
            </Button>
          </div>
        </div>
        

        {/* Repository Browser */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Repository Explorer</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort By..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastUpdated">Last Updated</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="stars">Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search repositories..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
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
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pinned">
                  <Star className="h-4 w-4 mr-1" />
                  Pinned
                </TabsTrigger>
                <TabsTrigger value="public">
                  <Globe className="h-4 w-4 mr-1" />
                  Public
                </TabsTrigger>
                <TabsTrigger value="private">
                  <Lock className="h-4 w-4 mr-1" />
                  Private
                </TabsTrigger>
                <TabsTrigger value="personal">
                  <User className="h-4 w-4 mr-1" />
                  Personal
                </TabsTrigger>
                <TabsTrigger value="org">
                  <Users className="h-4 w-4 mr-1" />
                  Organization
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab}>
                {displayRepositories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayRepositories.map(repo => (
                      <Card key={repo.id} className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
                        <CardHeader className="pb-2 relative">
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 ${repo.isPinned ? 'text-yellow-500' : ''}`}
                              onClick={() => togglePinRepository(repo.id)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {getProviderIcon(repo.provider)}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">
                                {repo.name}
                              </CardTitle>
                              <CardDescription className="truncate text-xs">
                                {repo.fullName}
                              </CardDescription>
                            </div>
                            {repo.isPublic ? (
                              <Badge variant="secondary" className="flex items-center">
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center">
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </Badge>
                            )}
                          </div>
                          
                          <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {repo.description}
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pb-2">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {repo.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {repo.lastUpdated}
                            </div>
                            <div className="flex items-center">
                              <div className="flex items-center mr-2">
                                <Star className="h-3 w-3 mr-1" />
                                {repo.stars}
                              </div>
                              <div className="flex items-center">
                                <Badge 
                                  variant={
                                    repo.activity === 'High' ? 'default' :
                                    repo.activity === 'Medium' ? 'secondary' : 'outline'
                                  }
                                  className="text-xs py-0 px-1.5"
                                >
                                  {repo.language}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="pt-2 border-t flex justify-between">
                          <div className="flex">
                            {repo.isOwned ? (
                              <Badge variant="outline" className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                Owner
                              </Badge>
                            ) : repo.isOrg ? (
                              <Badge variant="outline" className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                Organization
                              </Badge>
                            ) : null}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm">
                              Execute
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg">
                    <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No repositories found</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                      {searchQuery || filterCategory !== 'All' ? 
                        "No repositories match your search criteria. Try adjusting your filters." :
                        "Connect to a Git provider or use Quick Clone to import repositories."}
                    </p>
                    <Button onClick={() => {
                      setSearchQuery('');
                      setFilterCategory('All');
                      setFilterType('all');
                    }}>
                      Clear Filters
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
