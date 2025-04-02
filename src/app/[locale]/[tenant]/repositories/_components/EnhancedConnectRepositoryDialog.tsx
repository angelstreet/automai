import { Github, Globe, ArrowRight, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { useToast } from '@/components/shadcn/use-toast';
import { useRepository } from '@/hooks/useRepository';
import { EnhancedConnectRepositoryDialogProps } from '@/types/context/repositoryContextType';

import { CONNECT_REPOSITORY_TABS, AUTH_METHODS } from '../constants';

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

  // Use the repository hook
  const { connectRepository, validateRepositoryUrl } = useRepository();

  const handleConnect = (provider: string) => {
    setCurrentProvider(provider);
  };

  const handleOAuthConnect = async () => {
    if (!currentProvider) return;

    setIsConnecting(true);

    try {
      // Since the createGitProvider was removed in the simplified hook,
      // we'll just show a toast message about the feature being unavailable
      toast({
        title: 'Feature Unavailable',
        description: 'Git provider OAuth connection has been simplified in this version.',
        variant: 'destructive',
      });
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
      // Since the createGitProvider was removed in the simplified hook,
      // we'll just show a toast message about the feature being unavailable
      toast({
        title: 'Feature Unavailable',
        description: 'Git provider token connection has been simplified in this version.',
        variant: 'destructive',
      });
    } catch (error: any) {
      console.error('Error during token connection:', error);
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
      // First validate the URL
      const verifyResult = await validateRepositoryUrl({ url: quickCloneUrl });

      if (!verifyResult || !verifyResult.success) {
        // Validation already shows toast, no need to show another one
        setIsCloning(false);
        return;
      }

      // Create the repository
      const repositoryData = {
        url: quickCloneUrl,
        isPrivate: false,
        description: '',
      };

      const result = await connectRepository(repositoryData);

      if (result && result.success) {
        // Refresh the page to show the new repository
        router.refresh();

        if (onSubmit) {
          onSubmit({
            url: quickCloneUrl,
            method: 'url' as const,
          });
        }

        onOpenChange(false);
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
                  <Badge variant="secondary" className="mt-2">
                    {t('selfHosted')}
                  </Badge>
                </div>
              </div>

              {currentProvider && (
                <div className="mt-6 border rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    {currentProvider === 'github' ? (
                      <GitHubIcon className="h-5 w-5 mr-2" />
                    ) : currentProvider === 'gitlab' ? (
                      <GitLabIcon className="h-5 w-5 mr-2" />
                    ) : (
                      <GiteaIcon className="h-5 w-5 mr-2" />
                    )}
                    {currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1)}{' '}
                    {t('connection')}
                  </h3>

                  <Tabs defaultValue={AUTH_METHODS.TOKEN} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      {currentProvider !== 'gitea' && (
                        <TabsTrigger value={AUTH_METHODS.OAUTH}>OAuth</TabsTrigger>
                      )}
                      <TabsTrigger value={AUTH_METHODS.TOKEN}>{t('accessToken')}</TabsTrigger>
                    </TabsList>

                    {currentProvider !== 'gitea' && (
                      <TabsContent value={AUTH_METHODS.OAUTH} className="space-y-4 mt-4">
                        <p className="text-sm">{t('oauthExplanation')}</p>

                        <Alert>
                          <AlertDescription>{t('oauthPermissions')}</AlertDescription>
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
                              {currentProvider === 'github' ? (
                                <GitHubIcon className="h-4 w-4 mr-2" />
                              ) : (
                                <GitLabIcon className="h-4 w-4 mr-2" />
                              )}
                              {t('connectWith', {
                                provider:
                                  currentProvider.charAt(0).toUpperCase() +
                                  currentProvider.slice(1),
                              })}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </TabsContent>
                    )}

                    <TabsContent value={AUTH_METHODS.TOKEN} className="space-y-4 mt-4">
                      <div className="space-y-4">
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
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    {t('cloneRepository')}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
