'use client';

import { useState, useEffect } from 'react';

import { getConversations } from '@/app/actions/chatAction';
import type { ChatConversation } from '@/lib/db/chatDb';
import { useChatContext } from './ChatContext';

/**
 * Chat history panel component - displays list of real conversations from database
 */
export default function ChatHistoryPanel() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setActiveConversationId, activeConversationId } = useChatContext();

  // Fetch conversations from database
  useEffect(() => {
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
          console.error(
            '[@component:ChatHistoryPanel] Failed to fetch conversations:',
            result.error,
          );
          setError(result.error || 'Failed to load conversations');
        }
      } catch (error: any) {
        console.error('[@component:ChatHistoryPanel] Error:', error);
        setError('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();

    // Listen for new messages to refresh conversations
    const handleNewMessage = () => {
      console.log('[@component:ChatHistoryPanel] Refreshing conversations after new message');
      fetchConversations();
    };

    window.addEventListener('CHAT_MESSAGE_SENT', handleNewMessage);

    return () => {
      window.removeEventListener('CHAT_MESSAGE_SENT', handleNewMessage);
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
              className={`p-2.5 mb-1.5 rounded-lg cursor-pointer transition-colors group ${
                activeConversationId === conversation.id
                  ? 'bg-primary/20 border border-primary/30'
                  : 'hover:bg-secondary/80'
              }`}
            >
              <div
                className={`font-medium text-sm truncate ${
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
