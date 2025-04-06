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
import { useCICD } from '@/hooks';
import { CICDProvider, CICDJob } from '@/types/component/cicdComponentType';
import { DeploymentData } from '@/types/component/deploymentComponentType';
import { Host } from '@/types/component/hostComponentType';

interface DeploymentWizardStep5ClientProps {
  data: DeploymentData;
  onUpdateData: (data: Partial<DeploymentData>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement> | (() => void);
  isPending: boolean;
  cicdProviders: CICDProvider[];
  availableHosts?: Host[];
  repositoryScripts?: any[];
}

export function DeploymentWizardStep5Client({
  data,
  onUpdateData,
  onBack,
  onCancel,
  onSubmit,
  isPending,
  cicdProviders,
  availableHosts = [],
  repositoryScripts = [],
}: DeploymentWizardStep5ClientProps) {
  const t = useTranslations('deployment');
  const c = useTranslations('common');

  // State for views and config
  const [showJenkinsView, setShowJenkinsView] = useState(!!data.cicd_provider_id);
  const [autoStart, setAutoStart] = useState(data.autoStart || false);

  // CI/CD functionality from the hook
  const {
    providers: _providers,
    getJobs: _getJobs,
    error: _cicdError,
    isLoading: _isLoadingCICD,
  } = useCICD();

  // State for CI/CD data
  const [jobs, _setJobs] = useState<CICDJob[]>([]);
  const [_isLoadingJobs, _setIsLoadingJobs] = useState(false);
  const [_jobsError, _setJobsError] = useState<string | null>(null);

  const [_jobDetails, _setJobDetails] = useState<any>(null);
  const [_isLoadingJobDetails, _setIsLoadingJobDetails] = useState(false);
  const [_jobDetailsError, _setJobDetailsError] = useState<string | null>(null);

  // Construct a Jenkins config object from props to match expected interface
  const jenkinsConfig = {
    enabled: !!data.cicd_provider_id,
    provider_id: data.cicd_provider_id,
    jobId: data.jenkinsConfig?.jobId,
    parameters: data.jenkinsConfig?.parameters || {},
  };

  // Handle toggle for Jenkins integration
  const handleJenkinsToggle = (checked: boolean) => {
    onUpdateData({
      cicd_provider_id: checked ? jenkinsConfig.provider_id || '' : '',
      jenkinsConfig: checked ? data.jenkinsConfig : undefined,
    });

    if (checked) {
      setShowJenkinsView(true);
    }
  };

  // Handle provider selection
  const handleProviderChange = (providerId: string) => {
    const provider = cicdProviders.find((p) => p.id === providerId);

    onUpdateData({
      cicd_provider_id: providerId,
      jenkinsConfig: {
        ...data.jenkinsConfig,
        enabled: true,
        provider_id: providerId,
        jobId: undefined, // Reset job when provider changes
      },
    });
  };

  // Handle job selection
  const handleJobChange = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);

    onUpdateData({
      jenkinsConfig: {
        ...data.jenkinsConfig,
        enabled: true,
        jobId,
        parameters: {}, // Reset parameters when job changes
      },
    });
  };

  // Handle parameter change
  const handleParameterChange = (name: string, value: string) => {
    onUpdateData({
      jenkinsConfig: {
        ...data.jenkinsConfig,
        enabled: true,
        parameters: {
          ...(data.jenkinsConfig?.parameters || {}),
          [name]: value,
        },
      },
    });
  };

  // Handle auto-start toggle
  const handleAutoStartToggle = (checked: boolean) => {
    setAutoStart(checked);
    onUpdateData({ autoStart: checked });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{t('wizard_review_configuration')}</h3>
        <div className="flex items-center space-x-2">
          <Switch
            id="view-toggle"
            checked={showJenkinsView}
            onCheckedChange={handleJenkinsToggle}
          />
          <label htmlFor="view-toggle" className="text-sm font-medium cursor-pointer">
            {showJenkinsView ? t('wizard_jenkins_integration') : t('wizard_summary_view')}
          </label>
        </div>
      </div>

      {showJenkinsView ? (
        // Jenkins View
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('wizard_jenkins_pipeline_preview')}</CardTitle>
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
              <p className="text-sm text-muted-foreground">
                {t('wizard_cicd_provider_description')}
              </p>
            </div>

            {data.cicd_provider_id && (
              <div className="mt-6">
                <div className="bg-gray-900 rounded-md shadow-sm border border-gray-700 p-4 overflow-auto max-h-96">
                  <pre className="text-xs text-white font-mono whitespace-pre">
                    {`pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Deploy Scripts') {
            steps {
                script {
                    // Deploy scripts to selected hosts
                    ${data.scriptIds
                      .map((scriptId) => {
                        const script = repositoryScripts.find((s) => s.id === scriptId);
                        const params = data.scriptParameters[scriptId]?.['raw'] || '';
                        return `sh "automai-deploy ${script?.path || scriptId} ${params}"`;
                      })
                      .join('\n                    ')}
                }
            }
        }
    }
}`}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Summary View
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('wizard_deployment_summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scripts */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                {t('wizard_selected_scripts')} ({data.scriptIds.length})
              </h4>
              <div className="bg-muted rounded-md p-3 overflow-auto max-h-40">
                {data.scriptIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('wizard_no_scripts')}</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.scriptIds.map((scriptId, _index) => {
                      const script = repositoryScripts.find((s) => s.id === scriptId);
                      const params = data.scriptParameters[scriptId]?.['raw'] || '';
                      return (
                        <li key={scriptId} className="flex justify-between">
                          <span className="font-mono">{script?.path || scriptId}</span>
                          {params && (
                            <span className="text-muted-foreground font-mono">{params}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Hosts */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                {t('wizard_target_hosts')} ({data.hostIds.length})
              </h4>
              <div className="bg-muted rounded-md p-3 overflow-auto max-h-40">
                {data.hostIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('wizard_no_hosts')}</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 text-sm">
                    {data.hostIds.map((hostId) => {
                      const host = availableHosts.find((h) => h.id === hostId);
                      if (!host) return null;
                      return (
                        <li key={hostId} className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${host.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}
                          ></div>
                          <span>{host.name}</span>
                          <span className="text-muted-foreground">({host.ip})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('wizard_schedule')}</h4>
              <div className="bg-muted rounded-md p-3">
                {data.schedule === 'now' ? (
                  <p className="text-sm">{t('wizard_deploy_immediately')}</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    <p>
                      {t('wizard_scheduled_for')}:{' '}
                      <span className="font-medium">{data.scheduledTime}</span>
                    </p>
                    {data.cronExpression && (
                      <p>
                        Cron:{' '}
                        <code className="bg-secondary p-1 rounded">{data.cronExpression}</code>
                      </p>
                    )}
                    {(data.repeatCount || 0) > 0 && (
                      <p>
                        {t('wizard_repeat')}:{' '}
                        <span className="font-medium">
                          {data.repeatCount} {t('wizard_times')}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            {isPending ? c('creating') : t('wizard_create_button')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeploymentWizardStep5Client;
