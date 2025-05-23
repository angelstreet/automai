'use client';

import { useState, useEffect } from 'react';

/**
 * Chat area component - displays chat messages
 */
export default function ChatArea() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Mock messages for UI layout
  const mockMessages = [
    {
      id: '1',
      content: 'Hello! How can I help you today?',
      role: 'assistant',
      timestamp: new Date(),
    },
    {
      id: '2',
      content: 'I need help with creating a React component for my chat application.',
      role: 'user',
      timestamp: new Date(),
    },
    {
      id: '3',
      content:
        "I'd be happy to help you create a React component for your chat application! Let me break this down into steps and provide you with a clean, reusable component structure.",
      role: 'assistant',
      timestamp: new Date(),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mockMessages.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium mb-2">Start a new conversation</div>
              <div className="text-sm">Select a model and type your message below</div>
            </div>
          </div>
        ) : (
          /* Messages */
          mockMessages.map((message) => (
            <div key={message.id} className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                    message.role === 'user'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <span className="text-xs text-gray-500">
                  {isClient ? message.timestamp.toLocaleTimeString() : '--:--:--'}
                </span>
              </div>
              <div
                className={`p-4 rounded-lg max-w-none ${
                  message.role === 'user'
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap text-gray-900">{message.content}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
