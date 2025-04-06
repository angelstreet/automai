'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { FormLabel } from '@/components/shadcn/form';
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
    onUpdateData({ cicd_provider_id: providerId });
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
            <FormLabel>CI/CD Provider</FormLabel>
            <Select value={data.cicd_provider_id || ''} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a CI/CD provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
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
        <FormLabel htmlFor="auto-start" className="cursor-pointer">
          {t('wizard_auto_start')}
        </FormLabel>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          {c('back')}
        </Button>

        <div className="space-x-2">
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            {c('cancel')}
          </Button>

          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? t('creating') : t('wizard_create_button')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeploymentWizardStep5Client;
