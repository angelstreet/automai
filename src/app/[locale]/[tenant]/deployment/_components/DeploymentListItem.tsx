'use client';

import React from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { Deployment } from './types';
import { formatDate, calculateDuration } from './utils';

interface DeploymentListItemProps {
  deployment: Deployment;
  onClick: (deployment: Deployment) => void;
}

const DeploymentListItem = ({ deployment, onClick }: DeploymentListItemProps) => {
  return (
    <div
      className="border border-gray-200 dark:border-gray-700 rounded-md p-4 mb-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer bg-white dark:bg-gray-800"
      onClick={() => onClick(deployment)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="font-medium text-md text-gray-900 dark:text-white">{deployment.name}</h3>
            <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {deployment.projectName}
            </span>
          </div>

          <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Clock size={14} className="mr-1" />
            <span className="mr-4">
              {formatDate(deployment.startTime || deployment.scheduledTime)}
            </span>
            {deployment.startTime && deployment.endTime && (
              <span className="flex items-center">
                <span className="mr-1">Duration:</span>
                {calculateDuration(deployment.startTime, deployment.endTime)}
              </span>
            )}
          </div>

          <div className="mt-2 text-sm">
            <div className="flex gap-2 flex-wrap">
              <StatusBadge status={deployment.status} />
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">
                {deployment.scripts.length} script{deployment.scripts.length !== 1 ? 's' : ''}
              </span>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">
                {deployment.hosts.length} host{deployment.hosts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
            {deployment.createdBy}
          </span>
          <ChevronRight size={20} className="text-gray-400 dark:text-gray-500" />
        </div>
      </div>
    </div>
  );
};

export default DeploymentListItem;
