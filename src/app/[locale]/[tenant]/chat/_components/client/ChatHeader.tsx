'use client';

import { useChatContext } from './ChatContext';
import ModelSelector from './ModelSelector';

/**
 * Chat header component - contains model selection and API token input
 */
export default function ChatHeader() {
  const { openRouterApiKey, setOpenRouterApiKey } = useChatContext();

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenRouterApiKey(e.target.value || null);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 h-full border-b border-border bg-background/50">
      {/* Model Selection */}
      <div className="flex-1 max-w-md">
        <ModelSelector />
      </div>

      {/* API Token Input */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <label htmlFor="api-key" className="text-sm font-medium text-foreground">
            API Key:
          </label>
          <input
            id="api-key"
            type="password"
            placeholder="OpenRouter API key (optional)"
            value={openRouterApiKey === 'env_key_available' ? '' : openRouterApiKey || ''}
            onChange={handleApiKeyChange}
            className="px-3 py-1.5 w-48 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          />
          {openRouterApiKey === 'env_key_available' && (
            <span className="text-xs text-green-600">✓ ENV</span>
          )}
        </div>
      </div>
    </div>
  );
}
