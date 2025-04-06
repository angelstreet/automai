'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

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
  _onCancel: () => void;
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
  _onCancel,
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
    const _provider = cicdProviders.find((p) => p.id === providerId);

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
  const _handleJobChange = (jobId: string) => {
    const _job = jobs.find((j) => j.id === jobId);

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
  const _handleParameterChange = (name: string, value: string) => {
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {c('back')}
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">{t('wizard_summary_view')}</span>
            <Switch
              checked={showJenkinsView}
              onCheckedChange={(checked) => {
                setShowJenkinsView(checked);
                if (checked) {
                  handleJenkinsToggle(true);
                }
              }}
            />
            <span className="text-xs text-gray-500">{t('wizard_jenkins_view')}</span>
          </div>
        </div>

        <button
          type="button"
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
          className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {t('wizard_creating')}
            </>
          ) : (
            t('wizard_create_deployment')
          )}
        </button>
      </div>

      <div className="space-y-4">
        {showJenkinsView ? (
          // Jenkins View
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('wizard_jenkins_pipeline_preview')}
            </h4>

            <div className="space-y-2">
              {/* Jenkins Provider Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">
                  CI/CD Provider
                </label>
                <Select
                  value={data.cicd_provider_id || 'none'}
                  onValueChange={handleProviderChange}
                >
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
              </div>

              <code className="block bg-gray-900 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto whitespace-pre text-gray-300">
                {`pipeline {
    agent any
    
    parameters {
        string(name: 'DEPLOYMENT_NAME', defaultValue: '${data.name || 'deployment'}', description: 'Deployment name')
        string(name: 'REPOSITORY', defaultValue: '${data.repositoryId || ''}', description: 'Repository')
        ${
          data.schedule === 'later'
            ? `string(name: 'SCHEDULED_TIME', defaultValue: '${data.scheduledTime || ''}', description: 'Scheduled time')`
            : '// Immediate deployment'
        }
    }
    
    stages {
        stage('Prepare') {
            steps {
                echo "Preparing deployment: \${params.DEPLOYMENT_NAME}"
                checkout scm
            }
        }
        
        stage('Deploy to Hosts') {
            steps {
                script {
                    def hosts = ${JSON.stringify(
                      data.hostIds.map((id) => {
                        const host = availableHosts.find((h) => h.id === id);
                        return host ? `${host.name} (${host.ip})` : id;
                      }),
                    )}
                    
                    hosts.each { host ->
                        echo "Deploying to \${host}"
                    }
                    
                    ${data.scriptIds
                      .map((scriptId) => {
                        const script = repositoryScripts.find((s) => s.id === scriptId);
                        const params = data.scriptParameters[scriptId]?.['raw'] || '';
                        return `                    sh "automai-deploy ${script?.path || scriptId} ${params}"`;
                      })
                      .join('\n')}
                }
            }
        }
        
        stage('Verify') {
            steps {
                echo "Verifying deployment"
                // Add verification steps here
            }
        }
    }
    
    post {
        success {
            echo "Deployment completed successfully"
        }
        failure {
            echo "Deployment failed"
        }
    }
}`}
              </code>
            </div>
          </div>
        ) : (
          // Summary View
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('wizard_deployment_summary')}
            </h4>

            <div className="space-y-4">
              {/* Scripts */}
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('wizard_selected_scripts')} ({data.scriptIds.length})
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {data.scriptIds.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-3">
                      {t('wizard_no_scripts')}
                    </p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th
                            scope="col"
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"
                          >
                            #
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2"
                          >
                            {t('wizard_script_path')}
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2"
                          >
                            {t('wizard_parameters')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {data.scriptIds.map((scriptId, index) => {
                          const script = repositoryScripts.find((s) => s.id === scriptId);
                          const params = data.scriptParameters[scriptId]?.['raw'] || '';

                          return (
                            <tr key={scriptId}>
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded text-center text-xs">
                                  {index + 1}
                                </div>
                              </td>
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                <span className="text-xs text-gray-800 dark:text-gray-200 font-mono">
                                  {script?.path || scriptId}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                {params && (
                                  <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                    {params}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Target Hosts */}
              <div>
                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('wizard_target_hosts')}
                </h5>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2">
                  {data.hostIds.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {data.hostIds.map((id) => {
                        const host = availableHosts.find((h) => h.id === id);
                        if (!host) return null;

                        return (
                          <div key={id} className="text-xs flex items-center">
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${host.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}
                            ></div>
                            <span className="text-gray-800 dark:text-gray-200">{host.name}</span>
                            <span className="text-gray-500 ml-1">({host.ip})</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">{t('wizard_no_hosts')}</p>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('wizard_schedule')}
                </h5>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2">
                  <div className="text-xs text-gray-800 dark:text-gray-200">
                    {data.schedule === 'now' ? (
                      <span>{t('wizard_deploy_immediately')}</span>
                    ) : (
                      <div className="space-y-1">
                        <div>
                          {t('wizard_scheduled_for')}:{' '}
                          <span className="font-medium">{data.scheduledTime}</span>
                        </div>
                        {data.cronExpression && (
                          <div>
                            Cron:{' '}
                            <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                              {data.cronExpression}
                            </code>
                          </div>
                        )}
                        {(data.repeatCount || 0) > 0 && (
                          <div>
                            {t('wizard_repeat')}:{' '}
                            <span className="font-medium">
                              {data.repeatCount || 0} {t('wizard_times')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto-start option */}
        <div className="flex items-center space-x-2 mt-4">
          <Switch id="auto-start" checked={autoStart} onCheckedChange={handleAutoStartToggle} />
          <label
            htmlFor="auto-start"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {t('wizard_auto_start')}
          </label>
        </div>
      </div>
    </div>
  );
}

export default DeploymentWizardStep5Client;
