import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Textarea } from '@/components/shadcn/textarea';
import { Deployment } from '@/types/component/deploymentComponentType';

interface ConfigDeploymentDialogClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployment: Deployment | null;
}

export function ConfigDeploymentDialogClient({
  open,
  onOpenChange,
  deployment,
}: ConfigDeploymentDialogClientProps) {
  const t = useTranslations('deployment');
  const c = useTranslations('common');

  // Get the config as a formatted JSON string for display
  const getFormattedConfig = (deployment: Deployment | null) => {
    if (!deployment || !deployment.config) return '{}';
    try {
      return JSON.stringify(deployment.config, null, 2);
    } catch (error) {
      console.error('[@component:ConfigDeploymentDialogClient] Error formatting config:', error);
      return '{}';
    }
  };

  const [formattedConfig, setFormattedConfig] = useState(getFormattedConfig(deployment));

  // Update formatted config when deployment changes
  useEffect(() => {
    if (deployment) {
      setFormattedConfig(getFormattedConfig(deployment));
    }
  }, [deployment]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('view_config')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {c('name')}
            </label>
            <div className="text-sm text-gray-900 dark:text-white">{deployment?.name || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {c('config')}
            </label>
            <Textarea
              value={formattedConfig}
              readOnly
              className="font-mono text-sm h-[300px] bg-gray-50 dark:bg-gray-900"
              spellCheck="false"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {c('close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
