import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Github, Globe, GitBranch, ArrowRight, RefreshCw } from 'lucide-react';
import {
  testGitProviderConnection,
  createGitProvider,
  testGitRepository,
  createRepositoryFromUrl,
} from '@/app/actions/repositories';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Badge } from '@/components/shadcn/badge';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';
import {
  ConnectRepositoryValues,
  EnhancedConnectRepositoryDialogProps,
  CreateGitProviderParams,
  CreateRepositoryParams,
} from '../types';
import { CONNECT_REPOSITORY_TABS, AUTH_METHODS, PROVIDER_DISPLAY_INFO } from '../constants';
import { useToast } from '@/components/shadcn/use-toast';

export function EnhancedConnectRepositoryDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultTab = CONNECT_REPOSITORY_TABS.QUICK_CLONE,
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

  // Use router for refreshing data after actions
  const router = useRouter();

  const handleConnect = (provider: string) => {
    setCurrentProvider(provider);
  };

  const handleOAuthConnect = async () => {
    if (!currentProvider) return;

    setIsConnecting(true);

    try {
      const params: CreateGitProviderParams = {
        name: `${currentProvider} Provider`,
        provider_type: currentProvider.toLowerCase(),
        auth_type: AUTH_METHODS.OAUTH,
      };
      const result = await createGitProvider(params);

      if (result.success && result.authUrl) {
        // Store a flag in sessionStorage to refresh on return
        sessionStorage.setItem('shouldRefreshRepos', 'true');

        // Redirect to the OAuth login page
        window.location.href = result.authUrl;
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect to the git provider',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error during OAuth connection:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTokenConnect = async () => {
    if (!currentProvider || !accessToken) return;

    setIsConnecting(true);

    try {
      if (!repositoryContext) {
        toast({
          title: 'Error',
          description: 'Repository context not initialized yet. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      // Create git provider with token authentication
      const params: CreateGitProviderParams = {
        name: `${currentProvider} Provider`,
        provider_type: currentProvider.toLowerCase(),
        auth_type: AUTH_METHODS.TOKEN,
        url: serverUrl, // Optional server URL for self-hosted instances
        token: accessToken,
      };
      const result = await createGitProvider(params);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Git provider connected successfully',
          variant: 'default',
        });

        // Refresh the page to show the new provider
        router.refresh();

        if (onSubmit) {
          onSubmit({
            provider: currentProvider.toLowerCase(),
            method: AUTH_METHODS.TOKEN,
            token: accessToken,
            url: serverUrl,
          });
        }

        onOpenChange(false);
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Failed to connect to the git provider',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error connecting with token:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQuickClone = async () => {
    if (!quickCloneUrl) return;

    setIsCloning(true);

    try {
      // First verify the URL is valid
      const verifyResult = await testGitRepository({ url: quickCloneUrl });

      if (!verifyResult.success) {
        toast({
          title: 'Invalid Repository URL',
          description: verifyResult.error || 'The repository URL appears to be invalid',
          variant: 'destructive',
        });
        setIsCloning(false);
        return;
      }

      // Create the repository
      const repoName = quickCloneUrl.split('/').pop()?.replace('.git', '') || 'Repository';
      const result = await createRepositoryFromUrl(quickCloneUrl, false, '');

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Repository cloned successfully',
          variant: 'default',
        });

        // Refresh the page to show the new repository
        router.refresh();

        if (onSubmit) {
          onSubmit({
            url: quickCloneUrl,
            method: AUTH_METHODS.URL,
          });
        }

        onOpenChange(false);
      } else {
        toast({
          title: 'Clone Failed',
          description: result.error || 'Failed to clone the repository',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error cloning repository:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
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
          <DialogDescription>{t('connect_to_git_provider')}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger
              value={CONNECT_REPOSITORY_TABS.OAUTH}
              className="flex items-center justify-center"
            >
              <Github className="w-4 h-4 mr-2" />
              {t('gitProvider')}
            </TabsTrigger>
            <TabsTrigger
              value={CONNECT_REPOSITORY_TABS.QUICK_CLONE}
              className="flex items-center justify-center"
            >
              <Globe className="w-4 h-4 mr-2" />
              {t('publicRepository')}
            </TabsTrigger>
          </TabsList>

          {/* Git Provider Authentication Tab */}
          <TabsContent value={CONNECT_REPOSITORY_TABS.OAUTH}>
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
                      {t('connectTo')}{' '}
                      {currentProvider === 'github'
                        ? 'GitHub'
                        : currentProvider === 'gitlab'
                          ? 'GitLab'
                          : 'Gitea'}
                    </h3>
                    <Badge variant="outline">{currentProvider.toUpperCase()}</Badge>
                  </div>

                  <Tabs
                    defaultValue={
                      currentProvider === 'gitea' ? AUTH_METHODS.TOKEN : AUTH_METHODS.OAUTH
                    }
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger
                        value={AUTH_METHODS.OAUTH}
                        disabled={currentProvider === 'gitea'}
                      >
                        OAuth
                      </TabsTrigger>
                      <TabsTrigger value={AUTH_METHODS.TOKEN}>{t('accessToken')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value={AUTH_METHODS.OAUTH}>
                      {currentProvider !== 'gitea' ? (
                        <div className="space-y-4 mt-4">
                          <p className="text-sm">
                            {t('oauthDescription', {
                              provider: currentProvider === 'github' ? 'GitHub' : 'GitLab',
                            })}
                          </p>

                          <Alert>
                            <AlertDescription>{t('oauthPermissionsInfo')}</AlertDescription>
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
                                {t('continueWith')}{' '}
                                {currentProvider === 'github' ? 'GitHub' : 'GitLab'}
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 mt-4">
                          <p className="text-sm">{t('giteaOAuthNotSupported')}</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value={AUTH_METHODS.TOKEN}>
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
                            {currentProvider === 'github'
                              ? 'GitHub'
                              : currentProvider === 'gitlab'
                                ? 'GitLab'
                                : 'Gitea'}{' '}
                            {t('accessToken')}
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
                            provider:
                              currentProvider === 'github'
                                ? 'GitHub'
                                : currentProvider === 'gitlab'
                                  ? 'GitLab'
                                  : 'Gitea',
                          })}
                        </p>

                        <Alert>
                          <AlertDescription>{t('tokenSecurityInfo')}</AlertDescription>
                        </Alert>

                        <Button
                          className="w-full"
                          onClick={handleTokenConnect}
                          disabled={
                            isConnecting ||
                            !accessToken ||
                            (currentProvider === 'gitea' && !serverUrl)
                          }
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
          <TabsContent value={CONNECT_REPOSITORY_TABS.QUICK_CLONE}>
            <div className="space-y-6">
              <p className="text-sm">{t('quickCloneDescription')}</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl">{t('repositoryUrl')}</Label>
                  <Input
                    id="repoUrl"
                    placeholder="https://github.com/username/repository.git"
                    value={quickCloneUrl}
                    onChange={(e) => setQuickCloneUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t('repositoryUrlDescription')}</p>
                </div>
              </div>

              <Alert>
                <AlertDescription>{t('quickCloneInfo')}</AlertDescription>
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
      </DialogContent>
    </Dialog>
  );
}
