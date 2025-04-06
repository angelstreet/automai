'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

interface DeploymentWizardStep4Props {
  schedule: string;
  scheduledTime: string;
  cronExpression: string;
  repeatCount: number;
  cicd_provider_id: string;
  cicdProviders: Array<{ id: string; name: string; type: string }>;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  isStepValid: boolean | (() => boolean);
}

const DeploymentWizardStep4Client: React.FC<DeploymentWizardStep4Props> = ({
  schedule,
  scheduledTime,
  cronExpression,
  repeatCount,
  cicd_provider_id,
  cicdProviders = [],
  onInputChange,
  onPrevStep,
  onNextStep,
  isStepValid,
}) => {
  const t = useTranslations('deployment');
  const c = useTranslations('common');
  // Check if step is valid - handle both function and boolean values
  const isValid = typeof isStepValid === 'function' ? isStepValid() : isStepValid;

  return (
    <div className="p-4 bg-transparent dark:bg-transparent rounded-md border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex justify-between mb-4">
        <button
          type="button"
          onClick={onPrevStep}
          className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium bg-background dark:bg-gray-800 text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          {c('prev')}
        </button>

        <button
          type="button"
          onClick={onNextStep}
          disabled={!isValid}
          className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-gray-400 ${
            isValid
              ? 'bg-background dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-70'
          }`}
        >
          {c('next')}
        </button>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('wizard_schedule_later')}
        </label>
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center">
            <input
              type="radio"
              id="scheduleNow"
              name="schedule"
              value="now"
              checked={schedule === 'now'}
              onChange={onInputChange}
              className="h-4 w-4 text-gray-600 dark:text-gray-400 focus:ring-gray-500 border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="scheduleNow" className="ml-2 text-sm text-foreground">
              {t('wizard_deploy_now')}
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="scheduleLater"
              name="schedule"
              value="later"
              checked={schedule === 'later'}
              onChange={onInputChange}
              className="h-4 w-4 text-gray-600 dark:text-gray-400 focus:ring-gray-500 border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="scheduleLater" className="ml-2 text-sm text-foreground">
              {t('wizard_schedule_later')}
            </label>
          </div>
        </div>

        {schedule === 'later' && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="scheduledTime"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('wizard_date_and_time')}
              </label>
              <input
                type="datetime-local"
                id="scheduledTime"
                name="scheduledTime"
                value={scheduledTime || ''}
                onChange={onInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required={schedule === 'later'}
              />
            </div>

            <div>
              <label
                htmlFor="cronExpression"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('cronExpression')}
              </label>
              <input
                type="text"
                id="cronExpression"
                name="cronExpression"
                value={cronExpression || ''}
                onChange={onInputChange}
                placeholder={t('cronPlaceholder')}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('cronFormat')}</p>
            </div>

            <div>
              <label
                htmlFor="repeatCount"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('repeatCount')}
              </label>
              <input
                type="number"
                id="repeatCount"
                name="repeatCount"
                min="0"
                value={repeatCount || 0}
                onChange={onInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('repeatCountHelp')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CI/CD Provider Selection */}
      <div className="mb-3 mt-6">
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('wizard_cicd_provider') || 'CI/CD Provider'}
        </label>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="cicd_provider_id"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('wizard_select_cicd_provider') || 'Select CI/CD Provider'}
            </label>
            <select
              id="cicd_provider_id"
              name="cicd_provider_id"
              value={cicd_provider_id || (cicdProviders.length > 0 ? cicdProviders[0].id : '')}
              onChange={onInputChange}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {cicdProviders.length === 0 ? (
                <option value="">{t('wizard_select_provider') || 'Select provider'}</option>
              ) : null}
              {cicdProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.type})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('wizard_cicd_provider_help') ||
                'Select a CI/CD provider for your deployment pipeline'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentWizardStep4Client;
export { DeploymentWizardStep4Client };
