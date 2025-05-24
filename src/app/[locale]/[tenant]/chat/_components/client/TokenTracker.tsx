'use client';

import { useState, useEffect } from 'react';
import { useChatContext } from './ChatContext';
import { getMessages } from '@/app/actions/chatAction';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * TokenTracker component - displays cumulative token usage for the active conversation
 */
export function TokenTracker() {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  });
  const { activeConversationId } = useChatContext();

  // Calculate token usage from messages
  const calculateTokenUsage = async () => {
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
  }, [activeConversationId]);

  // Don't show if no active conversation or no tokens used
  if (!activeConversationId || tokenUsage.totalTokens === 0) {
    return null;
  }

  return (
    <div className="px-4 pb-2">
      <div className="text-xs text-center text-muted-foreground">
        Prompt: {tokenUsage.promptTokens.toLocaleString()} • Response:{' '}
        {tokenUsage.completionTokens.toLocaleString()} • Total:{' '}
        {tokenUsage.totalTokens.toLocaleString()}
      </div>
    </div>
  );
}
