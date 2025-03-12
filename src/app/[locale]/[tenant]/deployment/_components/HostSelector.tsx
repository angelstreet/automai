'use client';

import React from 'react';
import { Server } from 'lucide-react';
import { Host } from '../types';
import { groupHostsByEnvironment } from '../utils';

interface HostSelectorProps {
  availableHosts: Host[];
  selectedHosts: string[];
  onHostToggle: (hostId: string) => void;
}

/**
 * Component for selecting target hosts grouped by environment
 */
const HostSelector: React.FC<HostSelectorProps> = ({ 
  availableHosts, 
  selectedHosts, 
  onHostToggle 
}) => {
  // Group hosts by environment
  const hostsByEnvironment = groupHostsByEnvironment(availableHosts);

  // Sort environments - put Production first, then Staging, then others alphabetically
  const sortedEnvironments = Object.keys(hostsByEnvironment).sort((a, b) => {
    if (a === 'Production') return -1;
    if (b === 'Production') return 1;
    if (a === 'Staging') return -1;
    if (b === 'Staging') return 1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <label className="block text-sm font-medium mb-2 flex items-center text-gray-700 dark:text-gray-300">
        <Server size={16} className="mr-1" />
        Target Hosts
      </label>

      {availableHosts.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
          No hosts available
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {sortedEnvironments.map((env) => (
              <div key={env}>
                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {env}
                </div>
                {hostsByEnvironment[env].map((host) => (
                  <div
                    key={host.id}
                    className="flex items-center px-3 py-2 border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      id={`host-${host.id}`}
                      checked={selectedHosts.includes(host.id)}
                      onChange={() => onHostToggle(host.id)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor={`host-${host.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {host.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {host.ip || 'Status: ' + host.status}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostSelector;