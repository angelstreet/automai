'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

import { AI_MODELS } from '../../constants';

interface ChatContextType {
  selectedModels: string[];
  setSelectedModels: (models: string[]) => void;
  activeTab: string;
  setActiveTab: (model: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [selectedModels, setSelectedModels] = useState<string[]>([AI_MODELS[0].id]);
  const [activeTab, setActiveTab] = useState<string>(AI_MODELS[0].id);

  // Update active tab when selected models change
  const handleSetSelectedModels = (models: string[]) => {
    setSelectedModels(models);
    // If active tab is not in selected models, switch to first selected
    if (!models.includes(activeTab) && models.length > 0) {
      setActiveTab(models[0]);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        selectedModels,
        setSelectedModels: handleSetSelectedModels,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
