'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Host } from '../types';
import HostSelector from './HostSelector';

interface DeploymentWizardStep3Props {
  hostIds: string[];
  availableHosts: Host[];
  isLoadingHosts: boolean;
  hostsError: string | null;
  onHostToggle: (hostId: string) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  isStepValid: () => boolean;
}

const DeploymentWizardStep3: React.FC<DeploymentWizardStep3Props> = ({
  hostIds,
  availableHosts,
  isLoadingHosts,
  hostsError,
  onHostToggle,
  onPrevStep,
  onNextStep,
  isStepValid,
}) => {
  const t = useTranslations('deployment.wizard');

  // Add a cleanup effect when this component mounts/unmounts
  useEffect(() => {
    console.log('[DeploymentWizardStep3] Component mounted');

    // Return cleanup function
    return () => {
      console.log('[DeploymentWizardStep3] Component unmounted');
    };
  }, []);

  return (
    <div>
      <div className="flex justify-between mb-1">
        <button
          type="button"
          onClick={onPrevStep}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {t('previous')}
        </button>

        <button
          type="button"
          onClick={onNextStep}
          disabled={!isStepValid()}
          className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            isStepValid()
              ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
              : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
          }`}
        >
          {t('next')}
        </button>
      </div>

      {isLoadingHosts ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">{t('loadingHosts')}</span>
        </div>
      ) : hostsError ? (
        <div className="mb-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-900 rounded-md">
          <p className="text-xs text-red-600 dark:text-red-400">
            {t('hostsError')}: {hostsError}
          </p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">{t('tryRefreshing')}</p>
        </div>
      ) : (
        <HostSelector
          availableHosts={availableHosts}
          selectedHosts={hostIds}
          onHostToggle={onHostToggle}
        />
      )}
    </div>
  );
};

export default DeploymentWizardStep3;
