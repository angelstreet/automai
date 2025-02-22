'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useUser } from "@/lib/contexts/UserContext";
import { UpgradePrompt } from '@/components/UpgradePrompt';

type Stats = {
  projects: number;
  testCases: number;
  campaigns: number;
};

export default function DashboardPage() {
  const { user, isLoading, canCreateMore } = useUser();
  const [stats, setStats] = useState<Stats>({ projects: 0, testCases: 0, campaigns: 0 });
  const t = useTranslations('Dashboard');
  const params = useParams();
  const locale = params.locale as string;
  const tenant = params.tenant as string;
  const { data: session } = useSession();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !session?.accessToken) return;
      
      try {
        const response = await fetch('/api/stats', {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, [user, session]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Session Expired</h2>
          <p className="text-muted-foreground mb-4">Please log in again to continue</p>
          <Button onClick={() => window.location.href = `/${locale}/login`}>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  const getHref = (path: string) => `/${locale}/${tenant}${path}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('welcome')}</h1>
        <div className="text-sm text-muted-foreground">
          Workspace: {tenant}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Projects Card */}
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('projects')}</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>{stats.projects} projects</span>
              <Button
                onClick={() => window.location.href = getHref('/projects/new')}
                disabled={!canCreateMore('maxProjects', stats.projects)}
              >
                Create Project
              </Button>
            </div>
            {!canCreateMore('maxProjects', stats.projects) && (
              <UpgradePrompt feature="maxProjects" />
            )}
          </div>
        </div>

        {/* Test Cases Card */}
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('testCases')}</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>{stats.testCases} test cases</span>
              <Button
                onClick={() => window.location.href = getHref('/test-cases/new')}
                disabled={!canCreateMore('maxUseCases', stats.testCases)}
              >
                Create Test Case
              </Button>
            </div>
            {!canCreateMore('maxUseCases', stats.testCases) && (
              <UpgradePrompt feature="maxUseCases" />
            )}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('quickActions')}</h2>
          <div className="space-y-2">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.location.href = getHref('/executions/new')}
              disabled={!canCreateMore('maxCampaigns', stats.campaigns)}
            >
              Run Tests
            </Button>
            {!canCreateMore('maxCampaigns', stats.campaigns) && (
              <UpgradePrompt feature="maxCampaigns" />
            )}
            {user.plan === 'ENTERPRISE' && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => window.location.href = getHref('/team')}
              >
                Manage Team
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 