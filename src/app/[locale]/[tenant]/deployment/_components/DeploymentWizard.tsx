'use client';

import React, { useState } from 'react';
import { ArrowLeft, Calendar, Server, Code, CheckCircle } from 'lucide-react';

interface DeploymentWizardProps {
  onComplete: () => void;
}

const DeploymentWizard: React.FC<DeploymentWizardProps> = ({ 
  onComplete
}) => {
  const [step, setStep] = useState(1);
  const [deploymentData, setDeploymentData] = useState({
    name: '',
    description: '',
    repositoryId: '',
    scriptIds: [] as string[],
    hostIds: [] as string[],
    schedule: 'now',
    scheduledTime: '',
    environmentVars: [] as Array<{key: string, value: string}>,
    notifications: {
      email: false,
      slack: false
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDeploymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleScriptsChange = (scriptId: string) => {
    setDeploymentData(prev => ({
      ...prev,
      scriptIds: prev.scriptIds.includes(scriptId)
        ? prev.scriptIds.filter(id => id !== scriptId)
        : [...prev.scriptIds, scriptId]
    }));
  };

  const handleHostsChange = (hostId: string) => {
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
    console.log('Deployment data submitted:', deploymentData);
    // Here you would typically send the data to your API
    alert('Deployment created successfully!');
    onComplete();
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return deploymentData.name.trim() !== '' && deploymentData.repositoryId !== '';
      case 2:
        return deploymentData.scriptIds.length > 0;
      case 3:
        return deploymentData.hostIds.length > 0;
      case 4:
        return true; // Review step is always valid
      default:
        return false;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3">
      <div className="mb-2">
        <div className="flex justify-between items-center">
          <button 
            onClick={onComplete} 
            className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft size={12} className="mr-1" />
            Back to Deployments
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create New Deployment</h2>
          <div></div> {/* Empty div for flex spacing */}
        </div>
      </div>

      {/* Progress indicator - with larger numbers */}
      <div className="mb-3">
        <div className="flex justify-between">
          <div className={`flex flex-col items-center ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 flex items-center justify-center rounded-full border ${step >= 1 ? 'border-blue-600 dark:border-blue-400 bg-blue-100 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-700'}`}>
              <span className="text-sm font-medium">1</span>
            </div>
            <span className="text-xs">Details</span>
          </div>
          <div className={`flex-1 h-0.5 mt-3 mx-1 ${step >= 2 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
          <div className={`flex flex-col items-center ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 flex items-center justify-center rounded-full border ${step >= 2 ? 'border-blue-600 dark:border-blue-400 bg-blue-100 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-700'}`}>
              <span className="text-sm font-medium">2</span>
            </div>
            <span className="text-xs">Scripts</span>
          </div>
          <div className={`flex-1 h-0.5 mt-3 mx-1 ${step >= 3 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
          <div className={`flex flex-col items-center ${step >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 flex items-center justify-center rounded-full border ${step >= 3 ? 'border-blue-600 dark:border-blue-400 bg-blue-100 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-700'}`}>
              <span className="text-sm font-medium">3</span>
            </div>
            <span className="text-xs">Hosts</span>
          </div>
          <div className={`flex-1 h-0.5 mt-3 mx-1 ${step >= 4 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
          <div className={`flex flex-col items-center ${step >= 4 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 flex items-center justify-center rounded-full border ${step >= 4 ? 'border-blue-600 dark:border-blue-400 bg-blue-100 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-700'}`}>
              <span className="text-sm font-medium">4</span>
            </div>
            <span className="text-xs">Review</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Deployment Details</h3>
            
            {/* Name and description stacked vertically */}
            <div className="mb-2">
              <label htmlFor="name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Deployment Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={deploymentData.name}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            
            <div className="mb-2">
              <label htmlFor="description" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={deploymentData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>
            
            <div className="mb-2">
              <label htmlFor="repositoryId" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Repository *
              </label>
              <select
                id="repositoryId"
                name="repositoryId"
                value={deploymentData.repositoryId}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select a repository</option>
                <option value="repo1">Main Repository</option>
                <option value="repo2">Frontend Repository</option>
                <option value="repo3">Backend Repository</option>
              </select>
            </div>
            
            {/* Schedule options and navigation buttons in same row */}
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Schedule
                </label>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="scheduleNow"
                      name="schedule"
                      value="now"
                      checked={deploymentData.schedule === 'now'}
                      onChange={handleInputChange}
                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <label htmlFor="scheduleNow" className="ml-1 text-xs text-gray-700 dark:text-gray-300">
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
                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <label htmlFor="scheduleLater" className="ml-1 text-xs text-gray-700 dark:text-gray-300">
                      Schedule for later
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Navigation buttons */}
              <div className="flex justify-end">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-2 py-1 mr-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    Previous
                  </button>
                ) : (
                  <div></div>
                )}
                
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!isStepValid()}
                    className={`px-2 py-1 rounded-md shadow-sm text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isStepValid() 
                        ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' 
                        : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-2 py-1 rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    Create Deployment
                  </button>
                )}
              </div>
            </div>
            
            {deploymentData.schedule === 'later' && (
              <div className="mt-2">
                <label htmlFor="scheduledTime" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Scheduled Time *
                </label>
                <input
                  type="datetime-local"
                  id="scheduledTime"
                  name="scheduledTime"
                  value={deploymentData.scheduledTime}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required={deploymentData.schedule === 'later'}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Select Scripts */}
        {step === 2 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Select Scripts</h3>
              
              {/* Navigation buttons */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-2 py-1 mr-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  Previous
                </button>
                
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!isStepValid()}
                  className={`px-2 py-1 rounded-md shadow-sm text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isStepValid() 
                      ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' 
                      : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                {[
                  { id: 'script1', name: 'Deployment Script', path: '/scripts/deploy.sh', repository: 'main' },
                  { id: 'script2', name: 'Backup Script', path: '/scripts/backup.sh', repository: 'main' },
                  { id: 'script3', name: 'Monitoring Script', path: '/scripts/monitor.sh', repository: 'main' },
                ].map((script) => (
                  <div
                    key={script.id}
                    className="flex items-center px-2 py-1 border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      id={`script-${script.id}`}
                      checked={deploymentData.scriptIds.includes(script.id)}
                      onChange={() => handleScriptsChange(script.id)}
                      className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor={`script-${script.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-xs text-gray-900 dark:text-white">
                        {script.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {script.path}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Select Target Hosts */}
        {step === 3 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Select Target Hosts</h3>
              
              {/* Navigation buttons */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-2 py-1 mr-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  Previous
                </button>
                
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!isStepValid()}
                  className={`px-2 py-1 rounded-md shadow-sm text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isStepValid() 
                      ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' 
                      : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                {[
                  { id: 'host1', name: 'Production Server 1', environment: 'Production', status: 'online', ip: '192.168.1.10' },
                  { id: 'host2', name: 'Production Server 2', environment: 'Production', status: 'online', ip: '192.168.1.11' },
                  { id: 'host3', name: 'Staging Server', environment: 'Staging', status: 'online', ip: '192.168.2.10' },
                  { id: 'host4', name: 'Development Server', environment: 'Development', status: 'online', ip: '192.168.3.10' },
                ].map((host) => (
                  <div
                    key={host.id}
                    className="flex items-center px-2 py-1 border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      id={`host-${host.id}`}
                      checked={deploymentData.hostIds.includes(host.id)}
                      onChange={() => handleHostsChange(host.id)}
                      className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor={`host-${host.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-xs text-gray-900 dark:text-white">
                        {host.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {host.ip || 'Status: ' + host.status}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Review Deployment</h3>
              
              {/* Navigation buttons */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-2 py-1 mr-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  Previous
                </button>
                
                <button
                  type="submit"
                  className="px-2 py-1 rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  Create Deployment
                </button>
              </div>
            </div>
            
            <div className="space-y-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">Deployment Details</h4>
                <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                  <div className="text-gray-500 dark:text-gray-400">Name:</div>
                  <div className="text-gray-900 dark:text-white">{deploymentData.name}</div>
                  
                  <div className="text-gray-500 dark:text-gray-400">Description:</div>
                  <div className="text-gray-900 dark:text-white">{deploymentData.description || 'N/A'}</div>
                  
                  <div className="text-gray-500 dark:text-gray-400">Repository:</div>
                  <div className="text-gray-900 dark:text-white">
                    {deploymentData.repositoryId === 'repo1' ? 'Main Repository' : 
                     deploymentData.repositoryId === 'repo2' ? 'Frontend Repository' : 
                     deploymentData.repositoryId === 'repo3' ? 'Backend Repository' : 'N/A'}
                  </div>
                  
                  <div className="text-gray-500 dark:text-gray-400">Schedule:</div>
                  <div className="text-gray-900 dark:text-white">
                    {deploymentData.schedule === 'now' ? 'Deploy immediately' : 
                     `Scheduled for ${deploymentData.scheduledTime}`}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">Selected Scripts</h4>
                  {deploymentData.scriptIds.length === 0 ? (
                    <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">No scripts selected</div>
                  ) : (
                    <ul className="mt-0.5 list-disc list-inside text-xs text-gray-900 dark:text-white">
                      {deploymentData.scriptIds.map(id => {
                        const scriptName = 
                          id === 'script1' ? 'Deployment Script' :
                          id === 'script2' ? 'Backup Script' :
                          id === 'script3' ? 'Monitoring Script' : id;
                        return <li key={id}>{scriptName}</li>;
                      })}
                    </ul>
                  )}
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">Target Hosts</h4>
                  {deploymentData.hostIds.length === 0 ? (
                    <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">No hosts selected</div>
                  ) : (
                    <ul className="mt-0.5 list-disc list-inside text-xs text-gray-900 dark:text-white">
                      {deploymentData.hostIds.map(id => {
                        const hostName = 
                          id === 'host1' ? 'Production Server 1' :
                          id === 'host2' ? 'Production Server 2' :
                          id === 'host3' ? 'Staging Server' :
                          id === 'host4' ? 'Development Server' : id;
                        return <li key={id}>{hostName}</li>;
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default DeploymentWizard;