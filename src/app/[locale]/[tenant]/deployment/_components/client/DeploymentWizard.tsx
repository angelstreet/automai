'use client';

import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { Repository as RepositoryInterface } from '@/app/[locale]/[tenant]/repositories/types';
import { saveDeploymentConfiguration, startDeployment } from '@/app/actions/deploymentWizard';
import { toast } from '@/components/shadcn/use-toast';
import { DeploymentData, Repository } from '@/types/core/deployment';
import { Host as HostType } from '@/types/core/host';

import { Host as SystemHost } from '@/types/core/host';
import DeploymentWizardStep1 from '../DeploymentWizardStep1';
import DeploymentWizardStep2 from '../DeploymentWizardStep2';
import DeploymentWizardStep3 from '../DeploymentWizardStep3';
import DeploymentWizardStep4 from '../DeploymentWizardStep4';

import DeploymentWizardStep5 from './DeploymentWizardStep5';

// Helper function to adapt system hosts to the format expected by the deployment module
const adaptHostsForDeployment = (systemHosts: SystemHost[]): HostType[] => {
  return systemHosts.map((host) => ({
    id: host.id,
    name: host.name,
    environment: host.is_windows ? 'Windows' : 'Linux', // Use OS type as environment
    status: host.status === 'connected' ? 'online' : 'offline',
    ip: host.ip,
  }));
};

interface DeploymentWizardProps {
  onCancel: () => void;
  onDeploymentCreated?: () => void;
  repositories: RepositoryInterface[];
  hosts: SystemHost[];
  cicdProviders: any[];
}

const initialDeploymentData: DeploymentData = {
  name: '',
  description: '',
  repositoryId: '',
  selectedRepository: null,
  schedule: 'now',
  scheduledTime: '',
  scriptIds: [],
  scriptParameters: {},
  hostIds: [],
  cronExpression: '',
  repeatCount: 0,
  environmentVars: [],
  notifications: {
    email: false,
    slack: false,
  },
  autoStart: true,
  cicdProviderId: '',
};

// Declare a type for selected repository that includes providerId and url
interface EnhancedRepository extends Repository {
  providerId?: string;
  url?: string;
}

