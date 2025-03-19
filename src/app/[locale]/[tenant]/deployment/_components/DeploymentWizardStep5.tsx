'use client';

import React from 'react';
import { Host as HostType, ScriptParameter } from '../types';
import CustomSwitch from './CustomSwitch';
import JenkinsConfig from './JenkinsConfig';

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
    [key: string]: any;
  };
  onJenkinsConfigChange: (enabled: boolean, config: any) => void;
  onPrevStep: () => void;
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
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onPrevStep}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Script View</span>
            <CustomSwitch 
              checked={showJenkinsView}
              onCheckedChange={setShowJenkinsView}
            />
            <span className="text-xs text-gray-500">Jenkins View</span>
          </div>
        </div>
        
        <button
          type="submit"
          className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Deployment
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Show either Jenkins Config or Script Translation based on toggle */}
        {showJenkinsView ? (
          <JenkinsConfig
            enabled={jenkinsConfig.enabled}
            config={jenkinsConfig}
            onChange={onJenkinsConfigChange}
          />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Deployment Summary</h4>
            
            <div className="space-y-4">
              {/* Scripts */}
              <div>
                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scripts</h5>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2">
                  {scriptIds.length > 0 ? (
                    <div className="space-y-2">
                      {scriptIds.map(id => {
                        const script = repositoryScripts.find(s => s.id === id);
                        if (!script) return null;

                        // Format parameter values if any
                        const params = scriptParameters[id];
                        let paramString = '';
                        if (params) {
                          paramString = Object.entries(params)
                            .map(([key, value]) => `${key}=${value}`)
                            .join(', ');
                        }
                          
                        return (
                          <div key={id} className="text-xs">
                            <div className="flex items-center">
                              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded mr-2 min-w-[20px] text-center">
                                {scriptIds.indexOf(id) + 1}
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
                  {hostIds.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {hostIds.map(id => {
                        const host = availableHosts.find(h => h.id === id);
                        if (!host) return null;
                        
                        return (
                          <div key={id} className="text-xs flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${host.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-gray-800 dark:text-gray-200">{host.name}</span>
                            <span className="text-gray-500 ml-1">({host.ip})</span>
                            <span 
                              className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
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
                    {schedule === 'now' ? (
                      <span>Deploy immediately</span>
                    ) : (
                      <div className="space-y-1">
                        <div>Scheduled for: <span className="font-medium">{scheduledTime}</span></div>
                        {cronExpression && (
                          <div>Cron: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">{cronExpression}</code></div>
                        )}
                        {(repeatCount || 0) > 0 && (
                          <div>Repeat: <span className="font-medium">{repeatCount || 0} times</span></div>
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
  );
};

export default DeploymentWizardStep5;