'use client';

import React, { useState } from 'react';
import { Code, ChevronDown, ChevronRight } from 'lucide-react';
import { Script, ScriptParameter } from '../types';
import ScriptParameterForm from './ScriptParameterForm';
import { Input } from '@/components/shadcn/input';

interface EnhancedScriptSelectorProps {
  availableScripts: Script[];
  selectedScripts: string[];
  scriptParameters: Record<string, Record<string, any>>;
  onScriptToggle: (scriptId: string) => void;
  onParameterChange: (scriptId: string, paramId: string, value: any) => void;
  isProjectSelected: boolean;
}

const EnhancedScriptSelector: React.FC<EnhancedScriptSelectorProps> = ({
  availableScripts,
  selectedScripts,
  scriptParameters,
  onScriptToggle,
  onParameterChange,
  isProjectSelected
}) => {
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());

  const toggleExpanded = (scriptId: string) => {
    const newExpanded = new Set(expandedScripts);
    if (newExpanded.has(scriptId)) {
      newExpanded.delete(scriptId);
    } else {
      newExpanded.add(scriptId);
    }
    setExpandedScripts(newExpanded);
  };

  if (!isProjectSelected) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Please select a project first to view available scripts.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-t-lg border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Available Scripts
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select the scripts you want to run during deployment
        </p>
      </div>
      
      {/* Scrollable container for scripts */}
      <div className="max-h-80 overflow-y-auto">
        {availableScripts.map((script) => (
          <div key={script.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <div 
              className="p-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => toggleExpanded(script.id)}
            >
              <div className="flex items-center space-x-3">
                {expandedScripts.has(script.id) ? (
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScripts.includes(script.id)}
                    onChange={() => onScriptToggle(script.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {script.path}
                  </span>
                </label>
              </div>
              <Code className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </div>
            
            {/* Single Parameters input section */}
            {expandedScripts.has(script.id) && selectedScripts.includes(script.id) && (
              <div className="px-3 py-2 pl-10 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Parameters
                </div>
                <div>
                  <Input 
                    id={`script-params-${script.id}`}
                    value={scriptParameters[script.id]?.rawParams ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onParameterChange(script.id, 'rawParams', e.target.value)}
                    placeholder="Enter script parameters (e.g., --env=dev --skip-tests)"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Display when no scripts are available */}
      {availableScripts.length === 0 && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          No scripts are available for the selected project.
        </div>
      )}
    </div>
  );
};

export default EnhancedScriptSelector;