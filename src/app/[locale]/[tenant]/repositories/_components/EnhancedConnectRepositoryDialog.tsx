import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Github, 
  Globe, 
  GitBranch,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/shadcn/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/shadcn/tabs';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Badge } from '@/components/shadcn/badge';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';
import { ConnectRepositoryValues } from '../types';
import { POPULAR_REPOSITORIES, SAMPLE_RUNNERS } from './constants';

interface EnhancedConnectRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (values: ConnectRepositoryValues) => void;
}

export function EnhancedConnectRepositoryDialog({ 
  open, 
  onOpenChange,
  onSubmit
}: EnhancedConnectRepositoryDialogProps) {
  const t = useTranslations('repositories');
  const [activeTab, setActiveTab] = useState('oauth');
  const [quickCloneUrl, setQuickCloneUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [popularCategory, setPopularCategory] = useState('CI/CD');
  const [selectedRunner, setSelectedRunner] = useState<any>(null);
  
  const handleConnect = (provider: string) => {
    setCurrentProvider(provider);
  };

  const handleOAuthConnect = () => {
    if (!currentProvider) return;
    
    setIsConnecting(true);
    
    // Simulate OAuth connection
    setTimeout(() => {
      setIsConnecting(false);
      if (onSubmit) {
        onSubmit({
          type: currentProvider as any,
          method: 'oauth',
          displayName: `My ${currentProvider === 'github' ? 'GitHub' : 'GitLab'} Account`
        });
      }
      onOpenChange(false);
    }, 1500);
  };
  
  const handleTokenConnect = () => {
    if (!accessToken) return;
    
    setIsConnecting(true);
    
    // Simulate token connection
    setTimeout(() => {
      setIsConnecting(false);
      if (onSubmit) {
        onSubmit({
          type: currentProvider as any,
          method: 'token',
          displayName: `${currentProvider === 'github' ? 'GitHub' : currentProvider === 'gitlab' ? 'GitLab' : 'Gitea'} Account`,
          accessToken,
          serverUrl: currentProvider === 'gitea' ? serverUrl : undefined
        });
      }
      onOpenChange(false);
    }, 1500);
  };
  
  const handleQuickClone = async () => {
    if (!quickCloneUrl) return;
    
    setIsCloning(true);
    
    try {
      // Call API to create repository from URL
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quickClone: true,
          url: quickCloneUrl,
          isPrivate: false,
          description: `Imported from ${quickCloneUrl}`,
          runner: selectedRunner // This field is used by the UI but not required by API
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clone repository');
      }
      
      const data = await response.json();
      
      if (onSubmit) {
        onSubmit({
          type: 'quick-clone',
          url: quickCloneUrl,
          runner: selectedRunner
        });
      }
      
      setQuickCloneUrl('');
      setSelectedRunner(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error cloning repository:', error);
      // We could add toast notifications here if needed
    } finally {
      setIsCloning(false);
    }
  };
  
  const handleClonePopularRepo = (repoUrl: string) => {
    setQuickCloneUrl(repoUrl);
    setActiveTab('quick-clone');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{t('connectRepository')}</DialogTitle>
          <DialogDescription>
            {t('connect_to_git_provider')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="oauth" className="flex items-center justify-center">
              <Github className="w-4 h-4 mr-2" />
              {t('gitProvider')}
            </TabsTrigger>
            <TabsTrigger value="quick-clone" className="flex items-center justify-center">
              <Globe className="w-4 h-4 mr-2" />
              {t('publicRepository')}
            </TabsTrigger>
            <TabsTrigger value="popular" className="flex items-center justify-center">
              <GitBranch className="w-4 h-4 mr-2" />
              {t('popularScripts')}
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
                  <GitHubIcon className="h-10 w-10 mb-2" />
                  <h3 className="font-medium text-center">GitHub</h3>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    {t('connectViaOAuthOrToken')}
                  </p>
                </div>
                
                {/* GitLab Card */}
                <div 
                  className={`p-4 border rounded-lg flex flex-col items-center transition-colors cursor-pointer hover:bg-muted ${currentProvider === 'gitlab' ? 'bg-muted ring-2 ring-primary' : ''}`}
                  onClick={() => handleConnect('gitlab')}
                >
                  <GitLabIcon className="h-10 w-10 mb-2" />
                  <h3 className="font-medium text-center">GitLab</h3>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    {t('connectViaOAuthOrToken')}
                  </p>
                </div>
                
                {/* Gitea Card */}
                <div 
                  className={`p-4 border rounded-lg flex flex-col items-center transition-colors cursor-pointer hover:bg-muted ${currentProvider === 'gitea' ? 'bg-muted ring-2 ring-primary' : ''}`}
                  onClick={() => handleConnect('gitea')}
                >
                  <GiteaIcon className="h-10 w-10 mb-2" />
                  <h3 className="font-medium text-center">Gitea</h3>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    {t('connectViaToken')}
                  </p>
                </div>
              </div>
              
              {currentProvider && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      {t('connectTo')} {
                        currentProvider === 'github' ? 'GitHub' : 
                        currentProvider === 'gitlab' ? 'GitLab' : 'Gitea'
                      }
                    </h3>
                    <Badge variant="outline">
                      {currentProvider.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <Tabs defaultValue={currentProvider === 'gitea' ? 'token' : 'oauth'} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="oauth" disabled={currentProvider === 'gitea'}>
                        OAuth
                      </TabsTrigger>
                      <TabsTrigger value="token">{t('accessToken')}</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="oauth">
                      {currentProvider !== 'gitea' ? (
                        <div className="space-y-4 mt-4">
                          <p className="text-sm">
                            {t('oauthDescription', {
                              provider: currentProvider === 'github' ? 'GitHub' : 'GitLab'
                            })}
                          </p>
                          
                          <Alert>
                            <AlertDescription>
                              {t('oauthPermissionsInfo')}
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
                                {t('connecting')}
                              </>
                            ) : (
                              <>
                                {t('continueWith')} {
                                  currentProvider === 'github' ? 'GitHub' : 'GitLab'
                                }
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 mt-4">
                          <p className="text-sm">
                            {t('giteaOAuthNotSupported')}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="token">
                      <div className="space-y-4 mt-4">
                        {currentProvider === 'gitea' && (
                          <div className="space-y-2">
                            <Label htmlFor="serverUrl">{t('serverUrl')}</Label>
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
                             currentProvider === 'gitlab' ? 'GitLab' : 'Gitea'} {t('accessToken')}
                          </Label>
                          <Input 
                            id="accessToken" 
                            placeholder={t('enterAccessToken')}
                            value={accessToken} 
                            onChange={(e) => setAccessToken(e.target.value)}
                            type="password"
                          />
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          {t('tokenGenerationInfo', {
                            provider: currentProvider === 'github' ? 'GitHub' : 
                                      currentProvider === 'gitlab' ? 'GitLab' : 'Gitea'
                          })}
                        </p>
                        
                        <Alert>
                          <AlertDescription>
                            {t('tokenSecurityInfo')}
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
                              {t('connecting')}
                            </>
                          ) : (
                            <>{t('connectRepository')}</>
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
                {t('quickCloneDescription')}
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl">{t('repositoryUrl')}</Label>
                  <Input 
                    id="repoUrl" 
                    placeholder="https://github.com/username/repository.git" 
                    value={quickCloneUrl} 
                    onChange={(e) => setQuickCloneUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('repositoryUrlDescription')}
                  </p>
                </div>
                
                
              </div>
              
              <Alert>
                <AlertDescription>
                  {t('quickCloneInfo')}
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
                    {t('cloning')}
                  </>
                ) : (
                  <>{t('cloneAndExplore')}</>
                )}
              </Button>
            </div>
          </TabsContent>
          
          {/* Popular Scripts Tab */}
          <TabsContent value="popular">
            <div className="space-y-4">
              <p className="text-sm">
                {t('popularRepositoriesDescription')}
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
                        {t('cloneRepository')}
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
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}