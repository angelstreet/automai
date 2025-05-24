'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

import { MODEL_SELECTION } from '../../constants';

interface ChatContextType {
  selectedModels: string[];
  setSelectedModels: (models: string[]) => void;
  activeTab: string;
  setActiveTab: (model: string) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  openRouterApiKey: string | null;
  setOpenRouterApiKey: (key: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [selectedModels, setSelectedModels] = useState<string[]>([
    ...MODEL_SELECTION.DEFAULT_MODELS,
  ]);
  const [activeTab, setActiveTab] = useState<string>(MODEL_SELECTION.DEFAULT_MODELS[0]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string | null>(null);

  // Update active tab when selected models change
  const handleSetSelectedModels = (models: string[]) => {
    setSelectedModels(models);
    // If active tab is not in selected models, switch to first selected
    if (!models.includes(activeTab) && models.length > 0) {
      setActiveTab(models[0]);
    }
  };

  // Handle conversation switching
  const handleSetActiveConversationId = (id: string | null) => {
    console.log('[@context:ChatProvider:handleSetActiveConversationId] Switching conversation:', {
      from: activeConversationId,
      to: id,
    });
    setActiveConversationId(id);
  };

  return (
    <ChatContext.Provider
      value={{
        selectedModels,
        setSelectedModels: handleSetSelectedModels,
        activeTab,
        setActiveTab,
        activeConversationId,
        setActiveConversationId: handleSetActiveConversationId,
        isLoading,
        setIsLoading,
        openRouterApiKey,
        setOpenRouterApiKey,
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
