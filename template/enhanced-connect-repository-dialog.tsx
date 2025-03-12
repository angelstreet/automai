import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Globe, 
  Github, 
  GitMerge, 
  GitBranch, 
  Terminal
} from 'lucide-react';

// Custom SVG components for missing icons
const GiteaIcon = () => (
  <svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor">
    <path d="M16 0C7.212 0 0 7.212 0 16c0 7.499 5.203 13.797 12.208 15.408.5.094 1.011-.189 1.011-.689l-.008-2.864c-4.471.829-5.377-2.045-5.719-2.477-.699-1.191-2.352-1.494-1.858-2.062.586-.454 1.567-.143 2.502.79 1.248 1.245 2.848.654 3.553.261.109-.758.435-1.435.891-1.965-4.695-.855-7.143-3.646-7.143-6.965 0-1.565.56-3.088 1.674-4.331-.334-1.335-.167-2.758.488-3.974.139-.028 2.022-.438 4.608 1.709 2.481-.631 5.1-.631 7.582 0 2.585-2.147 4.469-1.737 4.608-1.709.655 1.216.822 2.639.488 3.974 1.114 1.243 1.674 2.766 1.674 4.331 0 3.319-2.448 6.11-7.143 6.965 1.356 1.573 1.272 3.923 1.272 4.724v3.152c0 .503.514.784 1.017.686C26.79 29.79 32 23.493 32 16c0-8.788-7.212-16-16-16z"/>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/>
    <path d="m12 5 7 7-7 7"/>
  </svg>
);

const CloneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="18" height="12" rx="2"/>
    <path d="M10 12h4"/>
    <path d="M9 18v2"/>
    <path d="M15 18v2"/>
    <path d="M9 4v2"/>
    <path d="M15 4v2"/>
  </svg>
);

// Popular public repositories by category for the quick import tab
const POPULAR_REPOSITORIES = {
  'CI/CD': [
    { 
      id: '1', 
      name: 'actions/runner-images', 
      description: 'GitHub Actions runner images',
      url: 'https://github.com/actions/runner-images.git',
      stars: '4.2k',
      category: 'CI/CD'
    },
    { 
      id: '2', 
      name: 'jenkins-x/jx3-pipeline-catalog', 
      description: 'Jenkins X Pipeline Catalog',
      url: 'https://github.com/jenkins-x/jx3-pipeline-catalog.git',
      stars: '1.7k',
      category: 'CI/CD'
    }
  ],
  'Automation': [
    { 
      id: '3', 
      name: 'ansible/ansible', 
      description: 'Ansible automation platform',
      url: 'https://github.com/ansible/ansible.git',
      stars: '58.1k',
      category: 'Automation'
    },
    { 
      id: '4', 
      name: 'puppetlabs/puppet', 
      description: 'Puppet infrastructure automation',
      url: 'https://github.com/puppetlabs/puppet.git',
      stars: '7.3k',
      category: 'Automation'
    }
  ],
  'Monitoring': [
    { 
      id: '5', 
      name: 'grafana/grafana', 
      description: 'Grafana observability platform',
      url: 'https://github.com/grafana/grafana.git',
      stars: '57.2k',
      category: 'Monitoring'
    },
    { 
      id: '6', 
      name: 'prometheus/prometheus', 
      description: 'Prometheus monitoring system',
      url: 'https://github.com/prometheus/prometheus.git',
      stars: '48.9k',
      category: 'Monitoring'
    }
  ]
};

