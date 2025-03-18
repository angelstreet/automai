'use client';

import React, { useState } from 'react';
import { Server, Check, Filter } from 'lucide-react';
import { Host } from '../types';

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
  onHostToggle 
}) => {
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Get unique environments
  const environments = [...new Set(availableHosts.map(host => host.environment))];
  
  // Toggle environment selection
  const toggleEnvironment = (environment: string, e: React.MouseEvent) => {
    // Simple click handler without preventDefault to avoid issues
    setSelectedEnvironments(prev => {
      if (prev.includes(environment)) {
        return prev.filter(env => env !== environment);
      } else {
        return [...prev, environment];
      }
    });
  };
  
  // Toggle filter visibility
  const toggleFilters = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFilters(!showFilters);
  };
  
  // Filter hosts by selected environments
  const filteredHosts = selectedEnvironments.length > 0
    ? availableHosts.filter(host => selectedEnvironments.includes(host.environment))
    : availableHosts;
  
  // Select all hosts
  const selectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hostsToSelect = filteredHosts.filter(host => !selectedHosts.includes(host.id));
    hostsToSelect.forEach(host => onHostToggle(host.id));
  };
  
  // Unselect all hosts
  const unselectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hostsToUnselect = filteredHosts.filter(host => selectedHosts.includes(host.id));
    hostsToUnselect.forEach(host => onHostToggle(host.id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Server size={16} className="mr-1" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedHosts.length} of {availableHosts.length} hosts selected
          </span>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={(e) => toggleFilters(e)}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <Filter size={14} className="inline mr-1" />
            Filter
          </button>
          <button
            type="button"
            onClick={(e) => selectAll(e)}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={(e) => unselectAll(e)}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            Unselect All
          </button>
        </div>
      </div>
      
      {showFilters && (
        <div className="mb-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
          <div className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
            Filter by environment:
          </div>
          <div className="flex flex-wrap gap-1">
            {environments.map(env => (
              <button
                key={env}
                onClick={() => toggleEnvironment(env, {} as React.MouseEvent)}
                type="button" // Explicitly set button type to prevent form submission
                className={`px-2 py-0.5 text-xs rounded-full ${
                  selectedEnvironments.includes(env)
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {selectedEnvironments.includes(env) && <Check size={10} className="inline mr-1" />}
                #{env.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {availableHosts.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
          No hosts available
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {filteredHosts.map((host) => (
              <div key={host.id} className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center flex-1">
                  <input
                    type="checkbox"
                    id={`host-${host.id}`}
                    checked={selectedHosts.includes(host.id)}
                    onChange={() => onHostToggle(host.id)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label 
                    htmlFor={`host-${host.id}`} 
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {host.name}
                        </span>
                        <span 
                          className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          title={`Environment: ${host.environment}`}
                        >
                          #{host.environment.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                          {host.ip || 'No IP'}
                        </span>
                        {host.status === 'online' && (
                          <span className="w-2 h-2 rounded-full bg-green-500" title="Online"></span>
                        )}
                        {host.status === 'offline' && (
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