'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

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

  // CI/CD functionality from the hook
  const {
    providers: _providers,
    getJobs: _getJobs,
    error: _cicdError,
    isLoading: _isLoadingCICD,
  } = useCICD();

  // State for CI/CD data
  const [_jobs, _setJobs] = useState<CICDJob[]>([]);
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
  const _handleProviderChange = (providerId: string) => {
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
    const _job = _jobs.find((j) => j.id === jobId);

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

  return (
    <div className="max-h-[80vh] overflow-auto">
      <div className="flex items-center justify-between mb-2">
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
            <span className="text-xs text-gray-500">{t('wizard_cicd_view')}</span>
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
          className="px-4 py-1.5 rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-3 w-3 text-white inline-block"
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

      {/* Fixed width container to prevent layout shifts */}
      <div className="w-full" style={{ minHeight: '500px' }}>
        {/* Common container with fixed dimensions */}
        <div className="w-full h-[500px] bg-gray-50 dark:bg-gray-700 rounded-md p-2 transition-all duration-150 relative">
          {/* Jenkins View - Absolutely positioned */}
          <div
            className={`absolute inset-0 p-2 transition-opacity duration-150 ${
              showJenkinsView ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('wizard_jenkins_pipeline_preview')}
            </h4>
            <div className="bg-gray-900 rounded-md shadow-sm border border-gray-700 overflow-auto h-[450px] w-full">
              <pre className="text-xs text-white font-mono whitespace-pre p-2 overflow-x-auto">
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
              </pre>
            </div>
          </div>

          {/* Summary View - Absolutely positioned */}
          <div
            className={`absolute inset-0 p-2 transition-opacity duration-150 ${
              !showJenkinsView ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('wizard_summary')}
            </h4>

            <div className="space-y-2 h-[450px] overflow-auto">
              {/* Scripts */}
              <div className="space-y-1 mb-2">
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t('wizard_selected_scripts')} ({data.scriptIds.length})
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th
                          scope="col"
                          className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"
                        >
                          #
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2"
                        >
                          {t('wizard_script_path')}
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2"
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
                            <td className="px-2 py-1 whitespace-nowrap">
                              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded text-center text-xs">
                                {index + 1}
                              </div>
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">
                              <span className="text-xs text-gray-800 dark:text-gray-200 font-mono">
                                {script?.path || scriptId}
                              </span>
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">
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
                </div>
              </div>

              {/* Target Hosts */}
              <div>
                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('wizard_target_hosts')}
                </h5>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-1.5">
                  {data.hostIds.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1">
                      {data.hostIds.map((id) => {
                        const host = availableHosts.find((h) => h.id === id);
                        if (!host) return null;

                        return (
                          <div key={id} className="text-xs flex items-center">
                            <div
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${host.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}
                            ></div>
                            <span className="font-medium">{host.name}</span>
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
                <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-1.5">
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
        </div>
      </div>
    </div>
  );
}

export default DeploymentWizardStep5Client;
