'use client';

import { CheckSquare, Square } from 'lucide-react';
import React, { useState } from 'react';

import { Input } from '@/components/shadcn/input';
import { Repository } from '@/types/component/repositoryComponentType';
import { Script } from '@/types/component/scriptComponentType';

interface EnhancedScriptSelectorProps {
  selectedRepository?: Repository;
  availableScripts: Script[];
  selectedScriptIds: string[];
  scriptParameters: Record<string, Record<string, string>>;
  onScriptIdsChange: (scriptIds: string[]) => void;
  onScriptParameterChange: (scriptId: string, paramId: string, value: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

const DeploymentScriptSelectorClient: React.FC<EnhancedScriptSelectorProps> = ({
  selectedRepository,
  availableScripts,
  selectedScriptIds,
  scriptParameters,
  onScriptIdsChange,
  onScriptParameterChange,
  isLoading = false,
  error = null,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelectAll = () => {
    // Create a new array with all script IDs
    const allScriptIds = availableScripts.map((script) => script.id);

    // If all are already selected, deselect all
    if (
      allScriptIds.length === selectedScriptIds.length &&
      allScriptIds.every((id) => selectedScriptIds.includes(id))
    ) {
      onScriptIdsChange([]);
    } else {
      // Otherwise select all
      onScriptIdsChange(allScriptIds);
    }
  };

  const handleToggleScript = (scriptId: string) => {
    const newSelectedScripts = [...selectedScriptIds];

    if (newSelectedScripts.includes(scriptId)) {
      const index = newSelectedScripts.indexOf(scriptId);
      newSelectedScripts.splice(index, 1);
    } else {
      newSelectedScripts.push(scriptId);
    }

    onScriptIdsChange(newSelectedScripts);
  };

  // Filter scripts based on search term
  const filteredScripts = availableScripts.filter(
    (script) =>
      script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.path.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading scripts: {error}</div>;
  }

  if (availableScripts.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        No scripts found in this repository. Make sure your repository has executable scripts.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-background">
      <div className="mt-2 px-3 pb-3">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 px-1 py-0.5 bg-gray-50 dark:bg-gray-700 rounded">
            {selectedScriptIds.length}/{availableScripts.length} scripts selected
          </div>
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Search scripts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs h-7 w-48 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
            >
              {selectedScriptIds.length === availableScripts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            {filteredScripts.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {isLoading ? 'Loading scripts...' : 'No scripts found'}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed ">
                <thead className="bg-background sticky top-0">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"
                    >
                      Select
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2"
                    >
                      Script Path
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2"
                    >
                      Parameters
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredScripts.map((script) => {
                    const isSelected = selectedScriptIds.includes(script.id);

                    return (
                      <tr
                        key={script.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''} cursor-pointer`}
                        onClick={(e) => {
                          // Don't toggle if clicking on the input field in the parameters column
                          if (
                            e.target instanceof HTMLElement &&
                            (e.target.tagName === 'INPUT' ||
                              e.target.closest('input') ||
                              e.target.closest('.h-7 input'))
                          ) {
                            return;
                          }
                          handleToggleScript(script.id);
                        }}
                      >
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <div className="flex items-center">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <div className="text-xs text-gray-900 dark:text-white truncate max-w-[300px]">
                            {script.path}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <div className="h-7">
                            {isSelected ? (
                              <Input
                                placeholder="Parameters (e.g. -d --key=value)"
                                className="text-xs h-7 w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                value={scriptParameters[script.id]?.['raw'] || ''}
                                onChange={(e) =>
                                  onScriptParameterChange(script.id, 'raw', e.target.value)
                                }
                              />
                            ) : (
                              <div className="h-7"></div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentScriptSelectorClient;
