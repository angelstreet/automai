'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { sendMessage } from '@/app/actions/chatAction';
import { CHAT_SETTINGS, ERROR_MESSAGES, hasPaidModels } from '../../constants';
import { useChatContext } from './ChatContext';
import { TokenTracker } from './TokenTracker';

/**
 * Message input component - elegant text input with send button
 * Uses toast notifications for errors, fixed height design
 */
export default function MessageInput() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {
    selectedModels,
    activeConversationId,
    setActiveConversationId,
    hasEnvApiKey,
    openRouterApiKey,
  } = useChatContext();

  // Check if user has provided API key (not just env placeholder)
  const hasUserApiKey = openRouterApiKey && openRouterApiKey !== 'env_key_available';

  // API key is valid if user provided one OR env key is available
  const isApiKeyValid = hasUserApiKey || hasEnvApiKey;

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    if (selectedModels.length === 0) {
      toast.error('Please select at least one AI model');
      return;
    }

    if (message.length > CHAT_SETTINGS.MAX_MESSAGE_LENGTH) {
      toast.error(`Message too long. Maximum ${CHAT_SETTINGS.MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    // Only show API key error if trying to use paid models without API key
    if (!isApiKeyValid && hasPaidModels(selectedModels)) {
      toast.error('API key required for paid models', {
        description: 'Please add your API key or select free models only.',
        action: {
          label: 'Add API Key',
          onClick: () => {
            const key = prompt('Enter your OpenRouter API key:');
            if (key?.trim()) {
              console.log('API key entered by user');
              // In a real app, you'd want a proper API key input component
            }
          },
        },
      });
      return;
    }

    setIsLoading(true);
    const messageContent = message.trim();
    setMessage(''); // Clear input immediately for better UX

    try {
      console.log('[@component:MessageInput:handleSend] Sending message', {
        conversationId: activeConversationId,
        modelCount: selectedModels.length,
        messageLength: messageContent.length,
        usingEnvKey: hasEnvApiKey,
        hasPaidModels: hasPaidModels(selectedModels),
      });

      const result = await sendMessage({
        conversationId: activeConversationId || undefined,
        content: messageContent,
        modelIds: selectedModels,
        conversationTitle: activeConversationId
          ? undefined
          : `Chat ${new Date().toLocaleDateString()}`,
      });

      if (result.success && result.data) {
        console.log('[@component:MessageInput:handleSend] Message sent successfully');

        // Update conversation ID if this was a new conversation
        const newConversationId = result.data.conversationId;

        // Set conversation ID immediately, even for temp IDs, so components know which conversation this is
        if (!activeConversationId) {
          setActiveConversationId(newConversationId);
          console.log(
            `[@component:MessageInput:handleSend] Set active conversation: ${newConversationId}`,
          );
        }

        // Dispatch custom event to notify other components with immediate responses
        window.dispatchEvent(
          new CustomEvent('CHAT_MESSAGE_SENT', {
            detail: {
              conversationId: newConversationId,
              userMessage: {
                role: 'user',
                content: messageContent,
                timestamp: new Date().toISOString(),
              },
              aiMessages: result.data.aiMessages.map((msg) => ({
                ...msg,
                role: 'assistant',
                timestamp: new Date().toISOString(),
              })),
            },
          }),
        );

        // Show success toast with model count
        toast.success(`Message sent to ${result.data.aiMessages.length} model(s)`);
      } else {
        console.error('[@component:MessageInput:handleSend] Failed to send message:', result.error);
        const errorMessage = result.error || ERROR_MESSAGES.MESSAGE_SEND_FAILED;

        // Show specific error for API key issues
        if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
          toast.error('Invalid API key', {
            description: 'Please check your OpenRouter API key configuration.',
          });
        } else {
          toast.error('Failed to send message', {
            description: errorMessage,
          });
        }

        setMessage(messageContent); // Restore message on error
      }
    } catch (error: any) {
      console.error('[@component:MessageInput:handleSend] Error sending message:', error);
      toast.error('Unexpected error', {
        description: error.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
      });
      setMessage(messageContent); // Restore message on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = isLoading || selectedModels.length === 0;

  const getPlaceholder = () => {
    if (selectedModels.length === 0) {
      return 'Select AI models to start chatting...';
    }
    if (isLoading) {
      return 'Sending message...';
    }
    return 'Start a message...';
  };

  return (
    <div className="w-full">
      {/* Token Usage Display */}
      <TokenTracker />

      <div className="flex items-end space-x-3 px-4 py-3">
        {/* Text Input Container */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholder()}
            disabled={isDisabled}
            className="w-full px-4 py-3 bg-background border border-border rounded-2xl resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-sm leading-relaxed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{
              maxHeight: '120px',
              minHeight: '44px',
              resize: 'none',
              overflow: 'auto',
            }}
          />

          {/* Character count indicator */}
          {message.length > 100 && (
            <div
              className={`absolute bottom-1 right-3 text-xs ${
                message.length > CHAT_SETTINGS.MAX_MESSAGE_LENGTH
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {message.length}/{CHAT_SETTINGS.MAX_MESSAGE_LENGTH}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isDisabled || !message.trim()}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 font-medium text-sm"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Sending...</span>
            </div>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
}
