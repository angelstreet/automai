'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Repository } from '@/types/component/repositoryComponentType';
import { Script } from '@/types/component/scriptComponentType';

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
  const t = useTranslations('deployment');

  // Check if step is valid - handle both function and boolean values
  const isValid = typeof isStepValid === 'function' ? isStepValid() : isStepValid;

  // Loading indicator component
  const LoadingIndicator = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading script files from repository...
      </p>
    </div>
  );

  // Error indicator component with retry option
  const ErrorIndicator = () => (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Repository Error</h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <p>{scriptsError || 'Failed to load scripts from repository'}</p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={onPrevStep}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-700 shadow-sm text-xs font-medium rounded text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none"
            >
              Select Different Repository
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Empty scripts indicator
  const EmptyScriptsIndicator = () => (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            No Scripts Found
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>No Python (.py) or Shell (.sh) scripts found in this repository.</p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={onPrevStep}
              className="inline-flex items-center px-3 py-1.5 border border-yellow-300 dark:border-yellow-700 shadow-sm text-xs font-medium rounded text-yellow-700 dark:text-yellow-300 bg-white dark:bg-gray-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 focus:outline-none"
            >
              Select Different Repository
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-black/5 dark:bg-black/20 rounded-md border border-gray-200 dark:border-gray-800">
      <h2 className="text-lg font-medium mb-4">Select Scripts</h2>

      {/* Show different states based on loading/error/empty */}
      {isLoadingScripts ? (
        <LoadingIndicator />
      ) : scriptsError ? (
        <ErrorIndicator />
      ) : repositoryScripts.length === 0 ? (
        <EmptyScriptsIndicator />
      ) : (
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
      )}

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
