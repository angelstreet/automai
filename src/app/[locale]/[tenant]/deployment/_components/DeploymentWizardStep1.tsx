'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Repository } from '../types';

interface DeploymentWizardStep1Props {
  name: string;
  description: string;
  repositoryId: string;
  repositories: Repository[];
  repositoryError: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onNextStep: () => void;
  isStepValid: () => boolean;
  onRefreshRepositories?: () => void;
}

const DeploymentWizardStep1: React.FC<DeploymentWizardStep1Props> = ({
  name,
  description,
  repositoryId,
  repositories,
  onInputChange,
  onNextStep,
  isStepValid,
}) => {
  const t = useTranslations('deployment.wizard');
  
  useEffect(() => {
    console.log('DeploymentWizardStep1 received repositories:', repositories);
  }, [repositories]);

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
          {t('next')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="mb-1">
          <label htmlFor="name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('nameLabel')} *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={onInputChange}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('namePlaceholder')}
            required
          />
        </div>
        
        <div className="mb-1">
          <label htmlFor="description" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('descriptionLabel')}
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={onInputChange}
            rows={2}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('descriptionPlaceholder')}
          />
        </div>
        
        <div className="mb-1">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="repositoryId" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {t('repositoryLabel')} *
            </label>
          </div>
          <select
            id="repositoryId"
            name="repositoryId"
            value={repositoryId}
            onChange={onInputChange}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          >
            <option value="">{t('selectRepository')}</option>
            {repositories.map((repo: Repository) => (
                <option key={repo.id} value={repo.id}>{repo.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DeploymentWizardStep1;
