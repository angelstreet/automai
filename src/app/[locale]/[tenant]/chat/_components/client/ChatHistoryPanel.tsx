'use client';

import { useState, useEffect } from 'react';
import { MOCK_CHAT_HISTORY } from '../../constants';

/**
 * Chat history panel component - displays list of previous conversations
 */
export default function ChatHistoryPanel() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h2 className="text-base font-semibold text-foreground mb-2">Chat History</h2>
        <button className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        {MOCK_CHAT_HISTORY.map((chat) => (
          <div
            key={chat.id}
            className="p-2.5 mb-1.5 rounded-lg hover:bg-secondary/80 cursor-pointer transition-colors group"
          >
            <div className="font-medium text-foreground text-sm truncate group-hover:text-primary">
              {chat.title}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>{chat.messageCount} msgs</span>
              <span>
                {isClient
                  ? chat.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Today'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          {MOCK_CHAT_HISTORY.length} conversations
        </div>
      </div>
    </div>
  );
}
