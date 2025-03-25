'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Host as HostType, ScriptParameter, CICDProvider, CICDJob } from '../types';
import CustomSwitch from './CustomSwitch';
import { useCICD } from '@/context';

interface DeploymentWizardStep5Props {
  showJenkinsView: boolean;
  setShowJenkinsView: (checked: boolean) => void;
  scriptIds: string[];
  scriptParameters: Record<string, any>;
  hostIds: string[];
  schedule: string;
  scheduledTime: string;
  cronExpression: string;
  repeatCount: number;
  repositoryScripts: any[];
  availableHosts: HostType[];
  jenkinsConfig: {
    enabled: boolean;
    providerId?: string;
    jobId?: string;
    parameters?: Record<string, any>;
    [key: string]: any;
  };
  onJenkinsConfigChange: (enabled: boolean, config: any) => void;
  onPrevStep: () => void;
  isSubmitting?: boolean;
}

const DeploymentWizardStep5: React.FC<DeploymentWizardStep5Props> = ({
  showJenkinsView,
  setShowJenkinsView,
  scriptIds,
  scriptParameters,
  hostIds,
  schedule,
  scheduledTime,
  cronExpression,
  repeatCount,
  repositoryScripts,
  availableHosts,
  jenkinsConfig,
  onJenkinsConfigChange,
  onPrevStep,
  isSubmitting = false,
}) => {
  const t = useTranslations('deployment.wizard');

  // Use the CICD context from the new context system
  const cicdContext = useCICD();

  // State for providers, jobs, and job details
  const [providers, setProviders] = useState<CICDProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [providersError, setProvidersError] = useState<string | null>(null);

  const [jobs, setJobs] = useState<CICDJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [jobDetails, setJobDetails] = useState<any>(null);
  const [isLoadingJobDetails, setIsLoadingJobDetails] = useState(false);
  const [jobDetailsError, setJobDetailsError] = useState<string | null>(null);

  // Fetch CI/CD providers
  useEffect(() => {
    // Only fetch if Jenkins integration is enabled
    if (!jenkinsConfig.enabled) return;
    
    const loadProviders = async () => {
      try {
        setIsLoadingProviders(true);
        setProvidersError(null);
        const result = await cicdContext.fetchProviders();
        setProviders(result.data || []);
        if (result.error) setProvidersError(result.error);
      } catch (err: any) {
        setProvidersError(err.message || t('failedFetchProviders'));
        console.error('Error fetching CI/CD providers:', err);
      } finally {
        setIsLoadingProviders(false);
      }
    };

    loadProviders();
  }, [cicdContext, t, jenkinsConfig.enabled]);

  // Fetch CI/CD jobs when a provider is selected
  useEffect(() => {
    // Skip if Jenkins integration is disabled
    if (!jenkinsConfig.enabled || !jenkinsConfig.providerId) {
      setJobs([]);
      return;
    }

    const loadJobs = async () => {
      try {
        setIsLoadingJobs(true);
        setJobsError(null);
        const jobsResult = await cicdContext.fetchJobs(jenkinsConfig.providerId);
        setJobs(jobsResult || []);
      } catch (err: any) {
        setJobsError(err.message || t('failedFetchJobs'));
        console.error('Error fetching CI/CD jobs:', err);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    loadJobs();
  }, [jenkinsConfig.providerId, cicdContext, t, jenkinsConfig.enabled]);

  // Fetch job details when a job is selected
  useEffect(() => {
    // Skip if Jenkins integration is disabled
    if (!jenkinsConfig.enabled || !jenkinsConfig.providerId || !jenkinsConfig.jobId) {
      setJobDetails(null);
      return;
    }
    
    const loadJobDetails = async () => {
      try {
        setIsLoadingJobDetails(true);
        setJobDetailsError(null);
        const job = await cicdContext.getJobById(jenkinsConfig.jobId);
        setJobDetails(job || null);
      } catch (err: any) {
        setJobDetailsError(err.message || t('failedFetchJobDetails'));
        console.error('Error fetching job details:', err);
      } finally {
        setIsLoadingJobDetails(false);
      }
    };

    loadJobDetails();
  }, [jenkinsConfig.providerId, jenkinsConfig.jobId, cicdContext, t, jenkinsConfig.enabled]);

  // Extract job and parameters from job details
  const job = jobDetails?.job;
  const jobParameters = jobDetails?.parameters || [];

  // Update Jenkins config when providers change
  useEffect(() => {
    if (providers.length > 0 && jenkinsConfig.enabled) {
      // Auto-select the first Jenkins provider if it's available
      const jenkinsProviders = providers.filter((p) => p.type === 'jenkins');
      if (jenkinsProviders.length > 0) {
        // Always use the first provider (default provider)
        const defaultProvider = jenkinsProviders[0];

        // Only update if the provider changed or no provider is selected
        if (!jenkinsConfig.providerId || jenkinsConfig.providerId !== defaultProvider.id) {
          console.log('Auto-selecting default Jenkins provider:', defaultProvider.name);
          onJenkinsConfigChange(true, {
            ...jenkinsConfig,
            providerId: defaultProvider.id,
            url: defaultProvider.url,
          });
        }
      }
    }
  }, [providers, jenkinsConfig.enabled]);

  // Handle provider selection
  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    onJenkinsConfigChange(jenkinsConfig.enabled, {
      ...jenkinsConfig,
      providerId,
      url: provider?.url || '',
      jobId: undefined, // Reset job when provider changes
    });
  };

  // Handle job selection
  const handleJobChange = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    onJenkinsConfigChange(jenkinsConfig.enabled, {
      ...jenkinsConfig,
      jobId,
      jobName: job?.name || '',
      parameters: {}, // Reset parameters when job changes
    });
  };

  // Handle parameter change
  const handleParameterChange = (name: string, value: string) => {
    onJenkinsConfigChange(jenkinsConfig.enabled, {
      ...jenkinsConfig,
      parameters: {
        ...(jenkinsConfig.parameters || {}),
        [name]: value,
      },
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <button
          type="button"
          onClick={onPrevStep}
          className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {t('previous')}
        </button>

        <div className="flex items-center space-x-4">
          <CustomSwitch
            checked={jenkinsConfig.enabled}
            onCheckedChange={(checked: boolean) => {
              onJenkinsConfigChange(checked, jenkinsConfig);
              if (checked) {
                setShowJenkinsView(true);
              }
            }}
            label={t('jenkinsIntegration')}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
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
              {t('creating')}
            </>
          ) : (
            t('createDeployment')
          )}
        </button>
      </div>

      {/* Conditional rendering based on Jenkins integration being enabled */}
      {jenkinsConfig.enabled ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">{t('jenkinsIntegration')}</h3>
          
          {/* Show loading state when fetching providers */}
          {isLoadingProviders ? (
            <div className="text-center py-4">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>{t('loadingProviders')}</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p>{providersError || t('noProvidersFound')}</p>
            </div>
          ) : (
            <>
              {/* Jenkins provider selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">{t('selectProvider')}</label>
                <select
                  value={jenkinsConfig.providerId || ''}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 dark:bg-gray-700 dark:border-gray-600"
                  disabled={isLoadingProviders}
                >
                  <option value="">{t('selectProvider')}</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} ({provider.url})
                    </option>
                  ))}
                </select>
              </div>

              {/* Only show job selection if provider is selected */}
              {jenkinsConfig.providerId && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">{t('selectJob')}</label>
                  {isLoadingJobs ? (
                    <div className="text-center py-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-1"></div>
                      <p className="text-sm">{t('loadingJobs')}</p>
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-2 text-gray-500 text-sm">
                      <p>{jobsError || t('noJobsFound')}</p>
                    </div>
                  ) : (
                    <select
                      value={jenkinsConfig.jobId || ''}
                      onChange={(e) => handleJobChange(e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">{t('selectJob')}</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Job parameters */}
              {jenkinsConfig.jobId && jobDetails && (
                <div className="mb-4">
                  <h4 className="text-md font-medium mb-2">{t('jobParameters')}</h4>
                  {isLoadingJobDetails ? (
                    <div className="text-center py-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-1"></div>
                      <p className="text-sm">{t('loadingJobDetails')}</p>
                    </div>
                  ) : jobDetailsError ? (
                    <div className="text-center py-2 text-gray-500 text-sm">
                      <p>{jobDetailsError}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Render parameters based on their type */}
                      {jobParameters.map((param) => (
                        <div key={param.name} className="mb-2">
                          <label className="block text-sm font-medium mb-1">
                            {param.name}
                            {param.required && <span className="text-red-500">*</span>}
                          </label>
                          {param.description && (
                            <p className="text-xs text-gray-500 mb-1">{param.description}</p>
                          )}

                          {param.type === 'choice' ? (
                            <select
                              value={
                                (jenkinsConfig.parameters && jenkinsConfig.parameters[param.name]) ||
                                param.default ||
                                ''
                              }
                              onChange={(e) => handleParameterChange(param.name, e.target.value)}
                              className="w-full rounded-md border border-gray-300 p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                              {param.choices?.map((choice) => (
                                <option key={choice} value={choice}>
                                  {choice}
                                </option>
                              ))}
                            </select>
                          ) : param.type === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={
                                (jenkinsConfig.parameters && jenkinsConfig.parameters[param.name]) ||
                                param.default ||
                                false
                              }
                              onChange={(e) =>
                                handleParameterChange(param.name, e.target.checked)
                              }
                              className="rounded border-gray-300 text-blue-600 dark:bg-gray-700 dark:border-gray-600"
                            />
                          ) : (
                            <input
                              type="text"
                              value={
                                (jenkinsConfig.parameters && jenkinsConfig.parameters[param.name]) ||
                                param.default ||
                                ''
                              }
                              onChange={(e) => handleParameterChange(param.name, e.target.value)}
                              className="w-full rounded-md border border-gray-300 p-2 dark:bg-gray-700 dark:border-gray-600"
                              placeholder={param.description || param.name}
                            />
                          )}
                        </div>
                      ))}

                      {jobParameters.length === 0 && (
                        <p className="text-sm text-gray-500">{t('noJobParameters')}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // When Jenkins integration is disabled, show a simple message about the deployment
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">{t('deploymentSummary')}</h3>
          <p className="mb-4">{t('deploymentSummaryMessage')}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-sm mb-2">{t('scripts')}</h4>
              <ul className="list-disc list-inside text-sm">
                {scriptIds.map((scriptId) => {
                  const script = repositoryScripts.find((s) => s.id === scriptId);
                  return (
                    <li key={scriptId} className="mb-1">
                      {script ? script.name : scriptId}
                    </li>
                  );
                })}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-2">{t('hosts')}</h4>
              <ul className="list-disc list-inside text-sm">
                {hostIds.map((hostId) => {
                  const host = availableHosts.find((h) => h.id === hostId);
                  return (
                    <li key={hostId} className="mb-1">
                      {host ? host.name : hostId}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2">{t('schedule')}</h4>
            <p className="text-sm">
              {schedule === 'now'
                ? t('immediateExecution')
                : schedule === 'once'
                ? `${t('scheduledOnce')}: ${scheduledTime}`
                : `${t('scheduledCron')}: ${cronExpression} (${t('repeat')}: ${repeatCount || t('indefinitely')})`}
            </p>
          </div>
        </div>
      )}

      {/* Deployment summary and submission button */}
      <div className="flex justify-between">
        <div>
          {/* Any additional information or warnings can go here */}
        </div>
      </div>
    </div>
  );
};

export default DeploymentWizardStep5;
