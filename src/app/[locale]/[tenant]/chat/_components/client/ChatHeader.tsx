'use client';

import { AI_MODELS, MODEL_SELECTION } from '../../constants';

import { useChatContext } from './ChatContext';

/**
 * Chat header component - contains model selection and API token input
 */
export default function ChatHeader() {
  const { selectedModels, setSelectedModels } = useChatContext();

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const isSelected = selectedModels.includes(value);

    if (isSelected) {
      // Remove if already selected (but keep at least 1)
      if (selectedModels.length > MODEL_SELECTION.MIN_MODELS) {
        setSelectedModels(selectedModels.filter((id) => id !== value));
      }
    } else {
      // Add if not selected (up to max)
      if (selectedModels.length < MODEL_SELECTION.MAX_MODELS) {
        setSelectedModels([...selectedModels, value]);
      }
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 h-full">
      {/* Model Selection */}
      <div className="flex items-center space-x-3">
        {/* Selected Models Display */}
        <div className="flex flex-wrap gap-1">
          {selectedModels.map((modelId) => {
            const model = AI_MODELS.find((m) => m.id === modelId);
            return (
              <span
                key={modelId}
                className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full"
              >
                {model?.name}
              </span>
            );
          })}
        </div>

        {/* Dropdown for adding/removing models */}
        <select
          onChange={handleModelChange}
          value=""
          className="px-2 py-1.5 w-32 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        >
          <option value="">Select...</option>
          {AI_MODELS.map((model) => {
            const isSelected = selectedModels.includes(model.id);
            const canAdd = selectedModels.length < MODEL_SELECTION.MAX_MODELS;
            const canRemove = selectedModels.length > MODEL_SELECTION.MIN_MODELS;
            const isDisabled = isSelected ? !canRemove : !canAdd;

            return (
              <option key={model.id} value={model.id} disabled={isDisabled}>
                {isSelected ? '✓ ' : '+ '}
                {model.name}
              </option>
            );
          })}
        </select>
      </div>

      {/* API Token Input */}
      <div className="flex items-center space-x-2">
        <label htmlFor="api-token" className="text-sm font-medium text-foreground"></label>
        <input
          id="api-token"
          type="password"
          placeholder="OpenRouter API token..."
          className="px-3 py-1.5 w-48 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        />
      </div>
    </div>
  );
}
