'use client';

import { useState, useEffect } from 'react';
import { getModelById } from '../../constants';
import { useChatContext } from './ChatContext';

/**
 * Chat area component - displays chat messages with multi-model support
 */
export default function ChatArea() {
  const [isClient, setIsClient] = useState(false);
  const { selectedModels, activeTab, setActiveTab } = useChatContext();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Mock multi-model responses - only for selected models
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
    'gpt-4': [
      {
        id: '1',
        content: 'Hello! How can I help you today?',
        role: 'assistant',
        timestamp: new Date(),
        model: 'GPT-4',
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
          "I can guide you through creating a React component for your chat application. Let's build this step by step with proper TypeScript support.",
        role: 'assistant',
        timestamp: new Date(),
        model: 'GPT-4',
      },
    ],
    'claude-3-opus': [
      {
        id: '1',
        content: 'Hello! How can I help you today?',
        role: 'assistant',
        timestamp: new Date(),
        model: 'Claude 3 Opus',
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
          "Excellent! I'll help you create a robust React component for your chat application. Let me provide you with a comprehensive solution that follows React best practices.",
        role: 'assistant',
        timestamp: new Date(),
        model: 'Claude 3 Opus',
      },
    ],
    'claude-3-haiku': [
      {
        id: '1',
        content: 'Hello! How can I help you today?',
        role: 'assistant',
        timestamp: new Date(),
        model: 'Claude 3 Haiku',
      },
      {
        id: '2',
        content: 'I need help with creating a React component for my chat application.',
        role: 'user',
        timestamp: new Date(),
      },
      {
        id: '3',
        content: "I'll help you create a React chat component. Here's a clean, simple approach.",
        role: 'assistant',
        timestamp: new Date(),
        model: 'Claude 3 Haiku',
      },
    ],
  };

  // Filter messages to only show selected models
  const availableModels = selectedModels.filter(
    (modelId) => multiModelMessages[modelId as keyof typeof multiModelMessages],
  );

  const currentMessages = multiModelMessages[activeTab as keyof typeof multiModelMessages] || [];

  // Get model display name using the new helper function
  const getModelDisplayName = (modelId: string) => {
    const model = getModelById(modelId);
    if (!model) return modelId;

    // Simplified names for tabs
    let name = model.name;
    if (name.includes('Claude 3.5')) return 'Claude 3.5';
    if (name.includes('Claude Opus 4')) return 'Claude Opus 4';
    if (name.includes('Claude Sonnet 4')) return 'Claude Sonnet 4';
    if (name.includes('Claude 3 Opus')) return 'Claude Opus';
    if (name.includes('Claude 3 Haiku')) return 'Claude Haiku';
    if (name.includes('GPT-4.1')) return 'GPT-4.1';
    if (name.includes('GPT-4 Turbo')) return 'GPT-4 Turbo';
    if (name.includes('GPT-4')) return 'GPT-4';
    if (name.includes('o4')) return 'o4';
    if (name.includes('o3')) return 'o3';
    if (name.includes('Llama 4')) return 'Llama 4';
    if (name.includes('Llama 3.3')) return 'Llama 3.3';
    if (name.includes('Gemini 2.5')) return 'Gemini 2.5';
    if (name.includes('Qwen3')) return 'Qwen3';
    if (name.includes('DeepSeek')) return 'DeepSeek';
    if (name.includes('Mistral')) return 'Mistral';
    if (name.includes('Grok')) return 'Grok';

    // Fallback to shortened name
    if (name.length > 20) {
      return name.substring(0, 17) + '...';
    }
    return name;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Model Tabs - Only show if multiple models selected */}
      {selectedModels.length > 1 && (
        <div className="flex border-b border-border bg-background/50 overflow-x-auto">
          {selectedModels.map((modelId) => {
            const model = getModelById(modelId);
            return (
              <button
                key={modelId}
                onClick={() => setActiveTab(modelId)}
                className={`px-4 py-2 text-sm transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === modelId
                    ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {getModelDisplayName(modelId)}
                {model?.isFree && <span className="text-[10px]">🆓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentMessages.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">Start a new conversation</div>
              <div className="text-sm">
                {selectedModels.length === 1
                  ? `Chat with ${getModelDisplayName(selectedModels[0])}`
                  : `Chat with ${selectedModels.length} selected models`}
              </div>
              {selectedModels.length > 0 && (
                <div className="text-xs mt-2 space-y-1">
                  {selectedModels.map((modelId) => {
                    const model = getModelById(modelId);
                    return (
                      <div key={modelId} className="flex items-center justify-center gap-1">
                        <span>{model?.name || modelId}</span>
                        {model?.isFree && <span className="text-green-600">FREE</span>}
                      </div>
                    );
                  })}
                </div>
              )}
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
                  {message.role === 'user' ? 'You' : getModelDisplayName(activeTab)}
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
