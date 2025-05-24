'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  hasEnvApiKey: boolean;
  isApiKeyValid: boolean;
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
  const [hasEnvApiKey, setHasEnvApiKey] = useState<boolean>(false);

  // Check if environment has OPENROUTER_API_KEY on mount
  useEffect(() => {
    // Assume environment API key is available (server validates this)
    // No client-side checking needed since server handles the API key
    console.log('[@context:ChatProvider] Assuming environment API key is available');
    setHasEnvApiKey(true);
    setOpenRouterApiKey('env_key_available');
  }, []);

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

  // Check if API key is valid (either user provided or env available)
  const isApiKeyValid = Boolean(
    (openRouterApiKey && openRouterApiKey !== 'env_key_available') || hasEnvApiKey,
  );

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
        hasEnvApiKey,
        isApiKeyValid,
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