export default function EnhancedConnectRepositoryDialog({ open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState('oauth');
  const [quickCloneUrl, setQuickCloneUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [popularCategory, setPopularCategory] = useState('CI/CD');
  const [selectedRunner, setSelectedRunner] = useState(null);
  
  // Mock runners for execution environment selection
  const runners = [
    { id: '1', name: 'Python Runner', type: 'docker', status: 'available' },
    { id: '2', name: 'Ubuntu Server', type: 'ssh', status: 'available' },
    { id: '3', name: 'Data Node', type: 'ssh', status: 'busy' }
  ];

  const handleConnect = (provider) => {
    setCurrentProvider(provider);
  };

  const handleOAuthConnect = () => {
    if (!currentProvider) return;
    
    setIsConnecting(true);
    
    // Simulate OAuth connection
    setTimeout(() => {
      setIsConnecting(false);
      onOpenChange(false);
    }, 1500);
  };
  
  const handleTokenConnect = () => {
    if (!accessToken) return;
    
    setIsConnecting(true);
    
    // Simulate token connection
    setTimeout(() => {
      setIsConnecting(false);
      onOpenChange(false);
    }, 1500);
  };
  
  const handleQuickClone = () => {
    if (!quickCloneUrl || !selectedRunner) return;
    
    setIsCloning(true);
    
    // Simulate cloning operation
    setTimeout(() => {
      setIsCloning(false);
      setQuickCloneUrl('');
      setSelectedRunner(null);
      onOpenChange(false);
    }, 2000);
  };
  
  const handleClonePopularRepo = (repoUrl) => {
    setQuickCloneUrl(repoUrl);
    setActiveTab('quick-clone');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Connect Repository</DialogTitle>
          <DialogDescription>
            Connect to a Git repository to run and manage scripts
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="oauth" className="flex items-center justify-center">
              <Github className="w-4 h-4 mr-2" />
              Git Provider
            </TabsTrigger>
            <TabsTrigger value="quick-clone" className="flex items-center justify-center">
              <Globe className="w-4 h-4 mr-2" />
              Public Repository
            </TabsTrigger>
            <TabsTrigger value="popular" className="flex items-center justify-center">
              <GitBranch className="w-4 h-4 mr-2" />
              Popular Scripts
            </TabsTrigger>
          </TabsList>
          
          {/* Git Provider Authentication Tab */}
          <TabsContent value="oauth">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* GitHub Card */}
                <div 
                  className={`p-4 border rounded-lg flex flex-col items-center transition-colors cursor-pointer hover:bg-muted ${currentProvider === 'github' ? 'bg-muted ring-2 ring-primary' : ''}`}
                  onClick={() => handleConnect('github')}
                >
                  <Github className="h-10 w-10 mb-2" />
                  <h3 className="font-medium text-center">GitHub</h3>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Connect via OAuth or token
                  </p>
                </div>
                
                {/* GitLab Card */}
                <div 
                  className={`p-4 border rounded-lg flex flex-col items-center transition-colors cursor-pointer hover:bg-muted ${currentProvider === 'gitlab' ? 'bg-muted ring-2 ring-primary' : ''}`}
                  onClick={() => handleConnect('gitlab')}
                >
                  <GitMerge className="h-10 w-10 mb-2" />
                  <h3 className="font-medium text-center">GitLab</h3>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Connect via OAuth or token
                  </p>
                </div>
                
                {/* Gitea Card */}
                <div 
                  className={`p-4 border rounded-lg flex flex-col items-center transition-colors cursor-pointer hover:bg-muted ${currentProvider === 'gitea' ? 'bg-muted ring-2 ring-primary' : ''}`}
                  onClick={() => handleConnect('gitea')}
                >
                  <div className="h-10 w-10 mb-2 flex items-center justify-center">
                    <GiteaIcon />
                  </div>
                  <h3 className="font-medium text-center">Gitea</h3>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Connect via token
                  </p>
                </div>
              </div>
              
              {currentProvider && (
                <div className="mt-6 space-y-4">
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      Connect to {
                        currentProvider === 'github' ? 'GitHub' : 
                        currentProvider === 'gitlab' ? 'GitLab' : 'Gitea'
                      }
                    </h3>
                    <Badge variant="outline">
                      {currentProvider.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <Tabs defaultValue="oauth" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="oauth" disabled={currentProvider === 'gitea'}>
                        OAuth
                      </TabsTrigger>
                      <TabsTrigger value="token">Access Token</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="oauth">
                      {currentProvider !== 'gitea' ? (
                        <div className="space-y-4 mt-4">
                          <p className="text-sm">
                            Connect with OAuth to grant access to your repositories. 
                            You'll be redirected to {
                              currentProvider === 'github' ? 'GitHub' : 'GitLab'
                            } to authorize the application.
                          </p>
                          
                          <Alert>
                            <span className="h-4 w-4 mr-2">
                              <ShieldIcon />
                            </span>
                            <AlertDescription>
                              We only request read access to your repositories to execute scripts.
                            </AlertDescription>
                          </Alert>
                          
                          <Button 
                            className="w-full" 
                            onClick={handleOAuthConnect}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                Continue with {
                                  currentProvider === 'github' ? 'GitHub' : 'GitLab'
                                }
                                <span className="w-4 h-4 ml-2">
                                  <ArrowRightIcon />
                                </span>
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 mt-4">
                          <p className="text-sm">
                            Gitea does not support OAuth authentication directly.
                            Please use the Access Token method instead.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="token">
                      <div className="space-y-4 mt-4">
                        {currentProvider === 'gitea' && (
                          <div className="space-y-2">
                            <Label htmlFor="serverUrl">Server URL</Label>
                            <Input 
                              id="serverUrl" 
                              placeholder="https://gitea.example.com" 
                              value={serverUrl} 
                              onChange={(e) => setServerUrl(e.target.value)}
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor="accessToken">
                            {currentProvider === 'github' ? 'GitHub' : 
                             currentProvider === 'gitlab' ? 'GitLab' : 'Gitea'} Access Token
                          </Label>
                          <Input 
                            id="accessToken" 
                            placeholder="Enter your access token" 
                            value={accessToken} 
                            onChange={(e) => setAccessToken(e.target.value)}
                            type="password"
                          />
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Generate a personal access token with repo scope from your {
                            currentProvider === 'github' ? 'GitHub' : 
                            currentProvider === 'gitlab' ? 'GitLab' : 'Gitea'
                          } account settings.
                        </p>
                        
                        <Alert>
                          <span className="h-4 w-4 mr-2">
                            <ShieldIcon />
                          </span>
                          <AlertDescription>
                            Your access token is securely stored and only used to access repositories.
                          </AlertDescription>
                        </Alert>
                        
                        <Button 
                          className="w-full" 
                          onClick={handleTokenConnect}
                          disabled={isConnecting || !accessToken || (currentProvider === 'gitea' && !serverUrl)}
                        >
                          {isConnecting ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>Connect Repository</>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Quick Clone Tab */}
          <TabsContent value="quick-clone">
            <div className="space-y-6">
              <p className="text-sm">
                Clone any public Git repository directly by URL without authentication.
                This is ideal for public scripts and utilities.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl">Repository URL</Label>
                  <Input 
                    id="repoUrl" 
                    placeholder="https://github.com/username/repository.git" 
                    value={quickCloneUrl} 
                    onChange={(e) => setQuickCloneUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the full URL of a public Git repository
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Select Runner</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {runners.map(runner => (
                      <div 
                        key={runner.id}
                        className={`p-3 border rounded-md transition-colors cursor-pointer hover:bg-muted ${
                          selectedRunner?.id === runner.id ? 'bg-muted ring-1 ring-primary' : ''
                        } ${runner.status === 'busy' ? 'opacity-50' : ''}`}
                        onClick={() => runner.status !== 'busy' && setSelectedRunner(runner)}
                      >
                        <div className="flex items-center">
                          <Terminal className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">{runner.name}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{runner.type}</span>
                          <Badge variant={runner.status === 'available' ? 'secondary' : 'outline'} className="text-xs">
                            {runner.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose where to clone and execute the repository scripts
                  </p>
                </div>
              </div>
              
              <Alert>
                <span className="h-4 w-4 mr-2">
                  <CloneIcon />
                </span>
                <AlertTitle>Quick Clone</AlertTitle>
                <AlertDescription>
                  Repository will be cloned directly to the selected runner for immediate execution.
                </AlertDescription>
              </Alert>
              
              <Button 
                className="w-full" 
                onClick={handleQuickClone}
                disabled={isCloning || !quickCloneUrl || !selectedRunner}
              >
                {isCloning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>Clone & Explore</>
                )}
              </Button>
            </div>
          </TabsContent>
          
          {/* Popular Scripts Tab */}
          <TabsContent value="popular">
            <div className="space-y-4">
              <p className="text-sm">
                Quickly import popular open-source script repositories by category.
                These repositories are verified and commonly used for automation tasks.
              </p>
              
              <div className="flex space-x-2 mt-4 mb-2">
                {Object.keys(POPULAR_REPOSITORIES).map(category => (
                  <Button 
                    key={category}
                    variant={popularCategory === category ? 'default' : 'outline'}
                    onClick={() => setPopularCategory(category)}
                    className="text-xs"
                  >
                    {category}
                  </Button>
                ))}
              </div>
              
              <div className="space-y-3 mt-4">
                {POPULAR_REPOSITORIES[popularCategory].map(repo => (
                  <div 
                    key={repo.id}
                    className="p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Github className="h-5 w-5 mr-2" />
                        <h3 className="font-medium">{repo.name}</h3>
                      </div>
                      <Badge variant="outline">{repo.stars}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {repo.description}
                    </p>
                    <div className="flex justify-end mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleClonePopularRepo(repo.url)}
                      >
                        Clone Repository
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
