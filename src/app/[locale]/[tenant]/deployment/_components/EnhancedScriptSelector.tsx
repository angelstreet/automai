'use client';

import React, { useState } from 'react';
import { Code, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { Script, ScriptParameter, Repository } from '../types';
import ScriptParameterForm from './ScriptParameterForm';
import { Input } from '@/components/shadcn/input';

interface EnhancedScriptSelectorProps {
  selectedRepository?: Repository;
  availableScripts: Script[];
  selectedScriptIds: string[];
  onScriptIdsChange: (scriptIds: string[]) => void;
  isLoading?: boolean;
  error?: string | null;
}

const EnhancedScriptSelector: React.FC<EnhancedScriptSelectorProps> = ({
  selectedRepository,
  availableScripts,
  selectedScriptIds,
  onScriptIdsChange,
  isLoading = false,
  error = null
}) => {
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

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
    
    // If all are already selected, deselect all
    if (allScriptIds.length === selectedScriptIds.length && 
        allScriptIds.every(id => selectedScriptIds.includes(id))) {
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
  const filteredScripts = availableScripts.filter(script => 
    script.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    script.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading scripts: {error}
      </div>
    );
  }

  if (!selectedRepository) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        Please select a repository first to view available scripts.
      </div>
    );
  }

  if (availableScripts.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        No scripts found in this repository. Make sure your repository has executable scripts.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Header with search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
            <Code className="h-4 w-4 mr-1" />
            Available Scripts
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({filteredScripts.length} {filteredScripts.length === 1 ? 'script' : 'scripts'})
            </span>
          </h3>
          <div className="flex items-center ml-auto">
            <Input
              type="text"
              placeholder="Search scripts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs h-8 w-full sm:w-56"
            />
            <button
              type="button"
              onClick={handleSelectAll}
              className="ml-2 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {selectedScriptIds.length === availableScripts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>

      {/* Script list */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {filteredScripts.map(script => {
          const isSelected = selectedScriptIds.includes(script.id);
          const isExpanded = expandedScripts.has(script.id);
          
          return (
            <div key={script.id} className="text-sm">
              <div 
                className={`px-3 py-2 flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                onClick={() => handleToggleScript(script.id)}
              >
                <div className="flex items-center">
                  {isSelected ? 
                    <CheckSquare className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" /> : 
                    <Square className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{script.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{script.path}</div>
                </div>
                {script.parameters && script.parameters.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => toggleExpanded(script.id, e)}
                    className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    {isExpanded ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </button>
                )}
              </div>
              
              {/* Parameter form if expanded */}
              {isExpanded && isSelected && script.parameters && script.parameters.length > 0 && (
                <div className="px-3 py-2 pl-9 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <ScriptParameterForm 
                    scriptId={script.id}
                    parameters={script.parameters}
                    values={{}}
                    onChange={() => {}}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnhancedScriptSelector;