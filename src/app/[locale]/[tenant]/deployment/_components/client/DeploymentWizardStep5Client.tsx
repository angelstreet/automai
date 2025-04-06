'use client';

import { useTranslations } from 'next-intl';
import React, { useState, useMemo } from 'react';

import { Switch } from '@/components/shadcn/switch';
import { useCICD } from '@/hooks';
import { PipelineGenerator } from '@/lib/services/cicd/pipelineGenerator';
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
  const [showPipelineView, setShowPipelineView] = useState(false); // Always default to summary view

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

  // Get the selected CI/CD provider
  const selectedProvider = useMemo(() => {
    // Add debugging to trace why provider might be null
    console.log('[DeploymentWizardStep5] cicd_provider_id:', data.cicd_provider_id);
    console.log('[DeploymentWizardStep5] cicdProviders:', cicdProviders);

    if (!data.cicd_provider_id || !cicdProviders.length) return null;

    const provider = cicdProviders.find((p) => p.id === data.cicd_provider_id) || null;
    console.log('[DeploymentWizardStep5] found provider:', provider);

    return provider;
  }, [data.cicd_provider_id, cicdProviders]);

  // Get provider type (jenkins, github, gitlab, circleci)
  const providerType = useMemo(() => {
    if (!selectedProvider) return 'jenkins'; // Default fallback
    const type = selectedProvider.type?.toLowerCase() || '';

    // Map provider types to the ones supported by PipelineGenerator
    if (type.includes('jenkins')) return 'jenkins';
    if (type.includes('github')) return 'github';
    if (type.includes('gitlab')) return 'gitlab';
    if (type.includes('circle')) return 'circleci';

    return 'jenkins'; // Default fallback
  }, [selectedProvider]);

  // Extract CI/CD provider connection details
  const providerConnection = useMemo(() => {
    if (!selectedProvider) return null;

    return {
      url: (selectedProvider as any).url || '',
      token: (selectedProvider as any).token || '',
      username: (selectedProvider as any).username || '',
      password: (selectedProvider as any).password || '',
      authType: (selectedProvider as any).auth_type || 'token',
    };
  }, [selectedProvider]);

  // Handle toggle for pipeline integration
  const handlePipelineToggle = (checked: boolean) => {
    onUpdateData({
      cicd_provider_id: checked ? data.cicd_provider_id || cicdProviders[0]?.id || '' : '',
      jenkinsConfig: checked ? data.jenkinsConfig : undefined,
    });
  };

  // Update provider details before submission
  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();

    // Since we can't directly modify the DeploymentData structure,
    // we'll ensure the cicd_provider_id is correctly set
    if (selectedProvider) {
      onUpdateData({
        cicd_provider_id: selectedProvider.id,
      });
    }

    // Call the original submit function
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
  };

  // Generate pipeline code based on provider type
  const pipelineCode = useMemo(() => {
    if (!data) return '';

    // Get scripts details from the scriptIds
    const scriptDetails = repositoryScripts
      .filter((s) => data.scriptIds.includes(s.id))
      .map((script) => ({
        id: script.id,
        path: script.path || script.filename || script.id,
        type: script.type || 'shell',
        parameters: script.parameters || '',
      }));

    // Get host details from the hostIds
    const hostDetails = availableHosts
      .filter((h) => data.hostIds.includes(h.id))
      .map((host) => ({
        id: host.id,
        name: host.name,
        ip: host.ip,
        environment: host.environment || 'Production',
        username: (host as any).username,
        password: (host as any).password,
        key: (host as any).key,
        is_windows: (host as any).is_windows,
      }));

    // Use actual repository URL if available or construct it from repositoryId
    const repoUrl =
      data.selectedRepository?.url ||
      (data.repositoryId ? `https://github.com/${data.repositoryId}.git` : '');
    const branch = data.branch || 'main';

    // Create additionalParams with basic deployment info
    const additionalParams: Record<string, any> = {
      DEPLOYMENT_NAME: data.name || 'Deployment',
      REPOSITORY_URL: repoUrl,
      BRANCH: branch,
      REPOSITORY: data.repositoryId || '',
      DESCRIPTION: data.description || '',
    };

    // Add CI/CD provider connection details to additionalParams
    if (providerConnection) {
      additionalParams.CICD_PROVIDER_URL = providerConnection.url;
      additionalParams.CICD_PROVIDER_TYPE = providerType;

      // We'll need these for actual job creation in the server action
      // But they won't be included in the displayed pipeline code
      additionalParams.CICD_PROVIDER_ID = selectedProvider?.id;
      additionalParams.CICD_PROVIDER_TOKEN = providerConnection.token;
      additionalParams.CICD_PROVIDER_USERNAME = providerConnection.username;
      additionalParams.CICD_PROVIDER_PASSWORD = providerConnection.password;
      additionalParams.CICD_PROVIDER_AUTH_TYPE = providerConnection.authType;
    }

    // Log the provider info for debugging (will be removed in production)
    console.log(
      '[PipelineGenerator] Using provider:',
      selectedProvider?.name,
      'type:',
      providerType,
    );

    // Generate pipeline using the provider type
    return PipelineGenerator.generate(providerType, {
      repositoryUrl: repoUrl,
      branch: branch,
      deploymentName: data.name || 'Deployment',
      deploymentId: 'DEP-AUTO', // Placeholder that will be replaced by CI/CD system
      scripts: scriptDetails,
      hosts: hostDetails,
      schedule: data.schedule as any,
      scheduledTime: data.scheduledTime,
      additionalParams,
    });
  }, [data, repositoryScripts, availableHosts, providerType, providerConnection, selectedProvider]);

  // Render pipeline view
  const renderPipelineView = () => {
    // Get display name for the provider type
    const providerDisplayName =
      selectedProvider?.name ||
      (providerType === 'jenkins'
        ? 'Jenkins'
        : providerType === 'github'
          ? 'GitHub Actions'
          : providerType === 'gitlab'
            ? 'GitLab CI'
            : providerType === 'circleci'
              ? 'CircleCI'
              : 'CI/CD');

    return (
      <>
        <div className="mb-4">
          <h3 className="text-xl font-medium text-foreground mb-2">
            {t('wizard_cicd_view') || `${providerDisplayName} Pipeline`}
          </h3>
        </div>

        <div className="bg-gray-900 rounded-md shadow-sm border border-gray-700 h-[400px] overflow-hidden">
          <pre className="p-4 text-sm text-gray-200 whitespace-pre font-mono h-full overflow-auto">
            {pipelineCode}
          </pre>
        </div>
      </>
    );
  };

  return (
    <div className="h-full">
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
              checked={showPipelineView}
              onCheckedChange={(checked) => {
                setShowPipelineView(checked);
                handlePipelineToggle(checked);
              }}
            />
            <span className="text-xs text-gray-500">{t('wizard_cicd_view')}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
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
              {c('creating')}
            </>
          ) : (
            t('wizard_create_deployment')
          )}
        </button>
      </div>

      {/* Fixed width container to prevent layout shifts */}
      <div className="w-full">
        {/* Common container with fixed dimensions */}
        <div className="w-full h-[500px] bg-background rounded-md border border-gray-200 dark:border-gray-700 p-4 transition-all duration-150 relative">
          {/* Pipeline View - Absolutely positioned */}
          <div
            className={`absolute inset-0 p-4 transition-opacity duration-150 ${
              showPipelineView ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {renderPipelineView()}
          </div>

          {/* Summary View - Absolutely positioned */}
          <div
            className={`absolute inset-0 p-4 transition-opacity duration-150 ${
              !showPipelineView ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <h4 className="text-sm font-medium text-foreground mb-2">{t('wizard_summary')}</h4>

            <div className="space-y-4 h-[430px] overflow-auto pr-1">
              {/* Scripts */}
              <div className="space-y-1 mb-2">
                <h3 className="text-sm font-medium text-foreground mb-2">
                  {t('wizard_selected_scripts')} ({data.scriptIds.length})
                </h3>
                <div className="bg-background  rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th
                          scope="col"
                          className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10"
                        >
                          #
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/2"
                        >
                          {t('wizard_script_path')}
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/2"
                        >
                          {t('wizard_parameters')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-background  divide-y divide-gray-200 dark:divide-gray-700">
                      {data.scriptIds.map((scriptId, index) => {
                        const script = repositoryScripts.find((s) => s.id === scriptId);
                        const params = data.scriptParameters[scriptId]?.['raw'] || '';

                        return (
                          <tr key={scriptId}>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded text-center text-xs">
                                {index + 1}
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <span className="text-xs text-gray-800 dark:text-gray-200 font-mono">
                                {script?.path || scriptId}
                              </span>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
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
                <h5 className="text-sm font-medium text-foreground mb-2">
                  {t('wizard_target_hosts')}
                </h5>
                <div className="bg-background rounded-md p-3 border border-gray-200 dark:border-gray-700">
                  {data.hostIds && data.hostIds.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {data.hostIds.map((id) => {
                        const host = availableHosts.find((h) => h.id === id);
                        if (!host) return null;

                        // Check for online status to match step 3 conversion
                        const isActive = host.status === ('online' as any);

                        return (
                          <div key={id} className="text-xs flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}
                            ></div>
                            <span className="text-foreground font-medium">{host.name || id}</span>
                            {host.ip && (
                              <span className="text-gray-500 dark:text-gray-400">({host.ip})</span>
                            )}
                            {host.environment && (
                              <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-foreground">
                                #
                                {typeof host.environment === 'string'
                                  ? host.environment.toLowerCase()
                                  : host.environment}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('wizard_no_hosts')}
                    </p>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2">{t('wizard_schedule')}</h5>
                <div className="bg-background  rounded-md p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-foreground">
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
                            <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-foreground">
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

              {/* CI/CD Provider */}
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2">
                  {t('wizard_cicd_provider') || 'CI/CD Provider'}
                </h5>
                <div className="bg-background rounded-md p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-foreground">
                    {showPipelineView && selectedProvider ? (
                      <div className="space-y-1">
                        <div className="flex items-start">
                          <span className="font-medium mr-2">{c('name') || 'Name'}:</span>
                          <span>{selectedProvider.name}</span>
                        </div>

                        <div className="flex items-start">
                          <span className="font-medium mr-2">{c('type') || 'Type'}:</span>
                          <span>
                            {providerType.charAt(0).toUpperCase() + providerType.slice(1)}
                          </span>
                        </div>

                        {providerConnection?.url && (
                          <div className="flex items-start">
                            <span className="font-medium mr-2">{c('url') || 'URL'}:</span>
                            <span className="text-gray-600 dark:text-gray-400 break-all">
                              {providerConnection.url}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('wizard_no_cicd_provider') || 'No CI/CD provider selected'}
                      </p>
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
