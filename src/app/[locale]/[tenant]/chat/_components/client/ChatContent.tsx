'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { getMessages, deleteMessage } from '@/app/actions/chatAction';
import type { ChatMessage } from '@/lib/db/chatDb';
import { useChatContext } from './ChatContext';

/**
 * Chat content component - displays conversation messages from database
 * with individual message delete functionality
 */
export default function ChatContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const { activeConversationId } = useChatContext();

  // Fetch messages when conversation changes
  const fetchMessages = async () => {
    if (!activeConversationId) {
      setMessages([]);
      setError(null);
      return;
    }

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

  useEffect(() => {
    fetchMessages();

    // Listen for new messages to display immediately
    const handleNewMessage = (event: CustomEvent) => {
      const { conversationId, userMessage, aiMessages } = event.detail;

      console.log('[@component:ChatContent] New message event received', {
        conversationId,
        activeConversationId,
        aiMessageCount: aiMessages?.length,
      });

      // Show messages if this is the active conversation OR if no active conversation (new chat)
      const shouldShow =
        conversationId === activeConversationId ||
        !activeConversationId ||
        conversationId.startsWith('temp-');

      if (shouldShow) {
        console.log('[@component:ChatContent] Adding messages immediately from event');

        // Create temporary message objects for immediate display
        const tempUserMessage: ChatMessage = {
          id: 'temp-user-' + Date.now(),
          conversation_id: conversationId,
          role: userMessage.role,
          content: userMessage.content,
          model_id: null,
          model_name: null,
          provider: null,
          token_count: null,
          response_time_ms: null,
          error_message: null,
          metadata: null,
          creator_id: 'temp',
          created_at: userMessage.timestamp,
          updated_at: userMessage.timestamp,
        };

        const tempAiMessages: ChatMessage[] = aiMessages.map((msg: any, index: number) => ({
          id: 'temp-ai-' + Date.now() + '-' + index,
          conversation_id: conversationId,
          role: msg.role,
          content: msg.content,
          model_id: msg.modelId,
          model_name: msg.metadata?.model_name || msg.modelId,
          provider: 'openrouter',
          token_count: msg.metadata?.usage?.total_tokens || null,
          response_time_ms: msg.responseTime,
          error_message: msg.error || null,
          metadata: msg.metadata,
          creator_id: 'temp',
          created_at: msg.timestamp,
          updated_at: msg.timestamp,
        }));

        // Add messages immediately for display
        setMessages((prev) => [...prev, tempUserMessage, ...tempAiMessages]);

        // Fetch fresh data from database after a short delay to replace temp messages
        setTimeout(() => {
          if (conversationId && !conversationId.startsWith('temp-')) {
            fetchMessages();
          }
        }, 2000);
      }
    };

    const handleConversationCleared = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      if (conversationId === activeConversationId) {
        console.log('[@component:ChatContent] Refreshing messages after conversation cleared');
        fetchMessages();
      }
    };

    const handleMessageDeleted = () => {
      console.log('[@component:ChatContent] Refreshing messages after message deletion');
      fetchMessages();
    };

    window.addEventListener('CHAT_MESSAGE_SENT', handleNewMessage as EventListener);
    window.addEventListener(
      'CHAT_CONVERSATION_CLEARED',
      handleConversationCleared as EventListener,
    );
    window.addEventListener('CHAT_MESSAGE_DELETED', handleMessageDeleted);

    return () => {
      window.removeEventListener('CHAT_MESSAGE_SENT', handleNewMessage as EventListener);
      window.removeEventListener(
        'CHAT_CONVERSATION_CLEARED',
        handleConversationCleared as EventListener,
      );
      window.removeEventListener('CHAT_MESSAGE_DELETED', handleMessageDeleted);
    };
  }, [activeConversationId]);

  const handleDeleteMessage = async (
    messageId: string,
    messageContent: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete this message?\n\n"${messageContent.slice(0, 100)}${messageContent.length > 100 ? '...' : ''}"`,
    );

    if (!confirmed) return;

    try {
      console.log(`[@component:ChatContent] Deleting message: ${messageId}`);
      setDeletingMessageId(messageId);

      const result = await deleteMessage(messageId);

      if (result.success) {
        toast.success('Message deleted successfully');

        // Dispatch event for other components
        window.dispatchEvent(
          new CustomEvent('CHAT_MESSAGE_DELETED', {
            detail: { messageId, conversationId: result.data?.conversationId },
          }),
        );
      } else {
        toast.error(result.error || 'Failed to delete message');
      }
    } catch (error: any) {
      console.error('[@component:ChatContent] Delete error:', error);
      toast.error('Failed to delete message');
    } finally {
      setDeletingMessageId(null);
    }
  };

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
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">Start a new conversation</h3>
              <p className="text-sm">Select a model and send a message to begin chatting</p>
            </div>
          </div>
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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">Start a new conversation</h3>
              <p className="text-sm">Select a model and send a message to begin chatting</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 relative group ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-12'
                    : 'bg-secondary text-foreground mr-12'
                }`}
              >
                {/* Message Header for AI responses */}
                {message.role === 'assistant' && message.model_name && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <span>{getProviderLogo(message.provider)}</span>
                    <span className="font-medium">{message.model_name}</span>
                    {message.response_time_ms && (
                      <span className="text-xs">({message.response_time_ms}ms)</span>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </div>

                {/* Message Footer */}
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span
                    className={`${
                      message.role === 'user'
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formatTimestamp(message.created_at)}
                  </span>

                  {/* Token count for AI messages */}
                  {message.role === 'assistant' && message.token_count && (
                    <span className="text-muted-foreground text-xs">
                      {message.token_count} tokens
                    </span>
                  )}
                </div>

                {/* Error message if any */}
                {message.error_message && (
                  <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                    Error: {message.error_message}
                  </div>
                )}

                {/* Delete button on hover */}
                <button
                  onClick={(e) => handleDeleteMessage(message.id, message.content, e)}
                  disabled={deletingMessageId === message.id}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete message"
                >
                  {deletingMessageId === message.id ? (
                    <div className="w-3 h-3 border border-destructive border-t-transparent rounded-full animate-spin" />
                  ) : (
                    '🗑️'
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
