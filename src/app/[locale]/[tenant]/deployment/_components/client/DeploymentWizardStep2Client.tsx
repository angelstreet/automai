'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Repository } from '@/types/component/repositoryComponentType';
import { Script } from '@/types/context/deploymentContextType';

import DeploymentScriptSelectorClient from './DeploymentScriptSelectorClient';

interface DeploymentWizardStep2Props {
  selectedRepository: Repository | null;
  scriptIds: string[];
  repositoryScripts: Script[];
  isLoadingScripts: boolean;
  scriptsError: string | null;
  scriptParameters: Record<string, Record<string, string>>;
  onScriptsChange: (scriptIds: string[]) => void;
  onScriptParameterChange: (scriptId: string, paramId: string, value: string) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  isStepValid: boolean | (() => boolean);
}

const DeploymentWizardStep2Client: React.FC<DeploymentWizardStep2Props> = ({
  selectedRepository,
  scriptIds,
  repositoryScripts,
  isLoadingScripts,
  scriptsError,
  scriptParameters,
  onScriptsChange,
  onScriptParameterChange,
  onPrevStep,
  onNextStep,
  isStepValid,
}) => {
  const t = useTranslations('deployment.wizard');

  // Check if step is valid - handle both function and boolean values
  const isValid = typeof isStepValid === 'function' ? isStepValid() : isStepValid;

  return (
    <div className="p-4 bg-black/5 dark:bg-black/20 rounded-md border border-gray-200 dark:border-gray-800">
      <h2 className="text-lg font-medium mb-4">Select Scripts</h2>
      
      {/* Display error if any */}
      {scriptsError && (
        <div className="mb-4 p-2 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">
            Error loading scripts: {scriptsError}
          </p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">Please try again or select a different repository.</p>
        </div>
      )}

      <DeploymentScriptSelectorClient
        selectedRepository={selectedRepository || undefined}
        availableScripts={repositoryScripts}
        selectedScriptIds={scriptIds}
        scriptParameters={scriptParameters}
        onScriptIdsChange={onScriptsChange}
        onScriptParameterChange={onScriptParameterChange}
        isLoading={isLoadingScripts}
        error={scriptsError}
      />
      
      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onPrevStep}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={onNextStep}
          disabled={!isValid}
          className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
              : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default DeploymentWizardStep2Client;
export { DeploymentWizardStep2Client };
