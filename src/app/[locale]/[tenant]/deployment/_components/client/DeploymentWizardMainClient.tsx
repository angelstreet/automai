'use client';

import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { saveDeploymentConfiguration, startDeployment } from '@/app/actions/deploymentWizardAction';
import { toast } from '@/components/shadcn/use-toast';
import { DeploymentData } from '@/types/component/deploymentComponentType';
import { Host as HostType, Host as SystemHost } from '@/types/component/hostComponentType';
import { Repository } from '@/types/component/repositoryComponentType';

import { DeploymentWizardStep1Client } from './DeploymentWizardStep1Client';
import { DeploymentWizardStep2Client } from './DeploymentWizardStep2Client';
import { DeploymentWizardStep3Client } from './DeploymentWizardStep3Client';
import { DeploymentWizardStep4Client } from './DeploymentWizardStep4Client';
import { DeploymentWizardStep5Client } from './DeploymentWizardStep5Client';

// Helper function to adapt system hosts to the format expected by the deployment module
const adaptHostsForDeployment = (systemHosts: SystemHost[]): HostType[] => {
  if (!systemHosts || !Array.isArray(systemHosts)) {
    return [];
  }
  return systemHosts.map((host) => ({
    id: host.id,
    name: host.name,
    environment: host.is_windows ? 'Windows' : 'Linux', // Use OS type as environment
    status: (host.status === 'connected' ? 'online' : 'offline') as any, // Type assertion
    ip: host.ip,
    type: host.type || 'ssh',
    created_at: host.created_at || new Date().toISOString(),
    updated_at: host.updated_at || new Date().toISOString(),
    is_windows: host.is_windows || false,
  }));
};

interface DeploymentWizardProps {
  onCancel: () => void;
  onDeploymentCreated?: () => void;
  repositories: Repository[];
  hosts: SystemHost[];
  cicdProviders: any[];
}

