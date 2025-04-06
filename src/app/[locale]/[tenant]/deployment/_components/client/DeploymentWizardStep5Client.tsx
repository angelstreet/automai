'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Switch } from '@/components/shadcn/switch';
import { CICDProvider } from '@/types/component/cicdComponentType';
import { DeploymentData } from '@/types/component/deploymentComponentType';

interface DeploymentWizardStep5ClientProps {
  data: DeploymentData;
  onUpdateData: (data: Partial<DeploymentData>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement> | (() => void);
  isPending: boolean;
  cicdProviders: CICDProvider[];
}

export function DeploymentWizardStep5Client({
  data,
  onUpdateData,
  onBack,
  onCancel,
  onSubmit,
  isPending,
  cicdProviders,
}: DeploymentWizardStep5ClientProps) {
  const t = useTranslations('deployment');
  const c = useTranslations('common');
  const [autoStart, setAutoStart] = useState(data.autoStart || false);

  // Handle provider selection
  const handleProviderChange = (providerId: string) => {
    // Convert "none" to empty string for backend compatibility
    onUpdateData({ cicd_provider_id: providerId === 'none' ? '' : providerId });
  };

  // Handle auto-start toggle
  const handleAutoStartToggle = (checked: boolean) => {
    setAutoStart(checked);
    onUpdateData({ autoStart: checked });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('wizard_cicd_integration')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              CI/CD Provider
            </label>
            <Select value={data.cicd_provider_id || 'none'} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a CI/CD provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {cicdProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{t('wizard_cicd_provider_description')}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center space-x-2">
        <Switch id="auto-start" checked={autoStart} onCheckedChange={handleAutoStartToggle} />
        <label
          htmlFor="auto-start"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          {t('wizard_auto_start')}
        </label>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          {c('back')}
        </Button>

        <div className="space-x-2">
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            {c('cancel')}
          </Button>

          <Button
            onClick={(e) => {
              e.preventDefault();
              if (typeof onSubmit === 'function') {
                if ('length' in onSubmit && onSubmit.length === 0) {
                  // It's a () => void function
                  (onSubmit as () => void)();
                } else {
                  // It's a FormEventHandler
                  (onSubmit as React.FormEventHandler<HTMLFormElement>)(
                    e as unknown as React.FormEvent<HTMLFormElement>,
                  );
                }
              }
            }}
            disabled={isPending}
          >
            {isPending ? t('creating') : t('wizard_create_button')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeploymentWizardStep5Client;
