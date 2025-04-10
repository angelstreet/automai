'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect, useRef, useContext } from 'react';

import { createDeploymentWithQueue } from '@/app/actions/deploymentWizardAction';
import { toast } from '@/components/shadcn/use-toast';
import { UserContext } from '@/context/UserContext';
import * as gitService from '@/lib/services/gitService';
import { DeploymentData } from '@/types/component/deploymentComponentType';
import { Host as HostType, Host as SystemHost } from '@/types/component/hostComponentType';
import { Repository } from '@/types/component/repositoryComponentType';
import { QueuedDeploymentFormData } from '@/types-new/deployment-types';

import { DeploymentWizardStep1Client } from './DeploymentWizardStep1Client';
import { DeploymentWizardStep2Client } from './DeploymentWizardStep2Client';
import { DeploymentWizardStep3Client } from './DeploymentWizardStep3Client';
import { DeploymentWizardStep4Client } from './DeploymentWizardStep4Client';
import { DeploymentWizardStep5Client } from './DeploymentWizardStep5Client';

const MAX_REPOSITORY_SCAN_DEPTH = 0;
const MAX_FOLDERS_PER_LEVEL = 3;
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
  onDeploymentCreated: () => void;
  repositories?: Repository[];
  hosts?: SystemHost[];

  teamId: string;
  userId: string;
  tenantName?: string; // Keep the prop for fallback
}

const initialDeploymentData: DeploymentData = {
  name: '',
  description: '',
  repositoryId: '',
  selectedRepository: undefined,
  branch: '', // Empty string initially
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
};

