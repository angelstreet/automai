'use client';

import { useState, useEffect } from 'react';

import { getMessages } from '@/app/actions/chatAction';
import type { ChatMessage } from '@/lib/db/chatDb';
import { useChatContext } from './ChatContext';

/**
 * Chat content component - displays conversation messages from database
 */
export default function ChatContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeConversationId } = useChatContext();

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setError(null);
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log(
          `[@component:ChatContent] Fetching messages for conversation: ${activeConversationId}`,
        );
        setIsLoading(true);
        setError(null);

        const result = await getMessages(activeConversationId);

        if (result.success && result.data) {
          console.log(`[@component:ChatContent] Loaded ${result.data.length} messages`);
          setMessages(result.data);
        } else {
          console.error('[@component:ChatContent] Failed to fetch messages:', result.error);
          setError(result.error || 'Failed to load messages');
        }
      } catch (error: any) {
        console.error('[@component:ChatContent] Error:', error);
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Listen for new messages to refresh
    const handleNewMessage = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      if (conversationId === activeConversationId) {
        console.log('[@component:ChatContent] Refreshing messages after new message');
        fetchMessages();
      }
    };

    window.addEventListener('CHAT_MESSAGE_SENT', handleNewMessage as EventListener);

    return () => {
      window.removeEventListener('CHAT_MESSAGE_SENT', handleNewMessage as EventListener);
    };
  }, [activeConversationId]);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;

    return date.toLocaleString();
  };

  const getProviderLogo = (provider: string | null) => {
    switch (provider?.toLowerCase()) {
      case 'anthropic':
        return '🤖';
      case 'openai':
        return '🔥';
      case 'google':
        return '🔍';
      case 'meta':
        return '🦙';
      default:
        return '🤖';
    }
  };

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-semibold mb-2">Start a new conversation</h3>
          <p className="text-sm">Select a model and send a message to begin chatting</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-destructive text-sm mb-2">Failed to load conversation</div>
          <div className="text-xs text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p>No messages in this conversation yet.</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {/* Message header for assistant messages */}
              {message.role === 'assistant' && (
                <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <span>{getProviderLogo(message.provider)}</span>
                    <span className="font-medium">
                      {message.model_name || message.model_id || 'AI Assistant'}
                    </span>
                  </div>
                  {message.token_count && <span>{message.token_count} tokens</span>}
                </div>
              )}

              {/* Message content */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>

              {/* Error message if present */}
              {message.error_message && (
                <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded p-2">
                  Error: {message.error_message}
                </div>
              )}

              {/* Message footer */}
              <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                <span>{formatTimestamp(message.created_at)}</span>
                {message.response_time_ms && <span>{message.response_time_ms}ms</span>}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
