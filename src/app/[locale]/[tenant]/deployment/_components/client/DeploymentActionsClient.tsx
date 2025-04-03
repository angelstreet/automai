'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useCallback, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { REFRESH_DEPLOYMENTS, REFRESH_DEPLOYMENTS_COMPLETE } from './DeploymentProvider';

export function DeploymentActionsClient() {
  const t = useTranslations('deployment');
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleAddDeployment = useCallback(() => {
    router.push('/deployment/create');
  }, [router]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;

    console.log('[DeploymentActionsClient] Triggering refresh');
    setIsRefreshing(true);
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent(REFRESH_DEPLOYMENTS));
  }, [isRefreshing]);

  // Listen for refresh complete events
  useEffect(() => {
    const handleRefreshComplete = () => {
      console.log('[DeploymentActionsClient] Refresh complete');
      setIsRefreshing(false);
    };

    window.addEventListener(REFRESH_DEPLOYMENTS_COMPLETE, handleRefreshComplete);
    return () => window.removeEventListener(REFRESH_DEPLOYMENTS_COMPLETE, handleRefreshComplete);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        {t('refresh', { fallback: 'Refresh' })}
      </Button>
      <Button
        id="new-deployment-button"
        size="sm"
        className="h-8 gap-1"
        onClick={handleAddDeployment}
      >
        <PlusCircle className="h-4 w-4" />
        <span>{t('new_deployment', { fallback: 'New Deployment' })}</span>
      </Button>
    </div>
  );
}
