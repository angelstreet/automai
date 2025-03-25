'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Host as HostType } from '../types';
import CustomSwitch from './CustomSwitch';
import { useCICD } from '@/context';

interface DeploymentWizardStep5Props {
  scriptIds: string[];
  scriptParameters: Record<string, any>;
  hostIds: string[];
  schedule: string;
  scheduledTime: string;
  cronExpression: string;
  repeatCount: number;
  repositoryScripts: any[];
  availableHosts: HostType[];
  onPrevStep: () => void;
  isSubmitting?: boolean;
}

const DeploymentWizardStep5: React.FC<DeploymentWizardStep5Props> = ({
  scriptIds,
  scriptParameters,
  hostIds,
  schedule,
  scheduledTime,
  cronExpression,
  repeatCount,
  repositoryScripts,
  availableHosts,
  onPrevStep,
  isSubmitting = false,
}) => {
  const t = useTranslations('deployment.wizard');
  const cicdContext = useCICD();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>();
  const [toggleView, setToggleView] = useState(false);

  // Auto-select first provider on mount
  useEffect(() => {
    const selectFirstProvider = async () => {
      if (!cicdContext) return;
      
      try {
        setIsLoading(true);
        const result = await cicdContext.fetchProviders();
        const providers = result.data || [];
        
        if (providers.length > 0) {
          const firstProvider = providers[0];
          setSelectedProviderId(firstProvider.id);
        }
      } catch (err) {
        console.error('Error fetching providers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    selectFirstProvider();
  }, [cicdContext]);

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
            checked={toggleView}
            onCheckedChange={setToggleView}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLoading}
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

      <div className="space-y-4">
        {toggleView ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">{t('pipelinePreview')}</h3>
            </div>
            
            <div className="bg-gray-900 rounded-md shadow-sm border border-gray-700 p-4 overflow-auto max-h-96">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre">
{`pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Deploy Scripts') {
            steps {
                script {
                    // Deploy scripts to selected hosts
                    ${scriptIds.map((scriptId) => {
                      const script = repositoryScripts.find(s => s.id === scriptId);
                      const params = scriptParameters[scriptId]?.['raw'] || '';
                      return `sh "automai-deploy ${script?.path || scriptId} ${params}"`;
                    }).join('\n                    ')}
                }
            }
        }
    }
}`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('deploymentSummary')}</h4>
            
            <div className="space-y-4">
              {/* Scripts */}
              <div className="space-y-2 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {scriptIds.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-3">{t('noScriptsSelected')}</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">#</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">{t('scriptPath')}</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">{t('parameters')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {scriptIds.map((scriptId, index) => {
                          const script = repositoryScripts.find(s => s.id === scriptId);
                          const params = scriptParameters[scriptId]?.['raw'] || '';
                          
                          return (
                            <tr key={scriptId}>
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded text-center text-xs">
                                  {index + 1}
                                </div>
                              </td>
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                <span className="text-xs text-gray-800 dark:text-gray-200 font-mono">
                                  {script?.path || scriptId}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 whitespace-nowrap">
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
                  )}
                </div>
              </div>
              
              {/* Target Hosts */}
              <div>
                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('targetHosts')}</h5>
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
                    <p className="text-xs text-gray-500">{t('noHostsSelected')}</p>
                  )}
                </div>
              </div>
              
              {/* Schedule */}
              <div>
                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('schedule')}</h5>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2">
                  <div className="text-xs text-gray-800 dark:text-gray-200">
                    {schedule === 'now' ? (
                      <span>{t('deployImmediately')}</span>
                    ) : (
                      <div className="space-y-1">
                        <div>{t('scheduledFor')}: <span className="font-medium">{scheduledTime}</span></div>
                        {cronExpression && (
                          <div>{t('cron')}: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">{cronExpression}</code></div>
                        )}
                        {(repeatCount || 0) > 0 && (
                          <div>{t('repeat')}: <span className="font-medium">{repeatCount || 0} {t('times')}</span></div>
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
