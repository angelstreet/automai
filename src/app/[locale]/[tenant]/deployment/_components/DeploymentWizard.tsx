'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DeploymentData, ScriptParameter, Repository } from '../types';
import { SAMPLE_SCRIPTS, SAMPLE_HOSTS } from '../constants';
import EnhancedScriptSelector from './EnhancedScriptSelector';
import HostSelector from './HostSelector';
import JenkinsConfig from './JenkinsConfig';
import CustomSwitch from './CustomSwitch';
import { useRepositories, useRepositoryScripts } from '../../repositories/hooks';

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

  const handleScriptsChange = (scriptId: string) => {
    setDeploymentData(prev => {
      const newScriptIds = prev.scriptIds.includes(scriptId)
        ? prev.scriptIds.filter(id => id !== scriptId)
        : [...prev.scriptIds, scriptId];
      
      // If script is deselected, remove its parameters
      const newScriptParameters = { ...prev.scriptParameters };
      if (!newScriptIds.includes(scriptId) && newScriptParameters[scriptId]) {
        delete newScriptParameters[scriptId];
      }
      
      return {
        ...prev,
        scriptIds: newScriptIds,
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

  // Use sample hosts from constants

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
          <div>
            <div className="flex justify-end mb-1">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isStepValid()}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isStepValid() 
                    ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' 
                    : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
            
            {/* Name and description stacked vertically */}
            <div className="mb-1">
              <label htmlFor="name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={deploymentData.name}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter deployment name"
                required
              />
            </div>
            
            <div className="mb-1">
              <label htmlFor="description" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={deploymentData.description}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter deployment description (optional)"
              />
            </div>
            
            <div className="mb-1">
              <label htmlFor="repositoryId" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Repository *
              </label>
              <select
                id="repositoryId"
                name="repositoryId"
                value={deploymentData.repositoryId}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
                disabled={isLoadingRepositories}
              >
                <option value="">Select a repository</option>
                {isLoadingRepositories ? (
                  <option value="" disabled>Loading repositories...</option>
                ) : repositoryError ? (
                  <option value="" disabled>Error: {repositoryError}</option>
                ) : repositories.length === 0 ? (
                  <option value="" disabled>No repositories found</option>
                ) : (
                  repositories.map((repo: Repository) => (
                    <option key={repo.id} value={repo.id}>{repo.name}</option>
                  ))
                )}
              </select>
              {isLoadingRepositories && (
                <div className="text-xs text-gray-500 mt-1">Loading repositories...</div>
              )}
              {repositoryError && (
                <div className="text-xs text-red-500 mt-1">{repositoryError}</div>
              )}
            </div>
          </div>
        )}
        
        {/* Step 2: Select Scripts with Parameters */}
        {step === 2 && (
          <div>
            <div className="flex justify-between mb-1">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                Previous
              </button>
              
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isStepValid()}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isStepValid() 
                    ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' 
                    : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
            
            {scriptsError && (
              <div className="mb-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-900 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">
                  Error loading scripts: {scriptsError}
                </p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  Using sample scripts until resolved.
                </p>
              </div>
            )}
            
            <EnhancedScriptSelector
              availableScripts={repositoryScripts.length > 0 ? repositoryScripts : SAMPLE_SCRIPTS}
              selectedScripts={deploymentData.scriptIds}
              scriptParameters={deploymentData.scriptParameters}
              onScriptToggle={handleScriptsChange}
              onParameterChange={handleScriptParameterChange}
              onBatchScriptToggle={handleBatchScriptsChange}
              isProjectSelected={!!deploymentData.repositoryId}
              isLoading={isLoadingScripts}
              error={scriptsError}
            />
          </div>
        )}
        
        {/* Step 3: Select Target Hosts */}
        {step === 3 && (
          <div>
            <div className="flex justify-between mb-1">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                Previous
              </button>
              
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isStepValid()}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isStepValid() 
                    ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' 
                    : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
            
            <HostSelector
              availableHosts={SAMPLE_HOSTS}
              selectedHosts={deploymentData.hostIds}
              onHostToggle={handleHostsChange}
            />
          </div>
        )}
        
        {/* Step 4: Schedule */}
        {step === 4 && (
          <div>
            <div className="flex justify-between mb-1">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                Previous
              </button>
              
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isStepValid()}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isStepValid() 
                    ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' 
                    : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
            
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deployment Schedule
              </label>
              <div className="flex items-center space-x-4 mb-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="scheduleNow"
                    name="schedule"
                    value="now"
                    checked={deploymentData.schedule === 'now'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="scheduleNow" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Deploy now
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="scheduleLater"
                    name="schedule"
                    value="later"
                    checked={deploymentData.schedule === 'later'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="scheduleLater" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Schedule for later
                  </label>
                </div>
              </div>
              
              {deploymentData.schedule === 'later' && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="scheduledTime" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date and Time
                    </label>
                    <input
                      type="datetime-local"
                      id="scheduledTime"
                      name="scheduledTime"
                      value={deploymentData.scheduledTime || ''}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required={deploymentData.schedule === 'later'}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="cronExpression" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cron Expression (Optional)
                    </label>
                    <input
                      type="text"
                      id="cronExpression"
                      name="cronExpression"
                      value={deploymentData.cronExpression || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 0 0 * * *"
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Format: minute hour day-of-month month day-of-week
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="repeatCount" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Repeat Count
                    </label>
                    <input
                      type="number"
                      id="repeatCount"
                      name="repeatCount"
                      min="0"
                      value={deploymentData.repeatCount || 0}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      0 means run once, -1 means repeat indefinitely
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Step 5: Review with Jenkins Integration */}
        {step === 5 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Script View</span>
                  <CustomSwitch 
                    checked={showJenkinsView}
                    onCheckedChange={(checked) => {
                      setShowJenkinsView(checked);
                    }}
                  />
                  <span className="text-xs text-gray-500">Jenkins View</span>
                </div>
              </div>
              
              <button
                type="submit"
                className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                Create Deployment
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Show either Jenkins Config or Script Translation based on toggle */}
              {showJenkinsView ? (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Jenkins Pipeline</h4>
                  
                  <div className="space-y-2">
                    <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto whitespace-pre text-gray-800 dark:text-gray-200">
{`pipeline {
    agent any
    
    parameters {
        string(name: 'DEPLOYMENT_NAME', defaultValue: '${deploymentData.name}', description: 'Deployment name')
        string(name: 'REPOSITORY', defaultValue: '${deploymentData.selectedRepository?.name || ''}', description: 'Repository')
        ${deploymentData.schedule === 'later' ? 
          `string(name: 'SCHEDULED_TIME', defaultValue: '${deploymentData.scheduledTime}', description: 'Scheduled time')` : 
          '// Immediate deployment'}
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
                    def hosts = ${JSON.stringify(deploymentData.hostIds.map(id => {
                      const host = SAMPLE_HOSTS.find(h => h.id === id);
                      return host ? `${host.name} (${host.ip})` : id;
                    }))}
                    
                    hosts.each { host ->
                        echo "Deploying to \${host}"
                    }
                    
                    ${deploymentData.scriptIds.map(id => {
                      const script = repositoryScripts.find(s => s.id === id) || SAMPLE_SCRIPTS.find(s => s.id === id);
                      if (!script) return '';
                      
                      // Format parameters as command-line arguments
                      let paramString = '';
                      if (script.parameters && script.parameters.length > 0) {
                        paramString = script.parameters.map((param: ScriptParameter) => {
                          const paramValue = deploymentData.scriptParameters[script.id]?.[param.id] ?? param.default;
                          if (typeof paramValue === 'boolean') {
                            return paramValue ? `--${param.id}` : '';
                          } else {
                            return paramValue ? `--${param.id}="${paramValue}"` : '';
                          }
                        }).filter(Boolean).join(' ');
                      }
                      
                      return `                    sh "${script.path} ${paramString}"`;
                    }).filter(Boolean).join('\n')}
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
            ${deploymentData.notifications?.email ? 'mail to: "team@example.com", subject: "Deployment Success", body: "The deployment was successful"' : '// No email notification'}
        }
        failure {
            echo "Deployment failed"
            ${deploymentData.notifications?.slack ? 'slackSend channel: "#deployments", color: "danger", message: "Deployment failed"' : '// No Slack notification'}
        }
    }
}`}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Deployment Summary</h4>
                  
                  <div className="space-y-4">
                    {/* Selected Scripts */}
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scripts to Execute</h5>
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2">
                        {deploymentData.scriptIds.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {deploymentData.scriptIds.map(id => {
                              const script = repositoryScripts.find(s => s.id === id) || SAMPLE_SCRIPTS.find(s => s.id === id);
                              if (!script) return null;
                              
                              // Format parameters as command-line arguments
                              let paramString = '';
                              if (script.parameters && script.parameters.length > 0) {
                                paramString = script.parameters.map((param: ScriptParameter) => {
                                  const paramValue = deploymentData.scriptParameters[script.id]?.[param.id] ?? param.default;
                                  if (typeof paramValue === 'boolean') {
                                    return paramValue ? `--${param.id}` : '';
                                  } else {
                                    return paramValue ? `--${param.id}="${paramValue}"` : '';
                                  }
                                }).filter(Boolean).join(' ');
                              }
                              
                              return (
                                <div key={id} className="text-xs">
                                  <div className="flex items-center">
                                    <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded mr-2 min-w-[20px] text-center">
                                      {deploymentData.scriptIds.indexOf(id) + 1}
                                    </div>
                                    <span className="text-gray-800 dark:text-gray-200">{script.path}</span>
                                    {paramString && (
                                      <span className="text-gray-500 ml-2">{paramString}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No scripts selected</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Target Hosts */}
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Target Hosts</h5>
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2">
                        {deploymentData.hostIds.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {deploymentData.hostIds.map(id => {
                              const host = SAMPLE_HOSTS.find(h => h.id === id);
                              if (!host) return null;
                              
                              return (
                                <div key={id} className="text-xs flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-2 ${host.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <span className="text-gray-800 dark:text-gray-200">{host.name}</span>
                                  <span className="text-gray-500 ml-1">({host.ip})</span>
                                  <span 
                                  className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                >
                                  #{host.environment.toLowerCase()}
                                </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No hosts selected</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Schedule */}
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Schedule</h5>
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2">
                        <div className="text-xs text-gray-800 dark:text-gray-200">
                          {deploymentData.schedule === 'now' ? (
                            <span>Deploy immediately</span>
                          ) : (
                            <div className="space-y-1">
                              <div>Scheduled for: <span className="font-medium">{deploymentData.scheduledTime}</span></div>
                              {deploymentData.cronExpression && (
                                <div>Cron: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">{deploymentData.cronExpression}</code></div>
                              )}
                              {(deploymentData.repeatCount || 0) > 0 && (
                                <div>Repeat: <span className="font-medium">{deploymentData.repeatCount || 0} times</span></div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            
              
              
              
              
              
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default DeploymentWizard;