// Wrap DeploymentWizard in React.memo to prevent unnecessary re-renders
const DeploymentWizard: React.FC<DeploymentWizardProps> = React.memo(
  ({ onCancel, onDeploymentCreated, repositories = [], hosts = [], cicdProviders = [] }) => {
    const [step, setStep] = useState(1);
    const [deploymentData, setDeploymentData] = useState<DeploymentData>(initialDeploymentData);
    const [showJenkinsView, setShowJenkinsView] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    // Use ref for mounting tracking without state updates
    const isMountedRef = useRef(true);

    // Adapt hosts for deployment
    const availableHosts = adaptHostsForDeployment(hosts);

    // Set mounted flag after component fully mounts - simplified
    useEffect(() => {
      // Simply mark as mounted without a state update
      isMountedRef.current = true;

      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // State for repository scripts
    const [repositoryScripts, setRepositoryScripts] = useState<any[]>([]);
    const [isLoadingScripts, setIsLoadingScripts] = useState(false);
    const [scriptsError, setScriptsError] = useState<string | null>(null);

    // Fetch scripts only when on step 2 and repository selected
    useEffect(() => {
      console.log(
        `[DeploymentWizard] Current step: ${step}, repositoryId: ${deploymentData.repositoryId?.substring(0, 8) || 'none'}...`,
      );

      // Only fetch scripts when on step 2 and a repository is selected
      if (step === 2 && deploymentData.repositoryId && !isLoadingScripts) {
        const loadScripts = async () => {
          try {
            setIsLoadingScripts(true);
            setScriptsError(null);

            // Get repository information from the selected repository
            const selectedRepo = deploymentData.selectedRepository as Repository & {
              providerId?: string;
              url?: string;
              provider_id?: string;
            };

            if (!selectedRepo) {
              throw new Error('No repository selected');
            }

            // Use either providerId or provider_id from the repository
            const providerId = selectedRepo.providerId || selectedRepo.provider_id;

            if (!providerId) {
              throw new Error('Missing provider ID for the selected repository');
            }

            if (!selectedRepo.url) {
              throw new Error('Missing repository URL');
            }

            console.log(`[DeploymentWizard] Loading scripts for repository: ${selectedRepo.name}`, {
              id: selectedRepo.id,
              providerId,
              url: selectedRepo.url,
            });

            // Try multiple branch names since we don't know the default branch
            const branchesToTry = ['master', 'main', 'develop', 'dev'];
            let scriptFiles = null;
            let lastError = null;

            for (const branch of branchesToTry) {
              try {
                // Get all files recursively with branch fallback, like RepositoryExplorer does
                const apiUrl = `/api/repositories/explore?repositoryId=${selectedRepo.id}&providerId=${providerId}&repositoryUrl=${encodeURIComponent(selectedRepo.url)}&path=&branch=${branch}&action=list&recursive=true`;
                console.log(`[DeploymentWizard] Trying to fetch scripts with branch: ${branch}`);

                const response = await fetch(apiUrl);

                if (!response.ok) {
                  const errorText = await response.text();
                  console.log(`[DeploymentWizard] Failed with branch ${branch}:`, errorText);
                  lastError = new Error(
                    `Error with branch ${branch}: ${response.status} ${response.statusText}`,
                  );
                  continue;
                }

                const data = await response.json();

                if (data.success && data.data) {
                  // Filter for script files (.sh, .py)
                  const filteredFiles = data.data.filter(
                    (file: any) =>
                      file.type === 'file' &&
                      (file.name.endsWith('.sh') || file.name.endsWith('.py')),
                  );

                  if (filteredFiles.length > 0) {
                    // Transform to script format
                    const scripts = filteredFiles.map((file: any, index: number) => ({
                      id: `script-${index}`,
                      name: file.name,
                      path: file.path,
                      description: `${file.path} (${file.size} bytes)`,
                      parameters: [],
                      type: file.name.endsWith('.py') ? 'python' : 'shell',
                    }));

                    console.log(
                      `[DeploymentWizard] Successfully found ${scripts.length} script files with branch: ${branch}`,
                    );
                    setRepositoryScripts(scripts);
                    scriptFiles = scripts;
                    break;
                  } else {
                    console.log(`[DeploymentWizard] No script files found with branch: ${branch}`);
                  }
                }
              } catch (branchError) {
                console.error(`[DeploymentWizard] Error with branch ${branch}:`, branchError);
                lastError = branchError;
              }
            }

            if (!scriptFiles) {
              if (lastError) {
                throw lastError;
              } else {
                setRepositoryScripts([]);
                console.log('[DeploymentWizard] No script files found in any branch');
              }
            }
          } catch (error) {
            console.error('[DeploymentWizard] Error fetching scripts:', error);
            setScriptsError(error instanceof Error ? error.message : 'Failed to load scripts');
            setRepositoryScripts([]);
          } finally {
            setIsLoadingScripts(false);
          }
        };

        loadScripts();
      }
    }, [step, deploymentData.repositoryId, deploymentData.selectedRepository]);

    const handleInputChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
      const { name, value } = e.target;

      // Special handling for repositoryId to log selection
      if (name === 'repositoryId') {
        // Avoid unnecessary log noise
        if (value) {
          const selectedRepo = repositories.find((r) => r.id === value) as RepositoryInterface;

          if (selectedRepo) {
            // Store the full repository object
            setDeploymentData((prev) => ({
              ...prev,
              repositoryId: value,
              selectedRepository: selectedRepo as any, // Cast to any to avoid type conflicts
            }));

            // Early return since we've already updated the state
            return;
          }
        }

        // Handle clearing the selection or invalid selection
        setDeploymentData((prev) => ({
          ...prev,
          repositoryId: value,
          selectedRepository: null,
        }));

        return;
      }

      // Handle other input types
      setDeploymentData((prev) => ({
        ...prev,
        [name]: value,
      }));
    };

    // Handle cancel button click
    const handleCancelWizard = () => {
      console.log('Executing cancel');
      onCancel();
    };

    const handleScriptsChange = (scriptIds: string[]) => {
      setDeploymentData((prev) => ({
        ...prev,
        scriptIds,
      }));
    };

    const handleScriptParameterChange = (scriptId: string, paramId: string, value: string) => {
      setDeploymentData((prev) => {
        const scriptParams = prev.scriptParameters[scriptId] || {};
        return {
          ...prev,
          scriptParameters: {
            ...prev.scriptParameters,
            [scriptId]: {
              ...scriptParams,
              [paramId]: value,
            },
          },
        };
      });
    };

    const handleHostsChange = (hostId: string) => {
      // Update host selection without triggering form submission
      setDeploymentData((prev) => ({
        ...prev,
        hostIds: prev.hostIds.includes(hostId)
          ? prev.hostIds.filter((id) => id !== hostId)
          : [...prev.hostIds, hostId],
      }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;

      if (name.startsWith('notifications.')) {
        const notificationType = name.split('.')[1];
        setDeploymentData((prev) => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            [notificationType]: checked,
          },
        }));
      }
    };

    const handleAddEnvVar = () => {
      setDeploymentData((prev) => ({
        ...prev,
        environmentVars: [...prev.environmentVars, { key: '', value: '' }],
      }));
    };

    const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
      setDeploymentData((prev) => {
        const newEnvVars = [...prev.environmentVars];
        newEnvVars[index] = { ...newEnvVars[index], [field]: value };
        return { ...prev, environmentVars: newEnvVars };
      });
    };

    const handleRemoveEnvVar = (index: number) => {
      setDeploymentData((prev) => {
        const newEnvVars = [...prev.environmentVars];
        newEnvVars.splice(index, 1);
        return { ...prev, environmentVars: newEnvVars };
      });
    };

    const handleNextStep = () => {
      setStep((prev) => prev + 1);
    };

    const handlePrevStep = () => {
      setStep((prev) => prev - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsCreating(true);
      setSubmissionError(null);

      try {
        // Check if we have providers
        if (!cicdProviders || cicdProviders.length === 0) {
          throw new Error('No CI/CD providers available');
        }

        // Create scriptMapping from repositoryScripts array
        const scriptMapping: Record<string, { path: string; name: string; type: string }> = {};

        // Populate scriptMapping for each selected script
        deploymentData.scriptIds.forEach((scriptId) => {
          const script = repositoryScripts.find((s: any) => s.id === scriptId);
          if (script) {
            scriptMapping[scriptId] = {
              path: script.path,
              name: script.name,
              type: script.type || 'shell',
            };
          }
        });

        // Map to the expected format according to DeploymentFormData interface
        const formData: any = {
          name: deploymentData.name,
          description: deploymentData.description,
          repositoryId: deploymentData.repositoryId,
          branch: 'main', // Default branch
          targetHostId: deploymentData.hostIds[0], // First host ID
          cicdProviderId: cicdProviders.length > 0 ? cicdProviders[0].id : '',
          configuration: {
            scriptIds: deploymentData.scriptIds,
            scriptMapping,
            hostIds: deploymentData.hostIds,
            schedule: deploymentData.schedule,
            scheduledTime: deploymentData.scheduledTime || '',
            cronExpression: deploymentData.cronExpression || '',
            repeatCount: deploymentData.repeatCount || 0,
            environmentVars: deploymentData.environmentVars.filter((env) => env.key && env.value),
            parameters: deploymentData.scriptParameters,
            notifications: deploymentData.notifications,
          },
          scheduled: deploymentData.schedule !== 'now',
          autoStart: deploymentData.schedule === 'now', // Auto-start for immediate deployments
        };

        console.log('[DeploymentWizard] Submitting deployment with data:', formData);

        // Submit using the server action
        const result = await saveDeploymentConfiguration(formData);

        if (result.success && result.data) {
          // If auto-start is enabled, start the deployment
          if (formData.autoStart) {
            await startDeployment(result.data.id);
          }

          toast({
            title: 'Deployment created',
            description: 'Your deployment has been created successfully.',
            variant: 'default',
          });

          // Reset the form
          setDeploymentData(initialDeploymentData);
          setStep(1);

          // Call the dedicated callback for deployment creation success
          if (onDeploymentCreated) {
            onDeploymentCreated();
          }
        } else {
          setSubmissionError(result.error || 'Failed to create deployment');
          toast({
            title: 'Error creating deployment',
            description: result.error || 'Something went wrong while creating your deployment.',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        setSubmissionError(error.message || 'Failed to create deployment');
        toast({
          title: 'Error creating deployment',
          description: error.message || 'Something went wrong while creating your deployment.',
          variant: 'destructive',
        });
      } finally {
        setIsCreating(false);
      }
    };

    const isStepValid = () => {
      switch (step) {
        case 1:
          return deploymentData.name !== '' && deploymentData.repositoryId !== '';
        case 2:
          return deploymentData.scriptIds.length > 0;
        case 3:
          return deploymentData.hostIds.length > 0;
        case 4:
          return (
            deploymentData.schedule === 'now' ||
            (deploymentData.schedule === 'later' && deploymentData.scheduledTime !== '')
          );
        case 5:
          return true; // Review step is always valid
        default:
          return false;
      }
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2">
        <div className="mb-1">
          <div className="flex justify-between items-center">
            <button
              onClick={handleCancelWizard}
              className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft size={12} className="mr-1" />
              Back to Deployments
            </button>
            <div></div> {/* Empty div for flex spacing */}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mb-1 relative">
          <div className="flex justify-between">
            <div
              className={`flex flex-col items-center ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 1 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                1
              </div>
              <div className="text-xs mt-1">Details</div>
            </div>

            <div className="flex-1 flex items-center">
              <div
                className={`h-0.5 w-full ${step >= 2 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}
              ></div>
            </div>

            <div
              className={`flex flex-col items-center ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 2 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                2
              </div>
              <div className="text-xs mt-1">Scripts</div>
            </div>

            <div className="flex-1 flex items-center">
              <div
                className={`h-0.5 w-full ${step >= 3 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}
              ></div>
            </div>

            <div
              className={`flex flex-col items-center ${step >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 3 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                3
              </div>
              <div className="text-xs mt-1">Hosts</div>
            </div>

            <div className="flex-1 flex items-center">
              <div
                className={`h-0.5 w-full ${step >= 4 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}
              ></div>
            </div>

            <div
              className={`flex flex-col items-center ${step >= 4 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 4 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                4
              </div>
              <div className="text-xs mt-1">Schedule</div>
            </div>

            <div className="flex-1 flex items-center">
              <div
                className={`h-0.5 w-full ${step >= 5 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}
              ></div>
            </div>

            <div
              className={`flex flex-col items-center ${step >= 5 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 5 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                5
              </div>
              <div className="text-xs mt-1">Review</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Deployment Information */}
          {step === 1 && (
            <DeploymentWizardStep1
              name={deploymentData.name}
              description={deploymentData.description}
              repositoryId={deploymentData.repositoryId}
              repositories={repositories}
              repositoryError={null}
              onInputChange={handleInputChange}
              onNextStep={handleNextStep}
              isStepValid={isStepValid}
              onRefreshRepositories={() => {
                // Just a placeholder refresh function
                // Can be updated later with actual repository refresh logic
                console.log('Refreshing repositories...');
              }}
            />
          )}

          {/* Step 2: Select Scripts with Parameters */}
          {step === 2 && (
            <DeploymentWizardStep2
              selectedRepository={deploymentData.selectedRepository}
              scriptIds={deploymentData.scriptIds}
              repositoryScripts={repositoryScripts}
              isLoadingScripts={isLoadingScripts}
              scriptsError={scriptsError}
              scriptParameters={deploymentData.scriptParameters}
              onScriptsChange={handleScriptsChange}
              onScriptParameterChange={handleScriptParameterChange}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              isStepValid={isStepValid}
            />
          )}

          {/* Step 3: Select Target Hosts */}
          {step === 3 && (
            <DeploymentWizardStep3
              hostIds={deploymentData.hostIds}
              availableHosts={availableHosts}
              isLoadingHosts={false}
              hostsError={null}
              onHostToggle={handleHostsChange}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              isStepValid={isStepValid}
            />
          )}

          {/* Step 4: Schedule */}
          {step === 4 && (
            <DeploymentWizardStep4
              schedule={deploymentData.schedule}
              scheduledTime={deploymentData.scheduledTime}
              cronExpression={deploymentData.cronExpression}
              repeatCount={deploymentData.repeatCount}
              onInputChange={handleInputChange}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              isStepValid={isStepValid}
            />
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <DeploymentWizardStep5
              data={deploymentData}
              onUpdateData={(partialData) => {
                setDeploymentData((prev) => ({ ...prev, ...partialData }));
              }}
              onNext={() => {}} // Step 5 doesn't have a next step
              onBack={handlePrevStep}
              onCancel={onCancel}
              onSubmit={handleSubmit}
              isPending={isCreating}
              cicdProviders={cicdProviders}
            />
          )}
        </form>
      </div>
    );
  },
);

DeploymentWizard.displayName = 'DeploymentWizard';

export default DeploymentWizard;
