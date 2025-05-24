'use client';

import { useState } from 'react';

import { sendMessage } from '@/app/actions/chatAction';
import { useChatContext } from './ChatContext';
import { CHAT_SETTINGS, ERROR_MESSAGES } from '../../constants';

/**
 * Message input component - elegant text input with send button
 * Integrates with OpenRouter backend for real chat functionality
 */
export default function MessageInput() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedModels, activeConversationId, setActiveConversationId } = useChatContext();

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    if (selectedModels.length === 0) {
      setError('Please select at least one AI model');
      return;
    }

    if (message.length > CHAT_SETTINGS.MAX_MESSAGE_LENGTH) {
      setError(`Message too long. Maximum ${CHAT_SETTINGS.MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    const messageContent = message.trim();
    setMessage(''); // Clear input immediately for better UX

    try {
      console.log('[@component:MessageInput:handleSend] Sending message', {
        conversationId: activeConversationId,
        modelCount: selectedModels.length,
        messageLength: messageContent.length,
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
        if (!activeConversationId && result.data.conversation) {
          setActiveConversationId(result.data.conversation.id);
        }

        // Dispatch custom event to notify other components
        window.dispatchEvent(
          new CustomEvent('CHAT_MESSAGE_SENT', {
            detail: {
              conversationId: result.data.conversation.id,
              userMessage: result.data.userMessage,
              aiMessages: result.data.aiMessages,
            },
          }),
        );
      } else {
        console.error('[@component:MessageInput:handleSend] Failed to send message:', result.error);
        setError(result.error || ERROR_MESSAGES.MESSAGE_SEND_FAILED);
        setMessage(messageContent); // Restore message on error
      }
    } catch (error: any) {
      console.error('[@component:MessageInput:handleSend] Error sending message:', error);
      setError(error.message || ERROR_MESSAGES.UNEXPECTED_ERROR);
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
  const placeholder =
    selectedModels.length === 0
      ? 'Select AI models to start chatting...'
      : isLoading
        ? 'Sending message...'
        : 'Start a message...';

  return (
    <div className="flex flex-col px-4 py-3 h-full">
      {/* Error Message */}
      {error && (
        <div className="mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-destructive/60 hover:text-destructive"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex-1 flex items-end space-x-3 max-w-4xl mx-auto w-full">
        {/* Text Input Container */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
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
          className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 relative"
        >
          {isLoading ? (
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
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Model Selection Info */}
      {selectedModels.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Sending to {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''}
          {isLoading && ' • Processing...'}
        </div>
      )}
    </div>
  );
}
