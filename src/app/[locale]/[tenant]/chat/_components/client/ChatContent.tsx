'use client';

import { useState, useEffect, useCallback } from 'react';

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
  const { activeConversationId, filteredModels, getModelTextColor } = useChatContext();

  // Fetch messages when conversation changes
  const fetchMessages = useCallback(async () => {
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
  }, [activeConversationId]);

  useEffect(() => {
    fetchMessages();

    // Listen for new messages to display immediately
    const handleNewMessage = (event: CustomEvent) => {
      const { conversationId, userMessage, aiMessages } = event.detail;

      console.log('[@component:ChatContent] New message event received', {
        conversationId,
        activeConversationId,
        userMessage,
        aiMessageCount: aiMessages?.length,
        aiMessages: aiMessages, // Debug: log full AI messages
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
          team_id: 'temp',
          creator_id: 'temp',
          created_at: userMessage.timestamp,
          updated_at: userMessage.timestamp,
        };

        const tempAiMessages: ChatMessage[] = aiMessages.map((msg: any, index: number) => {
          console.log('[@component:ChatContent] Processing AI message:', msg); // Debug each AI message
          return {
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
            team_id: 'temp',
            creator_id: 'temp',
            created_at: msg.timestamp,
            updated_at: msg.timestamp,
          };
        });

        console.log('[@component:ChatContent] About to add messages:', {
          userMessage: tempUserMessage,
          aiMessages: tempAiMessages,
          totalMessages: 1 + tempAiMessages.length,
        });

        // Add messages immediately for display - NO REFRESH NEEDED!
        setMessages((prev) => {
          const newMessages = [...prev, tempUserMessage, ...tempAiMessages];
          console.log(
            '[@component:ChatContent] Messages state updated, total count:',
            newMessages.length,
          );
          return newMessages;
        });

        console.log(
          '[@component:ChatContent] Messages added successfully - background save will handle persistence',
        );
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
  }, [activeConversationId, fetchMessages]);

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
      <div className="flex-1 overflow-y-auto p-2 space-y-2 mt-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">Start a new conversation</h3>
              <p className="text-sm">Select a model and send a message to begin chatting</p>
            </div>
          </div>
        ) : (
          messages
            .filter((message) => {
              // Always show user messages
              if (message.role === 'user') return true;
              // For AI messages, check if the model is in the filtered list
              return message.model_id && filteredModels.includes(message.model_id);
            })
            .map((message) => {
              // Get model text color for AI messages (only for model name)
              const modelTextColor =
                message.role === 'assistant' && message.model_id
                  ? getModelTextColor(message.model_id)
                  : '';

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[99%] rounded-lg px-3 py-1 mr-1 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    {/* Model name badge for AI messages */}
                    {message.role === 'assistant' && message.model_name && (
                      <div className={`text-xs opacity-75 mb-1 font-medium ${modelTextColor}`}>
                        {message.model_name}
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                      {/* Token info for all messages */}
                      <span className="ml-2 text-xs opacity-75">
                        {message.role === 'user' &&
                          message.token_count &&
                          `${message.token_count} tokens`}
                        {message.role === 'assistant' && (
                          <>
                            {message.response_time_ms && `${message.response_time_ms}ms / `}
                            {message.token_count && `${message.token_count} tokens`}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Error message if any */}
                    {message.error_message && (
                      <div className="mt-1 text-xs text-red-200 bg-red-900/20 rounded px-2 py-1">
                        Error: {message.error_message}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