const initialDeploymentData: DeploymentData = {
  name: '',
  description: '',
  repositoryId: '',
  selectedRepository: null,
  branch: 'main', // Default branch
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

// Wrap DeploymentWizard in React.memo to prevent unnecessary re-renders
const DeploymentWizardMainClient: React.FC<DeploymentWizardProps> = React.memo(
  ({ onCancel, onDeploymentCreated, repositories = [], hosts = [], cicdProviders = [] }) => {
    const [step, setStep] = useState(1);
    const [deploymentData, setDeploymentData] = useState<DeploymentData>(initialDeploymentData);
    const [isCreating, setIsCreating] = useState(false);
    const [_submissionError, setSubmissionError] = useState<string | null>(null);

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
        // Track if the effect was cleaned up
        let isMounted = true;

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
            const providerId = selectedRepo.provider_id;

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

            // Use the selected branch from deploymentData
            const userSelectedBranch = deploymentData.branch || 'main';
            let scriptFiles = null;
            let lastError = null;

            // For now, only try the user-selected branch
            console.log(`[DeploymentWizard] Trying branch: ${userSelectedBranch}`);

            // Try only once to prevent API fetch loops
            try {
              // API endpoint to get repository files
              const apiUrl = `/api/repositories/explore?repositoryId=${selectedRepo.id}&providerId=${providerId}&repositoryUrl=${encodeURIComponent(selectedRepo.url)}&path=&branch=${userSelectedBranch}&action=list&recursive=true`;
              console.log(`[DeploymentWizard] Fetching scripts from: ${apiUrl}`);

              // Add timeout to prevent hanging requests
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

              const response = await fetch(apiUrl, {
                signal: controller.signal,
                headers: { 'Cache-Control': 'no-cache' },
              });

              clearTimeout(timeoutId);

              // Break out early on component unmount
              if (!isMounted) return;

              if (!response.ok) {
                const errorText = await response.text();
                console.log(
                  `[DeploymentWizard] API error: ${response.status} ${response.statusText} - ${errorText}`,
                );
                throw new Error(`Error ${response.status}: ${response.statusText}`);
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
                    `[DeploymentWizard] Successfully found ${scripts.length} script files`,
                  );

                  if (isMounted) {
                    setRepositoryScripts(scripts);
                  }
                  scriptFiles = scripts;
                } else {
                  console.log(`[DeploymentWizard] No script files found`);
                  if (isMounted) {
                    setRepositoryScripts([]);
                  }
                }
              } else {
                throw new Error(data.error || 'Failed to retrieve repository files');
              }
            } catch (error) {
              // Check if the error is due to AbortController (timeout)
              if (error instanceof Error) {
                if (error.name === 'AbortError') {
                  lastError = new Error(`Request timed out after 5 seconds`);
                } else {
                  lastError = error;
                }
              } else {
                lastError = new Error('Unknown error occurred');
              }

              console.error('[DeploymentWizard] Error fetching scripts:', lastError);

              if (isMounted) {
                setScriptsError(lastError.message);
                setRepositoryScripts([]);
              }
            }
          } catch (error) {
            console.error('[DeploymentWizard] Error in script loading process:', error);
            if (isMounted) {
              setScriptsError(error instanceof Error ? error.message : 'Failed to load scripts');
              setRepositoryScripts([]);
            }
          } finally {
            if (isMounted) {
              setIsLoadingScripts(false);
            }
          }
        };

        loadScripts();

        // Cleanup function to prevent state updates after unmount
        return () => {
          isMounted = false;
        };
      }
    }, [
      step,
      deploymentData.repositoryId,
      deploymentData.selectedRepository,
      deploymentData.branch,
    ]);

    const handleInputChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
      const { name, value } = e.target;

      // Special handling for repositoryId to log selection
      if (name === 'repositoryId') {
        // Avoid unnecessary log noise
        if (value) {
          const selectedRepo = repositories.find((r) => r.id === value) as Repository;

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
          branch: deploymentData.branch || 'main', // Use selected branch
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

    const _isStepValid = () => {
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
            <DeploymentWizardStep1Client
              name={deploymentData.name}
              description={deploymentData.description}
              repositoryId={deploymentData.repositoryId}
              branch={deploymentData.branch}
              repositories={repositories || []}
              repositoryError={null}
              onInputChange={handleInputChange}
              onNextStep={handleNextStep}
              isStepValid={!!deploymentData.name && !!deploymentData.repositoryId}
              onRefreshRepositories={() => {
                // Just a placeholder refresh function
                // Can be updated later with actual repository refresh logic
                console.log('Refreshing repositories...');
              }}
            />
          )}

          {/* Step 2: Select Scripts with Parameters */}
          {step === 2 && (
            <DeploymentWizardStep2Client
              selectedRepository={deploymentData.selectedRepository || null}
              scriptIds={deploymentData.scriptIds}
              repositoryScripts={repositoryScripts}
              isLoadingScripts={isLoadingScripts}
              scriptsError={scriptsError}
              scriptParameters={deploymentData.scriptParameters}
              onScriptsChange={handleScriptsChange}
              onScriptParameterChange={handleScriptParameterChange}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              isStepValid={deploymentData.scriptIds.length > 0}
            />
          )}

          {/* Step 3: Select Target Hosts */}
          {step === 3 && (
            <DeploymentWizardStep3Client
              hostIds={deploymentData.hostIds}
              availableHosts={availableHosts}
              isLoadingHosts={false}
              hostsError={null}
              onHostToggle={handleHostsChange}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              isStepValid={deploymentData.hostIds.length > 0}
            />
          )}

          {/* Step 4: Schedule */}
          {step === 4 && (
            <DeploymentWizardStep4Client
              schedule={deploymentData.schedule || 'now'}
              scheduledTime={deploymentData.scheduledTime || ''}
              cronExpression={deploymentData.cronExpression || ''}
              repeatCount={deploymentData.repeatCount || 0}
              onInputChange={handleInputChange}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              isStepValid={
                deploymentData.schedule === 'now' ||
                (deploymentData.schedule === 'later' && deploymentData.scheduledTime !== '')
              }
            />
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <DeploymentWizardStep5Client
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

DeploymentWizardMainClient.displayName = 'DeploymentWizard';

export { DeploymentWizardMainClient };
