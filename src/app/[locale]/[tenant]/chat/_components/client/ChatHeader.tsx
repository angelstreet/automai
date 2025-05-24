'use client';

import { useChatContext } from './ChatContext';
import ModelSelector from './ModelSelector';

/**
 * Chat header component - optimized layout with model selection and API token input
 */
export default function ChatHeader() {
  const { openRouterApiKey, setOpenRouterApiKey } = useChatContext();

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenRouterApiKey(e.target.value || null);
  };

  return (
    <div className="px-4 py-3 border-b border-border bg-background/50">
      <div className="flex items-start justify-between gap-4">
        {/* Model Selection - Reduced width */}
        <div className="flex-1 max-w-sm">
          <ModelSelector />
        </div>

        {/* API Token Input - Reduced width */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label
              htmlFor="api-key"
              className="text-sm font-medium text-foreground whitespace-nowrap"
            >
              API Key:
            </label>
            <input
              id="api-key"
              type="password"
              placeholder="OpenRouter API key (optional)"
              value={openRouterApiKey === 'env_key_available' ? '' : openRouterApiKey || ''}
              onChange={handleApiKeyChange}
              className="px-3 py-1.5 w-40 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            />
            {openRouterApiKey === 'env_key_available' && (
              <span className="text-xs text-green-600 whitespace-nowrap">✓ ENV</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
