'use client';

import { useState, useEffect, useCallback } from 'react';

import { getMessages } from '@/app/actions/chatAction';

import { useChatContext } from './ChatContext';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * TokenTracker component - displays cumulative token usage and API key input
 */
export function TokenTracker() {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  });
  const { activeConversationId, openRouterApiKey, setOpenRouterApiKey } = useChatContext();

  // Calculate token usage from messages
  const calculateTokenUsage = useCallback(async () => {
    if (!activeConversationId) {
      setTokenUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
      return;
    }

    try {
      const result = await getMessages(activeConversationId);
      if (result.success && result.data) {
        const usage = result.data.reduce(
          (acc, message) => {
            if (message.metadata?.usage) {
              acc.promptTokens += message.metadata.usage.prompt_tokens || 0;
              acc.completionTokens += message.metadata.usage.completion_tokens || 0;
              acc.totalTokens += message.metadata.usage.total_tokens || 0;
            } else if (message.token_count) {
              // Fallback to token_count field if metadata.usage is not available
              acc.totalTokens += message.token_count;
            }
            return acc;
          },
          { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        );

        setTokenUsage(usage);
      }
    } catch (error) {
      console.error('[@component:TokenTracker] Error calculating token usage:', error);
    }
  }, [activeConversationId]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenRouterApiKey(e.target.value || null);
  };

  useEffect(() => {
    calculateTokenUsage();

    // Listen for new messages to update token counts
    const handleNewMessage = () => {
      // Small delay to allow database save to complete
      setTimeout(calculateTokenUsage, 1000);
    };

    const handleConversationChange = () => {
      calculateTokenUsage();
    };

    window.addEventListener('CHAT_MESSAGE_SENT', handleNewMessage);
    window.addEventListener('CHAT_CONVERSATION_DELETED', handleConversationChange);
    window.addEventListener('CHAT_MESSAGE_DELETED', handleConversationChange);

    return () => {
      window.removeEventListener('CHAT_MESSAGE_SENT', handleNewMessage);
      window.removeEventListener('CHAT_CONVERSATION_DELETED', handleConversationChange);
      window.removeEventListener('CHAT_MESSAGE_DELETED', handleConversationChange);
    };
  }, [activeConversationId, calculateTokenUsage]);

  return (
    <div className="px-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {/* Token Usage */}
        <div>
          {activeConversationId && tokenUsage.totalTokens > 0 && (
            <>
              Prompt: {tokenUsage.promptTokens.toLocaleString()} • Response:{' '}
              {tokenUsage.completionTokens.toLocaleString()} • Total:{' '}
              {tokenUsage.totalTokens.toLocaleString()}
            </>
          )}
        </div>

        {/* Compact API Key Input */}
        <div className="flex items-center gap-2">
          <label htmlFor="api-key-compact" className="text-xs text-muted-foreground">
            API Key:
          </label>
          <input
            id="api-key-compact"
            type="password"
            placeholder="OpenRouter key"
            value={openRouterApiKey === 'env_key_available' ? '' : openRouterApiKey || ''}
            onChange={handleApiKeyChange}
            className="px-2 py-1 w-32 bg-background border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
          />
          {openRouterApiKey === 'env_key_available' && (
            <span className="text-xs text-green-600">✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
