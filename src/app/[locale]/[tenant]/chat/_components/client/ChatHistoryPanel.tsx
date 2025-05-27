'use client';

import { useState, useEffect } from 'react';

import { getConversations, deleteConversation } from '@/app/actions/chatAction';
import type { ChatConversation } from '@/lib/db/chatDb';

import { useChatContext } from './ChatContext';

/**
 * Chat history panel component - displays list of real conversations from database
 * with delete and clear functionality
 */
export default function ChatHistoryPanel() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const { setActiveConversationId, activeConversationId } = useChatContext();

  // Fetch conversations from database
  const fetchConversations = async () => {
    try {
      console.log('[@component:ChatHistoryPanel] Fetching conversations');
      setIsLoading(true);
      setError(null);

      const result = await getConversations({ limit: 50 });

      if (result.success && result.data) {
        console.log(`[@component:ChatHistoryPanel] Loaded ${result.data.length} conversations`);
        setConversations(result.data);
      } else {
        console.error('[@component:ChatHistoryPanel] Failed to fetch conversations:', result.error);
        setError(result.error || 'Failed to load conversations');
      }
    } catch (error: any) {
      console.error('[@component:ChatHistoryPanel] Error:', error);
      setError('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Listen for new messages to refresh conversations
    const handleNewMessage = (event: CustomEvent) => {
      console.log('[@component:ChatHistoryPanel] New message event - updating conversation count');
      const { conversationId, aiMessages } = event.detail;

      // Immediately update the conversation count in state (don't wait for DB)
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === conversationId) {
            const totalNewMessages = 1 + (aiMessages?.length || 0); // user + AI messages
            return {
              ...conv,
              message_count: Math.max(conv.message_count + totalNewMessages, 1), // Never show 0
              last_message_at: new Date().toISOString(),
            };
          }
          return conv;
        }),
      );
    };

    const handleConversationDeleted = () => {
      console.log('[@component:ChatHistoryPanel] Refreshing conversations after deletion');
      fetchConversations();
    };

    window.addEventListener('CHAT_MESSAGE_SENT', handleNewMessage as EventListener);
    window.addEventListener('CHAT_CONVERSATION_DELETED', handleConversationDeleted);

    return () => {
      window.removeEventListener('CHAT_MESSAGE_SENT', handleNewMessage as EventListener);
      window.removeEventListener('CHAT_CONVERSATION_DELETED', handleConversationDeleted);
    };
  }, []);

  const handleConversationClick = (conversation: ChatConversation) => {
    console.log('[@component:ChatHistoryPanel] Switching to conversation:', conversation.id);
    setActiveConversationId(conversation.id);
  };

  const handleNewChat = () => {
    console.log('[@component:ChatHistoryPanel] Starting new chat');
    setActiveConversationId(null);
  };

  const handleDeleteConversation = async (
    conversationId: string,
    conversationTitle: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation(); // Prevent conversation selection

    try {
      console.log(`[@component:ChatHistoryPanel] Deleting conversation: ${conversationId}`);
      setDeletingConversationId(conversationId);

      const result = await deleteConversation(conversationId);

      if (result.success) {
        // Conversation deleted successfully - no toast needed

        // If we deleted the active conversation, clear it
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
        }

        // Dispatch event for other components
        window.dispatchEvent(
          new CustomEvent('CHAT_CONVERSATION_DELETED', {
            detail: { conversationId },
          }),
        );
      } else {
        console.error('[@component:ChatHistoryPanel] Delete error:', result.error);
      }
    } catch (error: any) {
      console.error('[@component:ChatHistoryPanel] Delete error:', error);
      // Delete failed - no toast needed
    } finally {
      setDeletingConversationId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h2 className="text-base font-semibold text-foreground mb-2">Chat History</h2>
        <button
          onClick={handleNewChat}
          className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading conversations...
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-destructive text-sm mb-2">Failed to load conversations</div>
            <div className="text-xs text-muted-foreground">{error}</div>
          </div>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No conversations yet.
            <br />
            Start a new chat to begin!
          </div>
        )}

        {!isLoading &&
          !error &&
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleConversationClick(conversation)}
              className={`p-2.5 mb-1.5 rounded-lg cursor-pointer transition-colors group relative ${
                activeConversationId === conversation.id
                  ? 'bg-primary/20 border border-primary/30'
                  : 'hover:bg-secondary/80'
              }`}
            >
              <div
                className={`font-medium text-sm truncate pr-16 ${
                  activeConversationId === conversation.id
                    ? 'text-primary'
                    : 'text-foreground group-hover:text-primary'
                }`}
              >
                {conversation.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                <span>{conversation.message_count} msgs</span>
                <span>{formatDate(conversation.last_message_at)}</span>
              </div>

              {/* Action buttons - shown on hover */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                {/* Delete conversation button */}
                <button
                  onClick={(e) => handleDeleteConversation(conversation.id, conversation.title, e)}
                  disabled={deletingConversationId === conversation.id}
                  className="p-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete conversation"
                >
                  {deletingConversationId === conversation.id ? (
                    <div className="w-3 h-3 border border-destructive border-t-transparent rounded-full animate-spin" />
                  ) : (
                    '❌'
                  )}
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          {isLoading ? 'Loading...' : `${conversations.length} conversations`}
        </div>
      </div>
    </div>
  );
}
