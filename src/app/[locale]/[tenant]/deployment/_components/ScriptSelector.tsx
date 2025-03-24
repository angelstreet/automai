'use client';

import React from 'react';
import { Code } from 'lucide-react';
import { Script } from '../types';

interface ScriptSelectorProps {
  availableScripts: Script[];
  selectedScripts: string[];
  onScriptToggle: (scriptId: string) => void;
  isProjectSelected: boolean;
}

/**
 * Component for selecting scripts from a repository
 */
const ScriptSelector: React.FC<ScriptSelectorProps> = ({
  availableScripts,
  selectedScripts,
  onScriptToggle,
  isProjectSelected,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 flex items-center text-gray-700 dark:text-gray-300">
        <Code size={16} className="mr-1" />
        Scripts to Deploy
      </label>

      {!isProjectSelected ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
          Select a project to see available scripts
        </div>
      ) : availableScripts.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
          No scripts available for this project
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {availableScripts.map((script) => (
              <div
                key={script.id}
                className="flex items-center px-3 py-2 border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
              >
                <input
                  type="checkbox"
                  id={`script-${script.id}`}
                  checked={selectedScripts.includes(script.id)}
                  onChange={() => onScriptToggle(script.id)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor={`script-${script.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {script.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {script.path}
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptSelector;
