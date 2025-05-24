'use client';

import { useState, useRef, useEffect } from 'react';

import {
  ALL_OPENROUTER_MODELS,
  POPULAR_OPENROUTER_MODELS,
  MODEL_SELECTION,
  type OpenRouterModel,
} from '../../constants';

import { useChatContext } from './ChatContext';

interface ModelSelectorProps {
  className?: string;
}

/**
 * Custom model selector dropdown with search functionality
 * Shows free models first, then popular paid models
 * Includes search filtering and clear free/paid indicators
 */
export default function ModelSelector({ className = '' }: ModelSelectorProps) {
  const { selectedModels, setSelectedModels } = useChatContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter models based on search query
  const filteredModels = ALL_OPENROUTER_MODELS.filter((model) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      model.name.toLowerCase().includes(query) ||
      model.provider.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query) ||
      model.description.toLowerCase().includes(query)
    );
  });

  // Group models: free first, then popular paid, then others
  const groupedModels = {
    free: filteredModels.filter((model) => model.isFree),
    popular: filteredModels.filter(
      (model) => !model.isFree && POPULAR_OPENROUTER_MODELS.some((p) => p.id === model.id),
    ),
    other: filteredModels.filter(
      (model) => !model.isFree && !POPULAR_OPENROUTER_MODELS.some((p) => p.id === model.id),
    ),
  };

  const handleModelToggle = (modelId: string) => {
    const isSelected = selectedModels.includes(modelId);

    if (isSelected) {
      // Remove if already selected (but keep at least 1)
      if (selectedModels.length > MODEL_SELECTION.MIN_MODELS) {
        setSelectedModels(selectedModels.filter((id) => id !== modelId));
      }
    } else {
      // Add if not selected (up to max)
      if (selectedModels.length < MODEL_SELECTION.MAX_MODELS) {
        setSelectedModels([...selectedModels, modelId]);
      }
    }
  };

  const getSelectedModel = (modelId: string): OpenRouterModel | undefined => {
    return ALL_OPENROUTER_MODELS.find((m) => m.id === modelId);
  };

  const getDisplayName = (model: OpenRouterModel): string => {
    // Shorten overly long names
    let name = model.name;
    if (name.length > 35) {
      name = name.substring(0, 32) + '...';
    }
    return name;
  };

  const ModelItem = ({ model, isSelected }: { model: OpenRouterModel; isSelected: boolean }) => {
    const canAdd = selectedModels.length < MODEL_SELECTION.MAX_MODELS;
    const canRemove = selectedModels.length > MODEL_SELECTION.MIN_MODELS;
    const isDisabled = isSelected ? !canRemove : !canAdd;

    return (
      <button
        key={model.id}
        onClick={() => !isDisabled && handleModelToggle(model.id)}
        disabled={isDisabled}
        className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 border-l-2 transition-colors ${
          isSelected
            ? 'bg-primary/10 border-l-primary text-primary'
            : 'border-l-transparent hover:border-l-border'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{getDisplayName(model)}</span>
              {model.isFree && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded-full flex-shrink-0">
                  FREE
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {model.provider} • {model.contextLength.toLocaleString()} tokens
            </div>
          </div>
          <div className="flex-shrink-0">
            {isSelected ? (
              <span className="text-primary text-xs">✓</span>
            ) : (
              <span className="text-muted-foreground text-xs">+</span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const GroupHeader = ({ title, count }: { title: string; count: number }) => (
    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/30 border-b">
      {title} ({count})
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Button and Selected Models on Same Line */}
      <div className="flex items-center gap-2 mb-2">
        {/* Dropdown Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-[140px] px-3 py-2 text-sm bg-background border border-border rounded-md text-left flex items-center justify-between hover:bg-secondary/50 transition-colors flex-shrink-0"
        >
          <span className="text-muted-foreground">
            {selectedModels.length < MODEL_SELECTION.MAX_MODELS
              ? 'Add model...'
              : `Max ${MODEL_SELECTION.MAX_MODELS} models selected`}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Selected Models Display */}
        <div className="flex gap-1 flex-1 min-w-0 overflow-x-auto">
          {selectedModels.map((modelId) => {
            const model = getSelectedModel(modelId);
            return (
              <span
                key={modelId}
                className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full flex items-center gap-1 flex-shrink-0"
              >
                {model ? getDisplayName(model) : modelId}
                {model?.isFree && <span className="text-[10px]">🆓</span>}
              </span>
            );
          })}
        </div>
      </div>
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-border">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Models List */}
          <div className="overflow-y-auto max-h-64">
            {filteredModels.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No models found
              </div>
            ) : (
              <>
                {/* Free Models */}
                {groupedModels.free.length > 0 && (
                  <>
                    <GroupHeader title="Free Models" count={groupedModels.free.length} />
                    {groupedModels.free.map((model) => (
                      <ModelItem
                        key={model.id}
                        model={model}
                        isSelected={selectedModels.includes(model.id)}
                      />
                    ))}
                  </>
                )}

                {/* Popular Paid Models */}
                {groupedModels.popular.length > 0 && (
                  <>
                    <GroupHeader title="Popular Models" count={groupedModels.popular.length} />
                    {groupedModels.popular.map((model) => (
                      <ModelItem
                        key={model.id}
                        model={model}
                        isSelected={selectedModels.includes(model.id)}
                      />
                    ))}
                  </>
                )}

                {/* Other Models */}
                {groupedModels.other.length > 0 && (
                  <>
                    <GroupHeader title="Other Models" count={groupedModels.other.length} />
                    {groupedModels.other.map((model) => (
                      <ModelItem
                        key={model.id}
                        model={model}
                        isSelected={selectedModels.includes(model.id)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
