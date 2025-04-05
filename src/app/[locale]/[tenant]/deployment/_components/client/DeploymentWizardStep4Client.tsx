'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

interface DeploymentWizardStep4Props {
  schedule: string;
  scheduledTime: string;
  cronExpression: string;
  repeatCount: number;
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
  onInputChange,
  onPrevStep,
  onNextStep,
  isStepValid,
}) => {
  const t = useTranslations('deployment.wizard');

  // Check if step is valid - handle both function and boolean values
  const isValid = typeof isStepValid === 'function' ? isStepValid() : isStepValid;

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
          disabled={!isValid}
          className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
              : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
          }`}
        >
          {t('next')}
        </button>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('deploymentSchedule')}
        </label>
        <div className="flex items-center space-x-4 mb-2">
          <div className="flex items-center">
            <input
              type="radio"
              id="scheduleNow"
              name="schedule"
              value="now"
              checked={schedule === 'now'}
              onChange={onInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="scheduleNow" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('deployNow')}
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
            />
            <label
              htmlFor="scheduleLater"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              {t('scheduleLater')}
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
                {t('dateAndTime')}
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
    </div>
  );
};

export default DeploymentWizardStep4Client;
export { DeploymentWizardStep4Client };