// Wrap DeploymentWizard in React.memo to prevent unnecessary re-renders
const DeploymentWizardMainClient: React.FC<DeploymentWizardProps> = React.memo(
  ({
    onCancel,
    onDeploymentCreated,
    repositories = [],
    hosts = [],
    teamId,
    userId,
    tenantName,
  }) => {
    // Log tenant name from prop for debugging
    console.log('[DeploymentWizardMainClient] Using tenant name from prop:', tenantName);

    // Get user directly from context (more reliable than the hook)
    const { user } = useContext(UserContext);

    // For debugging only
    useEffect(() => {
      console.log('[DeploymentWizardMainClient] User data from context:', {
        contextUserExists: !!user,
        contextUserId: user?.id,
        contextUserTenantName: user?.tenant_name,
        prop_userId: userId,
        prop_tenant_name: tenantName,
      });
    }, [user, userId, tenantName]);

    // Log repositories and their default branches for debugging
    console.log(
      '[DeploymentWizardMainClient] Repository list with default branches:',
      repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        default_branch: (repo as any).default_branch,
      })),
    );

    const [step, setStep] = useState(1);
    const [deploymentData, setDeploymentData] = useState<DeploymentData>(initialDeploymentData);
    const [isCreating, setIsCreating] = useState(false);
    const [_submissionError, setSubmissionError] = useState<string | null>(null);

    // Adapt hosts for deployment
    const availableHosts = adaptHostsForDeployment(hosts);

    // State for repository scripts
    const [repositoryScripts, setRepositoryScripts] = useState<any[]>([]);
    const [isLoadingScripts, setIsLoadingScripts] = useState(false);
    const [scriptsError, setScriptsError] = useState<string | null>(null);
    // Track permanent API failures to prevent retries
    const [hasApiPermissionError, setHasApiPermissionError] = useState(false);

    // Track if scripts are currently being loaded
    const isLoadingRef = useRef(false);

    // Modify the useEffect dependency array to remove isLoadingScripts
    useEffect(() => {
      console.log(
        `[DeploymentWizard] Current step: ${step}, repositoryId: ${deploymentData.repositoryId?.substring(0, 8) || 'none'}...`,
      );

      // Only fetch scripts when on step 2 and a repository is selected
      // Check loading ref instead of state to avoid dependency cycle
      // Also skip if we already know there's a permission error with this repo
      if (
        step === 2 &&
        deploymentData.repositoryId &&
        !isLoadingRef.current &&
        !hasApiPermissionError
      ) {
        // Track if the effect was cleaned up
        let isMounted = true;

        // Set loading state FIRST before any other operations
        isLoadingRef.current = true;
        setIsLoadingScripts(true);
        setScriptsError(null);

        console.log('[DeploymentWizard] Starting to load scripts for repository');

        const loadScripts = async () => {
          try {
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

            console.log(`[DeploymentWizard] Getting files directly using gitService`);

            try {
              // Determine provider type and extract repository info using gitService
              const providerType = gitService.detectProviderFromUrl(selectedRepo.url);
              const { owner, repo } = gitService.parseRepositoryUrl(selectedRepo.url, providerType);

              console.log(
                `[DeploymentWizard] Repository info - provider: ${providerType}, owner: ${owner}, repo: ${repo}`,
              );

              if (!owner || !repo) {
                throw new Error('Could not determine repository owner and name from URL');
              }

              // Use gitService.fetchRepositoryContents to get repository files
              const branch = deploymentData.branch || 'main';

              // Find all scripts in the repository (root and subdirectories)
              // Limit to depth 2 to avoid infinite recursion and API rate limits
              const allFiles = await gitService.findScriptsRecursively(
                selectedRepo.url,
                owner,
                repo,
                branch,
                providerType,
                {
                  path: '',
                  depth: 0,
                  maxDepth: MAX_REPOSITORY_SCAN_DEPTH,
                  maxFoldersPerLevel: MAX_FOLDERS_PER_LEVEL,
                },
              );

              console.log(
                `[DeploymentWizard] Recursive scan found ${allFiles.length} script files`,
              );

              // Use all the script files we found
              const filteredFiles = allFiles;

              console.log(
                `[DeploymentWizard] After filtering: ${filteredFiles.length} script files`,
              );

              // Prepare final state updates - we'll apply them all at once
              let newScripts: any[] = [];
              let newError: string | null = null;

              if (filteredFiles.length > 0) {
                // Transform to script format
                newScripts = filteredFiles.map((file, index) => ({
                  id: `script-${index}`,
                  name: file.name,
                  path: file.path,
                  description: `${file.path} (${file.size} bytes)`,
                  parameters: [],
                  type: file.name.endsWith('.py') ? 'python' : 'shell',
                }));

                console.log(
                  `[DeploymentWizard] Successfully found ${newScripts.length} script files`,
                );
              } else {
                // Check if we have API errors by checking fetchError in the error catch blocks
                let detected403Error = hasApiPermissionError;

                // If we have no scripts but the API calls are going through, it's likely just an empty repo
                // But if we're getting 403 errors, we should show that instead
                if (detected403Error) {
                  console.log(`[DeploymentWizard] API rate limit error detected`);
                  newError =
                    'API rate limit reached (HTTP 403). GitHub is restricting access to this repository.';
                } else {
                  console.log(
                    `[DeploymentWizard] No script files found, but API appears to be working`,
                  );
                  newError = 'No Python (.py) or Shell (.sh) scripts found in this repository.';
                }
              }

              // Only update state if component is still mounted
              if (isMounted) {
                // Batch all state updates together to prevent multiple re-renders
                setRepositoryScripts(newScripts);
                setScriptsError(newError);
                setIsLoadingScripts(false);
                isLoadingRef.current = false;
                console.log('[DeploymentWizard] Script loading complete');
              }
            } catch (fetchError: any) {
              console.error('[DeploymentWizard] Error fetching repository contents:', fetchError);

              if (isMounted) {
                // Check specifically for 403 errors
                const is403Error = fetchError.message && fetchError.message.includes('403');

                if (is403Error) {
                  console.log(
                    '[DeploymentWizard] Detected 403 Forbidden error, marking repository as inaccessible',
                  );
                  // Set the permanent error flag to prevent future retries
                  setHasApiPermissionError(true);
                }

                const errorMessage = is403Error
                  ? 'API rate limit reached (HTTP 403). GitHub is restricting access due to too many requests. Please try again later or select a different repository.'
                  : fetchError.name === 'AbortError'
                    ? 'Request timed out. Please try again or select a different repository.'
                    : fetchError.message || 'Failed to retrieve repository files';

                // Batch all state updates to prevent multiple re-renders
                setRepositoryScripts([]);
                setScriptsError(errorMessage);
                setIsLoadingScripts(false);
                isLoadingRef.current = false;
                console.log('[DeploymentWizard] Error in script loading');
              }
            }
          } catch (error: any) {
            console.error('[DeploymentWizard] Error in script loading process:', error);
            if (isMounted) {
              // Check for 403 in general errors too
              const is403Error = error?.message && error.message.includes('403');

              if (is403Error) {
                console.log(
                  '[DeploymentWizard] Detected 403 Forbidden error in general error handler',
                );
                // Set the permanent error flag to prevent future retries
                setHasApiPermissionError(true);
              }

              // Batch all state updates to prevent multiple re-renders
              setRepositoryScripts([]);
              setScriptsError(error instanceof Error ? error.message : 'Failed to load scripts');
              setIsLoadingScripts(false);
              isLoadingRef.current = false;
              console.log('[DeploymentWizard] Error in script loading');
            }
          }
        };

        loadScripts();

        // Cleanup function that always runs when component unmounts or deps change
        return () => {
          isMounted = false;

          // Make sure loading state is reset in cleanup
          if (isLoadingRef.current) {
            isLoadingRef.current = false;
            setIsLoadingScripts(false);
          }
        };
      }
    }, [
      step,
      deploymentData.repositoryId,
      deploymentData.branch,
      deploymentData.selectedRepository,
      hasApiPermissionError, // Include this to prevent re-runs if we've seen a 403
    ]);

    // Update the step change effect to use the ref
    useEffect(() => {
      // If we're not on step 2 anymore but loading state is still true
      if (step !== 2 && (isLoadingScripts || isLoadingRef.current)) {
        console.log(
          '[DeploymentWizard] Step changed during script loading - resetting loading state',
        );
        setIsLoadingScripts(false);
        isLoadingRef.current = false;

        // If we have pending API requests, also show an error
        if (scriptsError === null) {
          setScriptsError('Operation cancelled due to navigation');
        }
      }
    }, [step, isLoadingScripts, scriptsError]);

    // Update the timeout effect to use the ref
    useEffect(() => {
      if (isLoadingScripts || isLoadingRef.current) {
        // Set a 15-second maximum loading time as UI safeguard
        const timeoutId = setTimeout(() => {
          console.log('[DeploymentWizard] Loading timeout reached - resetting state');
          setIsLoadingScripts(false);
          isLoadingRef.current = false;
          setScriptsError(
            'Repository request timed out. Please try again or select a different repository.',
          );
        }, 15000);

        return () => clearTimeout(timeoutId);
      }
    }, [isLoadingScripts]);

    // Log when branch changes to help debug
    useEffect(() => {
      if (deploymentData.repositoryId && deploymentData.branch) {
        console.log(
          `[DeploymentWizard] Branch updated for repo ${deploymentData.repositoryId}: ${deploymentData.branch}`,
        );
      }
    }, [deploymentData.repositoryId, deploymentData.branch]);

    const handleInputChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
      const { name, value } = e.target;

      // Special handling for repositoryId to log selection
      if (name === 'repositoryId') {
        // If repositoryId is empty or changed, update related fields
        if (value) {
          // Find the repository in our array
          const selectedRepo = repositories.find((r) => r.id === value) as Repository;

          if (selectedRepo) {
            // Get the default branch from repository or fall back to 'main'
            const defaultBranch = (selectedRepo as any).default_branch || 'main';

            console.log(
              `[DeploymentWizard] Selected repository: ${selectedRepo.name}, default branch: ${defaultBranch}`,
            );

            // If user changes repository, reset the API permission error state
            // This allows trying a different repository after a 403
            if (deploymentData.repositoryId !== value && hasApiPermissionError) {
              console.log(
                '[DeploymentWizard] Repository changed, resetting API permission error state',
              );
              setHasApiPermissionError(false);
            }

            // Update multiple fields at once
            setDeploymentData((prev) => ({
              ...prev,
              repositoryId: value,
              selectedRepository: selectedRepo as any, // Cast to any to avoid type conflicts
              branch: defaultBranch, // Always set the branch to the repository's default branch
            }));

            // Early return since we've already updated the state
            return;
          }
        }

        // Handle clearing the selection or invalid selection
        setDeploymentData((prev) => ({
          ...prev,
          repositoryId: value,
          selectedRepository: undefined,
          branch: 'main', // Reset to default
        }));

        // Reset API permission error when clearing repository
        if (hasApiPermissionError) {
          setHasApiPermissionError(false);
        }

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
      // If going to step 2 with a repository selected, set loading state
      if (step === 1 && deploymentData.repositoryId) {
        setIsLoadingScripts(true);
      }
      setStep((prev) => prev + 1);
    };

    const handlePrevStep = () => {
      setStep((prev) => prev - 1);
    };

    // Get the React Query client
    const queryClient = useQueryClient();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      console.log('[@component:DeploymentWizardMainClient:handleSubmit] Starting form submission');
      setIsCreating(true);
      setSubmissionError(null);

      try {
        console.log(
          '[@component:DeploymentWizardMainClient:handleSubmit] Creating form data object',
          {
            userId: user?.id || userId,
            teamId,
            tenantName: user?.tenant_name || tenantName,
          },
        );

        const formData: QueuedDeploymentFormData = {
          name: deploymentData.name,
          description: deploymentData.description,
          repository_id: deploymentData.repositoryId,
          host_id: deploymentData.hostIds[0],
          script_id: deploymentData.scriptIds[0],
          team_id: teamId,
          creator_id: user?.id || userId,
          provider: {
            type: 'github', // Default to github or get from repository if available
            config: {
              url: deploymentData.selectedRepository?.url || '',
              token: '', // This would be from secure storage
              tenant_name: user?.tenant_name || tenantName || '',
            },
          },
          configuration: {
            name: deploymentData.name,
            description: deploymentData.description,
            branch: deploymentData.branch || 'main',
            scriptIds: deploymentData.scriptIds,
            parameters: deploymentData.scriptIds.map((scriptId) =>
              JSON.stringify(deploymentData.scriptParameters[scriptId] || {}),
            ),
            hostIds: deploymentData.hostIds,
            environmentVars: deploymentData.environmentVars.reduce(
              (acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
              },
              {} as Record<string, string>,
            ),
            schedule: {
              enabled: deploymentData.schedule !== 'now',
              cronExpression: deploymentData.cronExpression,
              repeatCount: deploymentData.repeatCount,
            },
            notifications: {
              enabled: deploymentData.notifications.email || deploymentData.notifications.slack,
              onSuccess: deploymentData.notifications.email,
              onFailure: deploymentData.notifications.slack,
            },
          },
          autoStart: deploymentData.schedule === 'now',
        };

        // Detailed logging of the form data for debugging
        console.log('[@component:DeploymentWizardMainClient:handleSubmit] Form data details:', {
          basic: {
            name: formData.name,
            description: formData.description,
            repository_id: formData.repository_id,
            host_id: formData.host_id,
            script_id: formData.script_id,
          },
          configuration: {
            scripts: formData.configuration.scriptIds,
            hosts: formData.configuration.hostIds,
            branch: formData.configuration.branch,
            schedule: formData.configuration.schedule,
            notifications: formData.configuration.notifications,
          },
          autoStart: formData.autoStart,
        });

        const result = await createDeploymentWithQueue(formData);
        console.log(
          '[@component:DeploymentWizardMainClient:handleSubmit] Server response:',
          result,
        );

        if (result.success) {
          console.log(
            '[@component:DeploymentWizardMainClient:handleSubmit] Deployment created successfully',
          );
          toast({
            title: 'Deployment created',
            description: 'Your deployment has been created successfully.',
            variant: 'default',
          });

          // Reset form and notify parent
          setDeploymentData(initialDeploymentData);
          setStep(1);
          queryClient.invalidateQueries({ queryKey: ['deployments'] });
          onDeploymentCreated();
        } else {
          console.error(
            '[@component:DeploymentWizardMainClient:handleSubmit] Server returned error:',
            result.error,
          );
          throw new Error(result.error);
        }
      } catch (error: any) {
        console.error(
          '[@component:DeploymentWizardMainClient:handleSubmit] Error creating deployment:',
          {
            message: error.message,
            stack: error.stack,
            formData: deploymentData,
          },
        );
        setSubmissionError(error.message);
        toast({
          title: 'Error creating deployment',
          description: error.message.includes('timed out')
            ? 'The job submission timed out. Please try again or contact support if the issue persists.'
            : error.message,
          variant: 'destructive',
        });
      } finally {
        console.log(
          '[@component:DeploymentWizardMainClient:handleSubmit] Form submission completed',
        );
        setIsCreating(false);
      }
    };

    return (
      <div className="rounded-lg shadow-md p-2 bg-background ">
        <div className="mb-1 ">
          <div className="flex justify-between items-center ">
            <button
              onClick={handleCancelWizard}
              className="flex items-center text-xs text-gray-600 dark:text-gray-400 hover:underline"
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
              className={`flex flex-col items-center ${step >= 1 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 1 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                1
              </div>
              <div className="text-xs mt-1">Details</div>
            </div>

            <div className="flex-1 flex items-center">
              <div
                className={`h-0.5 w-full ${step >= 2 ? 'bg-gray-500 dark:bg-gray-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              ></div>
            </div>

            <div
              className={`flex flex-col items-center ${step >= 2 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 2 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                2
              </div>
              <div className="text-xs mt-1">Scripts</div>
            </div>

            <div className="flex-1 flex items-center">
              <div
                className={`h-0.5 w-full ${step >= 3 ? 'bg-gray-500 dark:bg-gray-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              ></div>
            </div>

            <div
              className={`flex flex-col items-center ${step >= 3 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 3 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                3
              </div>
              <div className="text-xs mt-1">Hosts</div>
            </div>

            <div className="flex-1 flex items-center">
              <div
                className={`h-0.5 w-full ${step >= 4 ? 'bg-gray-500 dark:bg-gray-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              ></div>
            </div>

            <div
              className={`flex flex-col items-center ${step >= 4 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 4 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                4
              </div>
              <div className="text-xs mt-1">Schedule</div>
            </div>

            <div className="flex-1 flex items-center">
              <div
                className={`h-0.5 w-full ${step >= 5 ? 'bg-gray-500 dark:bg-gray-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              ></div>
            </div>

            <div
              className={`flex flex-col items-center ${step >= 5 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 5 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-700'}`}
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
              name={deploymentData.name || ''}
              description={deploymentData.description || ''}
              repositoryId={deploymentData.repositoryId || ''}
              branch={deploymentData.branch || ''}
              repositories={repositories || []}
              repositoryError={null}
              onInputChange={handleInputChange}
              onNextStep={handleNextStep}
              isStepValid={!!deploymentData.name && !!deploymentData.repositoryId}
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
              hostsError={null} // Server will handle timeouts
              onHostToggle={handleHostsChange}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              isStepValid={deploymentData.hostIds.length > 0}
            />
          )}

          {/* Step 4: Schedule */}
          {step === 4 && (
            <DeploymentWizardStep4Client
              schedule={deploymentData.schedule}
              scheduledTime={deploymentData.scheduledTime || ''}
              cronExpression={deploymentData.cronExpression || ''}
              repeatCount={deploymentData.repeatCount || 0}
              onInputChange={handleInputChange}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              isStepValid={
                deploymentData.schedule === 'now' ||
                (deploymentData.schedule === 'later' && !!deploymentData.scheduledTime)
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
              _onCancel={onCancel}
              onSubmit={handleSubmit}
              isPending={isCreating}
              availableHosts={availableHosts}
              repositoryScripts={repositoryScripts}
            />
          )}
        </form>
      </div>
    );
  },
);

DeploymentWizardMainClient.displayName = 'DeploymentWizard';

export { DeploymentWizardMainClient };
