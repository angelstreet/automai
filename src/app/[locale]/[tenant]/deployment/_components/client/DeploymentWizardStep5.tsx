'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DeploymentData } from '../../types';
import { Button } from '@/components/shadcn/button';
import { CICDProviderType } from '@/app/[locale]/[tenant]/cicd/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { FormLabel } from '@/components/shadcn/form';
import { Switch } from '@/components/shadcn/switch';

interface DeploymentWizardStep5Props {
  data: DeploymentData;
  onUpdateData: (data: Partial<DeploymentData>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  cicdProviders: CICDProviderType[];
}

export default function DeploymentWizardStep5({
  data,
  onUpdateData,
  onBack,
  onCancel,
  onSubmit,
  isPending,
  cicdProviders
}: DeploymentWizardStep5Props) {
  const t = useTranslations('deployment');
  const [autoStart, setAutoStart] = useState(data.autoStart || false);
  
  // Handle provider selection
  const handleProviderChange = (providerId: string) => {
    onUpdateData({ cicdProviderId: providerId });
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
          <CardTitle className="text-lg">{t('cicdIntegration')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FormLabel>CI/CD Provider</FormLabel>
            <Select 
              value={data.cicdProviderId || ''} 
              onValueChange={handleProviderChange}
            >
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
            <p className="text-sm text-muted-foreground">
              {t('cicdProviderDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="auto-start" 
          checked={autoStart}
          onCheckedChange={handleAutoStartToggle}
        />
        <FormLabel htmlFor="auto-start" className="cursor-pointer">
          {t('autoStart')}
        </FormLabel>
      </div>
      
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isPending}
        >
          {t('back')}
        </Button>
        
        <div className="space-x-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            {t('cancel')}
          </Button>
          
          <Button
            onClick={onSubmit}
            disabled={isPending}
          >
            {isPending ? t('creating') : t('createDeployment')}
          </Button>
        </div>
      </div>
    </div>
  );
}