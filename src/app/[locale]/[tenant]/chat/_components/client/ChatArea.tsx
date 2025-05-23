'use client';

import { useState, useEffect } from 'react';

/**
 * Chat area component - displays chat messages with multi-model support
 */
export default function ChatArea() {
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState('claude-3-5-sonnet');

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Mock multi-model responses
  const multiModelMessages = {
    'claude-3-5-sonnet': [
      {
        id: '1',
        content: 'Hello! How can I help you today?',
        role: 'assistant',
        timestamp: new Date(),
        model: 'Claude 3.5 Sonnet',
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
        model: 'Claude 3.5 Sonnet',
      },
    ],
    'gpt-4-turbo': [
      {
        id: '1',
        content: 'Hello! How can I help you today?',
        role: 'assistant',
        timestamp: new Date(),
        model: 'GPT-4 Turbo',
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
          "I'll help you create a React component for your chat application. Here's a comprehensive approach with best practices and modern React patterns.",
        role: 'assistant',
        timestamp: new Date(),
        model: 'GPT-4 Turbo',
      },
    ],
  };

  const availableTabs = Object.keys(multiModelMessages);
  const currentMessages = multiModelMessages[activeTab as keyof typeof multiModelMessages] || [];

  return (
    <div className="flex flex-col h-full">
      {/* Model Tabs */}
      {availableTabs.length > 1 && (
        <div className="flex border-b border-border bg-background/50">
          {availableTabs.map((modelId) => (
            <button
              key={modelId}
              onClick={() => setActiveTab(modelId)}
              className={`px-4 py-2 text-sm transition-colors ${
                activeTab === modelId
                  ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {modelId.includes('claude') ? 'Claude' : 'GPT-4'}
            </button>
          ))}
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentMessages.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">Start a new conversation</div>
              <div className="text-sm">Select your models and type your message below</div>
            </div>
          </div>
        ) : (
          /* Messages */
          currentMessages.map((message) => (
            <div key={message.id} className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                    message.role === 'user'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {message.role === 'user' ? 'You' : message.model || 'Assistant'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isClient ? message.timestamp.toLocaleTimeString() : '--:--:--'}
                </span>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-secondary/50 border border-border'
                }`}
              >
                <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
