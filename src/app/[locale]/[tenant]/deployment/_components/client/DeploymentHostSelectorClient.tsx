'use client';

import { Server } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Host } from '@/types/component/hostComponentType';

interface HostSelectorProps {
  availableHosts: Host[];
  selectedHosts: string[];
  onHostToggle: (hostId: string) => void;
}

/**
 * Component for selecting target hosts with environment tags
 */
const HostSelector: React.FC<HostSelectorProps> = ({
  availableHosts,
  selectedHosts,
  onHostToggle,
}) => {
  const t = useTranslations('deployment');
  const c = useTranslations('common');

  // Select all hosts
  const selectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hostsToSelect = availableHosts.filter((host) => !selectedHosts.includes(host.id));
    hostsToSelect.forEach((host) => onHostToggle(host.id));
  };

  // Unselect all hosts
  const unselectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hostsToUnselect = availableHosts.filter((host) => selectedHosts.includes(host.id));
    hostsToUnselect.forEach((host) => onHostToggle(host.id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Server size={16} className="mr-1" />
          <span className="text-xs text-gray-500 dark:text-gray-400 px-1 py-0.5 bg-gray-50 dark:bg-gray-700 rounded">
            {selectedHosts.length}/{availableHosts.length}{' '}
            {t('wizard_target_hosts', {
              fallback: 'hosts selected',
            })}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // If all hosts are selected, unselect all
              const allSelected = availableHosts.every((host) => selectedHosts.includes(host.id));
              if (allSelected) {
                unselectAll(e);
              } else {
                selectAll(e);
              }
            }}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
          >
            {availableHosts.every((host) => selectedHosts.includes(host.id))
              ? c('deselect_all', { fallback: 'Deselect All' })
              : c('select_all', { fallback: 'Select All' })}
          </button>
        </div>
      </div>

      {availableHosts.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('no_hosts_available', { fallback: 'No hosts available' })}
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {availableHosts.map((host) => (
              <div
                key={host.id}
                className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center flex-1">
                  <input
                    type="checkbox"
                    id={`host-${host.id}`}
                    checked={selectedHosts.includes(host.id)}
                    onChange={() => onHostToggle(host.id)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor={`host-${host.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {host.name}
                        </span>
                        <span
                          className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          title={`Environment: ${host.environment || 'Unknown'}`}
                        >
                          #{(host.environment || 'unknown').toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                          {host.ip || 'No IP'}
                        </span>
                        {host.status === ('online' as any) && (
                          <span className="w-2 h-2 rounded-full bg-green-500" title="Online"></span>
                        )}
                        {host.status === ('offline' as any) && (
                          <span className="w-2 h-2 rounded-full bg-red-500" title="Offline"></span>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostSelector;
