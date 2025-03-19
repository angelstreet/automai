'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DeploymentData, ScriptParameter, Repository, Host as HostType } from '../types';
import { useRepositories, useRepositoryScripts } from '../../repositories/hooks';
import { useHosts } from '../../hosts/hooks';
import { Host as SystemHost } from '../../hosts/types';
import DeploymentWizardStep1 from './DeploymentWizardStep1';
import DeploymentWizardStep2 from './DeploymentWizardStep2';
import DeploymentWizardStep3 from './DeploymentWizardStep3';
import DeploymentWizardStep4 from './DeploymentWizardStep4';
import DeploymentWizardStep5 from './DeploymentWizardStep5';

// Helper function to adapt system hosts to the format expected by the deployment module
const adaptHostsForDeployment = (systemHosts: SystemHost[]): HostType[] => {
  return systemHosts.map(host => ({
    id: host.id,
    name: host.name,
    environment: host.is_windows ? 'Windows' : 'Linux', // Use OS type as environment
    status: host.status === 'connected' ? 'online' : 'offline',
    ip: host.ip
  }));
};

interface DeploymentWizardProps {
  onComplete: () => void;
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
    slack: false
  },
  jenkinsConfig: {
    enabled: false
  }
};

const DeploymentWizard: React.FC<DeploymentWizardProps> = ({ 
  onComplete
}) => {
  const [step, setStep] = useState(1);
  const [deploymentData, setDeploymentData] = useState<DeploymentData>(initialDeploymentData);
  const [showJenkinsView, setShowJenkinsView] = useState(false);
  
  // Use the repository hook
  const { 
    repositories, 
    loading: isLoadingRepositories, 
    error: repositoryError 
  } = useRepositories();
  
  // Use the repository scripts hook with a valid repository ID
  const {
    scripts: repositoryScripts,
    isLoading: isLoadingScripts,
    error: scriptsError
  } = useRepositoryScripts(deploymentData.repositoryId || undefined, deploymentData.selectedRepository);

  // Use the hosts hook and adapt hosts for deployment
  const { 
    hosts: systemHosts, 
    loading: isLoadingHosts, 
    error: hostsError 
  } = useHosts();
  const availableHosts = adaptHostsForDeployment(systemHosts);

  // Add debug logging for the scripts
  useEffect(() => {
    console.log('Repository scripts:', repositoryScripts);
    console.log('Scripts loading:', isLoadingScripts);
    console.log('Scripts error:', scriptsError);
  }, [repositoryScripts, isLoadingScripts, scriptsError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for repositoryId to log selection
    if (name === 'repositoryId') {
      console.log('Repository selected:', value);
      console.log('Available repositories:', repositories);
      
      if (value) {
        const selectedRepo = repositories.find((r: Repository) => r.id === value);
        console.log('Selected repository details:', selectedRepo);
        
        // Store the full repository object
        setDeploymentData(prev => ({
          ...prev,
          repositoryId: value,
          selectedRepository: selectedRepo
        }));
        
        // Early return since we've already updated the state
        return;
      }
    }
    
    setDeploymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleScriptsChange = (scriptIds: string[]) => {
    setDeploymentData(prev => {
      // Calculate which scripts were removed
      const removedScriptIds = prev.scriptIds.filter(id => !scriptIds.includes(id));
      
      // Update script parameters - remove parameters for scripts that are no longer selected
      const newScriptParameters = { ...prev.scriptParameters };
      removedScriptIds.forEach(scriptId => {
        if (newScriptParameters[scriptId]) {
          delete newScriptParameters[scriptId];
        }
      });
      
      return {
        ...prev,
        scriptIds: scriptIds,
        scriptParameters: newScriptParameters
      };
    });
  };

  const handleBatchScriptsChange = (scriptIds: string[], isSelected: boolean) => {
    setDeploymentData(prev => {
      let newScriptIds: string[];
      
      if (isSelected) {
        // Add all scripts that aren't already selected
        newScriptIds = [...new Set([...prev.scriptIds, ...scriptIds])];
      } else {
        // Remove all specified scripts
        newScriptIds = prev.scriptIds.filter(id => !scriptIds.includes(id));
      }
      
      // Update script parameters
      const newScriptParameters = { ...prev.scriptParameters };
      
      // If scripts are deselected, remove their parameters
      if (!isSelected) {
        scriptIds.forEach(scriptId => {
          if (newScriptParameters[scriptId]) {
            delete newScriptParameters[scriptId];
          }
        });
      }
      
      return {
        ...prev,
        scriptIds: newScriptIds,
        scriptParameters: newScriptParameters
      };
    });
  };

  const handleScriptParameterChange = (scriptId: string, paramId: string, value: string) => {
    setDeploymentData(prev => {
      const scriptParams = prev.scriptParameters[scriptId] || {};
      return {
        ...prev,
        scriptParameters: {
          ...prev.scriptParameters,
          [scriptId]: {
            ...scriptParams,
            [paramId]: value
          }
        }
      };
    });
  };

  const handleHostsChange = (hostId: string) => {
    // Update host selection without triggering form submission
    setDeploymentData(prev => ({
      ...prev,
      hostIds: prev.hostIds.includes(hostId)
        ? prev.hostIds.filter(id => id !== hostId)
        : [...prev.hostIds, hostId]
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name.startsWith('notifications.')) {
      const notificationType = name.split('.')[1];
      setDeploymentData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [notificationType]: checked
        }
      }));
    }
  };

  const handleJenkinsConfigChange = (config: any) => {
    setDeploymentData(prev => ({
      ...prev,
      jenkinsConfig: {
        ...(prev.jenkinsConfig || {}),
        ...config
      }
    }));
  };

  const handleAddEnvVar = () => {
    setDeploymentData(prev => ({
      ...prev,
      environmentVars: [...prev.environmentVars, { key: '', value: '' }]
    }));
  };

  const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
    setDeploymentData(prev => {
      const newEnvVars = [...prev.environmentVars];
      newEnvVars[index] = { ...newEnvVars[index], [field]: value };
      return { ...prev, environmentVars: newEnvVars };
    });
  };

  const handleRemoveEnvVar = (index: number) => {
    setDeploymentData(prev => {
      const newEnvVars = [...prev.environmentVars];
      newEnvVars.splice(index, 1);
      return { ...prev, environmentVars: newEnvVars };
    });
  };

  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if the event was triggered by a select all/unselect all button or environment tag
    const target = e.target as HTMLElement;
    const isSelectAllButton = target.closest('button')?.textContent?.includes('Select All') || 
                             target.closest('button')?.textContent?.includes('Unselect All');
    const isFilterButton = target.closest('button')?.textContent?.includes('Filter');
    const isEnvironmentTag = target.closest('button')?.textContent?.startsWith('#');
    
    if (isSelectAllButton || isFilterButton || isEnvironmentTag) {
      // Don't proceed with form submission if it was triggered by select all/unselect all or environment tag
      return;
    }
    
    // Only proceed with form submission if we're on the final step (review)
    if (step !== 5) {
      return;
    }
    
    console.log('Deployment data submitted:', deploymentData);
    // Here you would typically send the data to your API
    alert('Deployment created successfully!');
    onComplete();
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
        return deploymentData.schedule === 'now' || (deploymentData.schedule === 'later' && deploymentData.scheduledTime !== '');
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
            onClick={onComplete} 
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
          <div className={`flex flex-col items-center ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 1 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
              1
            </div>
            <div className="text-xs mt-1">Details</div>
          </div>
          
          <div className="flex-1 flex items-center">
            <div className={`h-0.5 w-full ${step >= 2 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          </div>
          
          <div className={`flex flex-col items-center ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 2 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
              2
            </div>
            <div className="text-xs mt-1">Scripts</div>
          </div>
          
          <div className="flex-1 flex items-center">
            <div className={`h-0.5 w-full ${step >= 3 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          </div>
          
          <div className={`flex flex-col items-center ${step >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 3 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
              3
            </div>
            <div className="text-xs mt-1">Hosts</div>
          </div>
          
          <div className="flex-1 flex items-center">
            <div className={`h-0.5 w-full ${step >= 4 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          </div>
          
          <div className={`flex flex-col items-center ${step >= 4 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 4 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
              4
            </div>
            <div className="text-xs mt-1">Schedule</div>
          </div>
          
          <div className="flex-1 flex items-center">
            <div className={`h-0.5 w-full ${step >= 5 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          </div>
          
          <div className={`flex flex-col items-center ${step >= 5 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 5 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
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
            isLoadingRepositories={isLoadingRepositories}
            repositoryError={repositoryError}
            onInputChange={handleInputChange}
            onNextStep={handleNextStep}
            isStepValid={isStepValid}
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
            onScriptsChange={handleScriptsChange}
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
            isLoadingHosts={isLoadingHosts}
            hostsError={hostsError}
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
        
        {/* Step 5: Review with Jenkins Integration */}
        {step === 5 && (
          <DeploymentWizardStep5
            showJenkinsView={showJenkinsView}
            setShowJenkinsView={setShowJenkinsView}
            scriptIds={deploymentData.scriptIds}
            scriptParameters={deploymentData.scriptParameters}
            hostIds={deploymentData.hostIds}
            schedule={deploymentData.schedule}
            scheduledTime={deploymentData.scheduledTime}
            cronExpression={deploymentData.cronExpression}
            repeatCount={deploymentData.repeatCount}
            repositoryScripts={repositoryScripts}
            availableHosts={availableHosts}
            jenkinsConfig={deploymentData.jenkinsConfig}
            onJenkinsConfigChange={(enabled, config) => {
              setDeploymentData(prev => ({
                ...prev,
                jenkinsConfig: {
                  ...config,
                  enabled
                }
              }));
            }}
            onPrevStep={handlePrevStep}
          />
        )}
      </form>
    </div>
  );
};

export default DeploymentWizard;