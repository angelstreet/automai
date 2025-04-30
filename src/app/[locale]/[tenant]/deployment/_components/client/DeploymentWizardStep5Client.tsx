'use client';

import { useTranslations } from 'next-intl';
import React, { useState, useMemo, useEffect } from 'react';

import { Switch } from '@/components/shadcn/switch';
import { Textarea } from '@/components/shadcn/textarea';
import { useToast } from '@/components/shadcn/use-toast';
import { DeploymentData } from '@/types/component/deploymentComponentType';
import { Host } from '@/types/component/hostComponentType';

interface DeploymentWizardStep5ClientProps {
  data: DeploymentData;
  onBack: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement> | (() => void);
  isPending: boolean;
  availableHosts?: Host[];
  repositoryScripts?: any[];
  onConfigChange?: (updatedConfig: any) => void;
}

export function DeploymentWizardStep5Client({
  data,
  onBack,
  onSubmit,
  isPending,
  availableHosts = [],
  repositoryScripts = [],
  onConfigChange,
}: DeploymentWizardStep5ClientProps) {
  const t = useTranslations('deployment');
  const c = useTranslations('common');
  const { toast } = useToast();

  // State for views and config
  const [showPipelineView, setShowPipelineView] = useState(false); // Always default to summary view
  const [editableConfig, setEditableConfig] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  // Track if the config has been modified by the user
  const [configModified, setConfigModified] = useState(false);

  // Handle view toggle
  const handlePipelineToggle = (_checked: boolean) => {
    // For analytics or future state changes
    console.log('[@component:DeploymentWizardStep5] Toggled pipeline view:', _checked);
  };

  // Update provider details before submission
  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();

    // If there are errors, prevent submission
    if (jsonError) {
      toast({
        title: c('error'),
        description: jsonError,
        variant: 'destructive',
      });
      return;
    }

    // Try to parse the JSON and update the config
    if (editableConfig && showPipelineView) {
      try {
        console.log('[@component:DeploymentWizardStep5] Parsing modified config for submission');
        const configObject = JSON.parse(editableConfig);

        // Force update configModified to true to ensure the update is processed
        setConfigModified(true);

        // Call the onConfigChange handler if provided
        if (onConfigChange) {
          console.log('[@component:DeploymentWizardStep5] Sending updated config to parent');
          console.log('[@component:DeploymentWizardStep5] Config object:', configObject);

          // Send the config to the parent component
          onConfigChange(configObject);

          // Add a small delay to ensure state updates have time to propagate
          setTimeout(() => {
            // Call the original submit function
            if (typeof onSubmit === 'function') {
              if ('length' in onSubmit && onSubmit.length === 0) {
                (onSubmit as () => void)();
              } else {
                (onSubmit as React.FormEventHandler<HTMLFormElement>)(
                  e as unknown as React.FormEvent<HTMLFormElement>,
                );
              }
            }
          }, 100);

          return;
        }
      } catch (error: any) {
        toast({
          title: c('error'),
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
    }

    // Call the original submit function
    if (typeof onSubmit === 'function') {
      if ('length' in onSubmit && onSubmit.length === 0) {
        (onSubmit as () => void)();
      } else {
        (onSubmit as React.FormEventHandler<HTMLFormElement>)(
          e as unknown as React.FormEvent<HTMLFormElement>,
        );
      }
    }
  };

  // Generate job code based on config - only for preview purposes
  const pipelineCode = useMemo(() => {
    if (!data) return '';

    try {
      console.log('[@component:DeploymentWizardStep5] Generating preview pipeline');

      // Get scripts details from the scriptIds
      const scriptDetails = repositoryScripts
        .filter((s) => data.scriptIds.includes(s.id))
        .map((script) => {
          const params = data.scriptParameters[script.id]?.['raw'] || '';
          return {
            id: script.id,
            path: script.path || script.filename || script.id,
            type: script.type || 'shell',
            parameters: params,
          };
        });

      // Get host details from the hostIds
      const hostDetails = availableHosts
        .filter((h) => data.hostIds.includes(h.id))
        .map((host) => ({
          id: host.id,
          name: host.name,
          ip: host.ip,
          port: (host as any).port || 22,
          username: (host as any).username || (host as any).user || 'user',
          password: (host as any).password,
          privateKey: (host as any).private_key,
          authType: (host as any).auth_type || 'password',
          os: (host as any).is_windows ? 'windows' : 'linux',
        }));

      const repoUrl =
        data.selectedRepository?.url ||
        (data.repositoryId ? `https://github.com/${data.repositoryId}.git` : '');
      const branch = data.branch || 'main';

      // Format pipeline preview (simple job config example)
      const jobConfig = {
        name: data.name,
        description: data.description,
        repository: repoUrl,
        branch: branch,
        scripts: scriptDetails.map((script) => ({
          path: script.path,
          parameters: script.parameters,
        })),
        hosts: hostDetails.map((host) => {
          // Define the host config with a Record type to avoid TypeScript errors
          const hostConfig: Record<string, any> = {
            name: host.name,
            username: host.username,
            ip: host.ip || 'No IP',
            port: host.port,
            os: host.os,
            authType: host.authType,
          };

          // Only include the relevant authentication based on authType
          if (host.authType === 'password' && host.password) {
            hostConfig.password = host.password;
          } else if (host.authType === 'privateKey' && host.privateKey) {
            hostConfig.key = host.privateKey;
          }

          return hostConfig;
        }),
        schedule:
          data.schedule === 'now'
            ? 'now'
            : data.schedule === 'later'
              ? `at ${data.scheduledTime}`
              : `cron: ${data.cronExpression}`,
      };

      // Convert to pretty JSON
      const formattedConfig = JSON.stringify(jobConfig, null, 2);

      console.log('[@component:DeploymentWizardStep5] Successfully generated preview job config');
      return formattedConfig;
    } catch (error) {
      console.error('[@component:DeploymentWizardStep5] Failed to generate job preview:', error);
      return '// Failed to generate job preview. This will not affect the actual deployment.';
    }
  }, [data, repositoryScripts, availableHosts]);

  // Set editable config when pipeline code changes
  useEffect(() => {
    if (pipelineCode && showPipelineView && !configModified) {
      setEditableConfig(pipelineCode);
      setJsonError(null);
    }
  }, [pipelineCode, showPipelineView, configModified]);

  // Validate JSON as user types
  const handleConfigChange = (value: string) => {
    setEditableConfig(value);
    setConfigModified(true);
    console.log('[@component:DeploymentWizardStep5] Config modified by user');

    try {
      if (value && value.trim() !== '') {
        JSON.parse(value);
        setJsonError(null);
      }
    } catch (error: any) {
      const errorMsg = error.message;

      // Extract line and position information from the error message if available
      // JSON parser errors often include "at position X" or "at line Y column Z"
      let lineInfo = '';
      const positionMatch = errorMsg.match(/at position (\d+)/i);
      const lineMatch = errorMsg.match(/at line (\d+) column (\d+)/i);

      if (lineMatch) {
        lineInfo = `Line ${lineMatch[1]}, Column ${lineMatch[2]}`;
      } else if (positionMatch) {
        // If we only have position, try to calculate the line number
        const position = parseInt(positionMatch[1], 10);
        const lines = value.substring(0, position).split('\n');
        const lineNumber = lines.length;
        lineInfo = `Line ${lineNumber}`;
      }

      const formattedError = lineInfo ? `${errorMsg} (${lineInfo})` : errorMsg;
      setJsonError(formattedError);

      // Show toast with error details
      toast({
        title: c('error') || 'Error',
        description: formattedError,
        variant: 'destructive',
      });
    }
  };

  // Reset configModified when switching views
  useEffect(() => {
    if (!showPipelineView) {
      setConfigModified(false);
    }
  }, [showPipelineView]);

  // Render pipeline view
  const renderPipelineView = () => {
    return (
      <div className="bg-gray-900 rounded-md shadow-sm border border-gray-700 h-[460px] overflow-hidden">
        <Textarea
          value={editableConfig}
          onChange={(e) => handleConfigChange(e.target.value)}
          className="font-mono text-sm h-full w-full bg-gray-900 text-gray-200 border-none resize-none"
          spellCheck="false"
        />
        {jsonError && <div className="text-red-500 text-xs mt-1 px-2">{jsonError}</div>}
      </div>
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
            <span className="text-xs text-gray-500">{t('wizard_job_view') || 'Job Config'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-1.5 rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending || (showPipelineView && !!jsonError)}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeploymentWizardStep5Client;
