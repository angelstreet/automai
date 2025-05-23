'use client';

import { useState } from 'react';
import { AI_MODELS } from '../../constants';

/**
 * Chat header component - contains model selection and API token input
 */
export default function ChatHeader() {
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);

  return (
    <div className="flex items-center justify-between px-4 py-2 h-full">
      {/* Model Selection */}
      <div className="flex items-center space-x-3">
        <label htmlFor="model-select" className="text-sm font-medium text-foreground">
          Model:
        </label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        >
          {AI_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
      </div>

      {/* API Token Input */}
      <div className="flex items-center space-x-2">
        <label htmlFor="api-token" className="text-sm font-medium text-foreground">
          API Token:
        </label>
        <input
          id="api-token"
          type="password"
          placeholder="Enter your API token..."
          className="px-3 py-1.5 w-48 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        />
      </div>
    </div>
  );
}
