'use client';

import React, { useState } from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/shadcn/button';

export function DeploymentActions() {
  const t = useTranslations('deployments');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Add refresh logic here when needed
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleAddDeployment = () => {
    // Dispatch event to open deployment wizard
    window.dispatchEvent(new CustomEvent('open-deployment-wizard'));
  };

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
        {t('refresh')}
      </Button>
      <Button
        onClick={handleAddDeployment}
        id="add-deployment-button"
        size="sm"
        className="h-8 gap-1"
      >
        <PlusCircle className="h-4 w-4" />
        <span>{t('create')}</span>
      </Button>
    </div>
  );
}
