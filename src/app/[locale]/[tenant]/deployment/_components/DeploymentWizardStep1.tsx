'use client';

import React from 'react';
import { Repository } from '../types';

interface DeploymentWizardStep1Props {
  name: string;
  description: string;
  repositoryId: string;
  repositories: Repository[];
  isLoadingRepositories: boolean;
  repositoryError: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onNextStep: () => void;
  isStepValid: () => boolean;
}

const DeploymentWizardStep1: React.FC<DeploymentWizardStep1Props> = ({
  name,
  description,
  repositoryId,
  repositories,
  isLoadingRepositories,
  repositoryError,
  onInputChange,
  onNextStep,
  isStepValid
}) => {
  return (
    <div>
      <div className="flex justify-end mb-1">
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
          Next
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="mb-1">
          <label htmlFor="name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deployment Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={onInputChange}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter a name for this deployment"
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
            value={description}
            onChange={onInputChange}
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
            value={repositoryId}
            onChange={onInputChange}
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
    </div>
  );
};

export default DeploymentWizardStep1;
