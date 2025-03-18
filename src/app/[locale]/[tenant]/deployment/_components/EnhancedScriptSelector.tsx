'use client';

import React, { useState } from 'react';
import { Code, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';
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
  onBatchScriptToggle?: (scriptIds: string[], isSelected: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
}

const EnhancedScriptSelector: React.FC<EnhancedScriptSelectorProps> = ({
  availableScripts,
  selectedScripts,
  scriptParameters,
  onScriptToggle,
  onParameterChange,
  isProjectSelected,
  onBatchScriptToggle,
  isLoading = false,
  error = null
}) => {
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());

  const toggleExpanded = (scriptId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    const newExpanded = new Set(expandedScripts);
    if (newExpanded.has(scriptId)) {
      newExpanded.delete(scriptId);
    } else {
      newExpanded.add(scriptId);
    }
    setExpandedScripts(newExpanded);
  };

  const handleSelectAll = () => {
    // Create a new array with all script IDs
    const allScriptIds = availableScripts.map(script => script.id);
    
    // Filter out scripts that are already selected to avoid unnecessary updates
    const scriptsToAdd = allScriptIds.filter(id => !selectedScripts.includes(id));
    
    // If there are scripts to add, create a batch update
    if (scriptsToAdd.length > 0) {
      // Call the parent component with a special batch update
      onBatchScriptToggle?.(scriptsToAdd, true);
    }
  };

  const handleUnselectAll = () => {
    // If there are selected scripts, create a batch update to remove them all
    if (selectedScripts.length > 0) {
      // Call the parent component with a special batch update
      onBatchScriptToggle?.(selectedScripts, false);
    }
  };

  if (!isProjectSelected) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Please select a project first to view available scripts.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Select All / Unselect All controls */}
      <div className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {selectedScripts.length} of {availableScripts.length} scripts selected
        </span>
        <div className="flex space-x-2">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelectAll();
            }}
            type="button"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            Select All
          </button>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUnselectAll();
            }}
            type="button"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            <Square className="h-3 w-3 mr-1" />
            Unselect All
          </button>
        </div>
      </div>
      
      {/* Scrollable container for scripts */}
      <div className="max-h-80 overflow-y-auto">
        {availableScripts.map((script) => (
          <div key={script.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <div 
              className="py-1 px-2 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              onClick={(e) => toggleExpanded(script.id, e)}
            >
              <div className="flex items-center space-x-2">
                <div 
                  onClick={(e) => toggleExpanded(script.id, e)}
                  className="cursor-pointer"
                >
                  {expandedScripts.has(script.id) ? (
                    <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <label 
                  className="flex items-center cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedScripts.includes(script.id)}
                    onChange={() => onScriptToggle(script.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600 h-3 w-3 flex-shrink-0"
                  />
                  <span className="ml-1 text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                    {script.path}
                  </span>
                </label>
              </div>
              <Code className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-1" />
            </div>
            
            {/* Parameters input section - always editable */}
            {expandedScripts.has(script.id) && (
              <div className="px-2 py-1 pl-7 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <div className="relative">
                  <Input 
                    id={`script-params-${script.id}`}
                    value={scriptParameters[script.id]?.rawParams ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onParameterChange(script.id, 'rawParams', e.target.value)}
                    placeholder="Enter parameters (e.g., --env=dev --skip-tests)"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs py-0.5 h-6"
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