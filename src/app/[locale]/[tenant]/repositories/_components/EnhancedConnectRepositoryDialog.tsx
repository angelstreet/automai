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
import { useToast } from '@/components/shadcn/use-toast';

interface EnhancedConnectRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (values: ConnectRepositoryValues) => void;
  defaultTab?: string;
}

export function EnhancedConnectRepositoryDialog({ 
  open, 
  onOpenChange,
  onSubmit,
  defaultTab = 'quick-clone'
}: EnhancedConnectRepositoryDialogProps) {
  const t = useTranslations('repositories');
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [quickCloneUrl, setQuickCloneUrl] = useState<string>('');
  const [isCloning, setIsCloning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const { toast } = useToast();
  
  const handleConnect = (provider: string) => {
    setCurrentProvider(provider);
  };

  const handleOAuthConnect = async () => {
    if (!currentProvider) return;
    
    setIsConnecting(true);
    
    try {
      // Call API to initiate OAuth flow
      const response = await fetch('/api/git-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: currentProvider,
          displayName: `My ${currentProvider === 'github' ? 'GitHub' : 'GitLab'} Account`,
          method: 'oauth'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate OAuth connection');
      }
      
      const result = await response.json();
      
      // If we have an authUrl, redirect the user to it
      if (result.success && result.authUrl) {
        window.location.href = result.authUrl;
        return;
      }
      
      // Otherwise, we're done
      if (onSubmit) {
        onSubmit({
          type: currentProvider as any,
          method: 'oauth',
          displayName: `My ${currentProvider === 'github' ? 'GitHub' : 'GitLab'} Account`
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error connecting with OAuth:', error);
      // Display error to user
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleTokenConnect = async () => {
    if (!accessToken) return;
    
    setIsConnecting(true);
    
    try {
      // Call API to connect with token
      const response = await fetch('/api/git-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: currentProvider,
          displayName: `${currentProvider === 'github' ? 'GitHub' : currentProvider === 'gitlab' ? 'GitLab' : 'Gitea'} Account`,
          method: 'token',
          token: accessToken,
          serverUrl: currentProvider === 'gitea' ? serverUrl : undefined
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect with token');
      }
      
      // Completed successfully
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
    } catch (error) {
      console.error('Error connecting with token:', error);
      // Display error to user
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleQuickClone = async () => {
    if (!quickCloneUrl) return;
    
    // Update URL pattern to allow self-hosted repositories
    // This pattern now accepts any URL with http/https protocol
    const urlPattern = /^(https?:\/\/)(.+)\/([^\/]+)\/([^\/]+)(\.git)?$/;
    if (!urlPattern.test(quickCloneUrl)) {
      toast({
        title: "Invalid Repository URL",
        description: "Please enter a valid Git repository URL (e.g., http://77.56.53.130:3000/sunri/sunri.git).",
        variant: "destructive",
      });
      return;
    }
    
    setIsCloning(true);
    
    try {
      // Verify if the repository exists before attempting to clone it
      const verifyResponse = await fetch('/api/repositories/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: quickCloneUrl,
        }),
      });
      
      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok || !verifyData.exists) {
        throw new Error(verifyData.error || 'Repository not found. Please check the URL and try again.');
      }
      
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
          description: `Imported from ${quickCloneUrl}`
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone repository');
      }
      
      if (data.success) {
        toast({
          title: "Repository Cloned",
          description: "Repository has been successfully imported.",
        });
        
        if (onSubmit) {
          onSubmit({
            type: 'quick-clone',
            url: quickCloneUrl
          });
        }
        
        setQuickCloneUrl('');
        onOpenChange(false);
      } else {
        throw new Error(data.error || 'Failed to clone repository');
      }
    } catch (error: any) {
      console.error('Error cloning repository:', error);
      toast({
        title: "Clone Failed",
        description: error.message || "Failed to clone repository. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsCloning(false);
    }
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
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="oauth" className="flex items-center justify-center">
              <Github className="w-4 h-4 mr-2" />
              {t('gitProvider')}
            </TabsTrigger>
            <TabsTrigger value="quick-clone" className="flex items-center justify-center">
              <Globe className="w-4 h-4 mr-2" />
              {t('publicRepository')}
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
                disabled={isCloning || !quickCloneUrl}
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