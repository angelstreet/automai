'use client';

import { LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip';
import { useToast } from '@/components/shadcn/use-toast';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';
import { loginToGrafana, verifyGrafanaAuth, logoutFromGrafana } from '@/utils/grafana-auth';

const DASHBOARD_URLS = {
  configOverview:
    'd/558a7504-0f4e-45b7-9662-5dd43f382a87/job-execution-metrics?orgId=1&from=now-7d&to=now&timezone=browser',
  executionMetrics:
    'd/558a7504-0f4e-45b7-9662-5dd43f382a87/job-execution-metrics?orgId=1&from=now-7d&to=now&timezone=browser',
  executionDetails:
    'd/5be5172d-0105-4bd9-b5a6-8f1dfe4c5536/job-execution-details?orgId=1&from=now-7d&to=now&timezone=browser',
};

// Base URL for your Grafana instance - update this with your actual Grafana URL
const GRAFANA_BASE_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || '';

interface GrafanaDashboardProps {
  dashboardUrl: string;
  title: string;
  teamId: string;
  theme: string;
  onLoginRequired: () => void;
}

function GrafanaDashboard({
  dashboardUrl,
  title,
  teamId,
  theme,
  onLoginRequired,
}: GrafanaDashboardProps) {
  // Add team_name and theme parameters to the URL
  const urlWithParams = `${dashboardUrl}&var-team_name=${teamId}&theme=${theme}`;

  // Ensure there are no double slashes when combining base URL and dashboard URL
  const baseUrl = GRAFANA_BASE_URL.endsWith('/') ? GRAFANA_BASE_URL.slice(0, -1) : GRAFANA_BASE_URL;
  const fullUrl = `${baseUrl}/${urlWithParams}`;
  console.log(`[@component:ReportsContentClient] Full URL: ${fullUrl}`);

  // Handle iframe load event to detect login screens
  const handleIframeLoad = (event: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    try {
      // Try to access iframe content to check for login page
      // This might fail due to same-origin policy if not logged in
      const iframe = event.target as HTMLIFrameElement;
      if (iframe.contentWindow?.location.href.includes('login')) {
        console.log(`[@component:ReportsContentClient] Login page detected in iframe`);
        onLoginRequired();
      }
    } catch {
      // If we can't access the iframe content, assume login is required
      console.log(
        `[@component:ReportsContentClient] Cannot access iframe content, login may be required`,
      );
      onLoginRequired();
    }
  };

  return (
    <div className="w-full h-[600px] rounded-md overflow-hidden border border-border relative">
      <iframe
        src={fullUrl}
        title={title}
        width="100%"
        height="100%"
        frameBorder="0"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}

interface GrafanaLoginProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

function GrafanaLogin({ onLoginSuccess, onCancel }: GrafanaLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations('reports');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginToGrafana(username, password);

      if (result.success) {
        toast({
          title: t('login_success'),
          description: t('dashboard_ready'),
        });
        onLoginSuccess();
      } else {
        toast({
          title: t('login_failed'),
          description: result.error || t('check_credentials'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('login_error'),
        description: t('connection_error'),
        variant: 'destructive',
      });
      console.error('[@component:ReportsContentClient] Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-[350px] max-w-[90%] shadow-lg">
        <CardContent className="pt-4 px-4 pb-4">
          <h3 className="text-lg font-semibold mb-3">{t('grafana_login')}</h3>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm">
                {t('username')}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">
                {t('password')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                size="sm"
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isLoading} size="sm">
                {isLoading ? t('logging_in') : t('login')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface ReportsContentClientProps {
  user: User | null;
  teamDetails: Team | null;
}

export function ReportsContentClient({ user: _user, teamDetails }: ReportsContentClientProps) {
  const t = useTranslations('reports');
  const [activeTab, setActiveTab] = useState('overview');
  const { resolvedTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const { toast } = useToast();

  // Get the active team ID from props
  const teamId = teamDetails?.id || '7fdeb4bb-3639-4ec3-959f-b54769a219ce'; // Fallback to default

  // Grafana only supports 'light' or 'dark' themes
  // Map our app theme to Grafana's supported theme values
  const grafanaTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      try {
        const isAuth = await verifyGrafanaAuth();
        setIsAuthenticated(isAuth);
        console.log(`[@component:ReportsContentClient] Authentication check completed: ${isAuth}`);
      } catch (error) {
        console.error('[@component:ReportsContentClient] Error checking authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLogin(false);
  };

  const handleLoginRequired = () => {
    // If we were previously authenticated but now require login,
    // that means our session expired
    if (isAuthenticated) {
      logoutFromGrafana();
      setIsAuthenticated(false);
      toast({
        title: t('session_expired'),
        description: t('login_required'),
        variant: 'destructive',
      });
    }
  };

  console.log(
    `[@component:ReportsContentClient] Using team ID: ${teamId}, theme: ${grafanaTheme}, authenticated: ${isAuthenticated}`,
  );

  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-2 mt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      {' '}
                      {/* Wrapper div to ensure tooltip works with disabled state */}
                      <TabsTrigger
                        value="overview"
                        disabled={!isAuthenticated}
                        className={!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        {t('config_overview')}
                      </TabsTrigger>
                    </div>
                  </TooltipTrigger>
                  {!isAuthenticated && (
                    <TooltipContent>
                      <p>{t('login_required')}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <TabsTrigger
                        value="metrics"
                        disabled={!isAuthenticated}
                        className={!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        {t('execution_metrics')}
                      </TabsTrigger>
                    </div>
                  </TooltipTrigger>
                  {!isAuthenticated && (
                    <TooltipContent>
                      <p>{t('login_required')}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <TabsTrigger
                        value="details"
                        disabled={!isAuthenticated}
                        className={!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        {t('execution_details')}
                      </TabsTrigger>
                    </div>
                  </TooltipTrigger>
                  {!isAuthenticated && (
                    <TooltipContent>
                      <p>{t('login_required')}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </TabsList>

            {/* Show login overlay globally rather than per tab */}
            {showLogin && (
              <div className="relative">
                <GrafanaLogin
                  onLoginSuccess={handleLoginSuccess}
                  onCancel={() => setShowLogin(false)}
                />
              </div>
            )}

            {isAuthenticated ? (
              <>
                {/* Show content only when authenticated */}
                <TabsContent value="overview" className="mt-0 relative">
                  <GrafanaDashboard
                    dashboardUrl={DASHBOARD_URLS.configOverview}
                    title={t('config_overview')}
                    teamId={teamId}
                    theme={grafanaTheme}
                    onLoginRequired={handleLoginRequired}
                  />
                </TabsContent>

                <TabsContent value="metrics" className="mt-0 relative">
                  <GrafanaDashboard
                    dashboardUrl={DASHBOARD_URLS.executionMetrics}
                    title={t('execution_metrics')}
                    teamId={teamId}
                    theme={grafanaTheme}
                    onLoginRequired={handleLoginRequired}
                  />
                </TabsContent>

                <TabsContent value="details" className="mt-0 relative">
                  <GrafanaDashboard
                    dashboardUrl={DASHBOARD_URLS.executionDetails}
                    title={t('execution_details')}
                    teamId={teamId}
                    theme={grafanaTheme}
                    onLoginRequired={handleLoginRequired}
                  />
                </TabsContent>
              </>
            ) : (
              <div className="mt-4 border rounded-md p-8 flex flex-col items-center justify-center gap-4 bg-muted/30">
                <LockIcon className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-medium">{t('grafana_login')}</h3>
                <p className="text-muted-foreground text-center max-w-md">{t('login_required')}</p>
                <Button size="lg" onClick={() => setShowLogin(true)} className="mt-2">
                  {t('login')}
                </Button>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
