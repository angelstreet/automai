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
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
        <button className="mt-2 w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        {MOCK_CHAT_HISTORY.map((chat) => (
          <div
            key={chat.id}
            className="p-3 mb-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <div className="font-medium text-gray-900 text-sm truncate">{chat.title}</div>
            <div className="text-xs text-gray-500 mt-1">
              {chat.messageCount} messages •{' '}
              {isClient ? chat.timestamp.toLocaleDateString() : 'Today'}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Total conversations: {MOCK_CHAT_HISTORY.length}
        </div>
      </div>
    </div>
  );
}
