'use client';

import React, { useState } from 'react';
import { Code, ChevronDown, ChevronRight } from 'lucide-react';
import { Script, ScriptParameter } from '../types';
import ScriptParameterForm from './ScriptParameterForm';

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
  isProjectSelected,
}) => {
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());

  const toggleExpand = (scriptId: string) => {
    const newExpanded = new Set(expandedScripts);
    if (newExpanded.has(scriptId)) {
      newExpanded.delete(scriptId);
    } else {
      newExpanded.add(scriptId);
    }
    setExpandedScripts(newExpanded);
  };

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
              <div key={script.id}>
                <div
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
                  
                  {script.parameters && script.parameters.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleExpand(script.id);
                      }}
                      className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {expandedScripts.has(script.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                
                {/* Parameters section */}
                {(script.parameters && script.parameters.length > 0) && expandedScripts.has(script.id) && selectedScripts.includes(script.id) && (
                  <div className="px-3 py-2 pl-10 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Parameters
                    </div>
                    <div className="space-y-3">
                      {script.parameters.map((param) => (
                        <ScriptParameterForm
                          key={param.id}
                          parameter={param}
                          value={scriptParameters[script.id]?.[param.id] ?? param.default}
                          onChange={(value) => onParameterChange(script.id, param.id, value)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedScriptSelector;