'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { MODEL_SELECTION } from '../../constants';

// Model colors - consistent assignment
const MODEL_COLORS = ['bg-red-500', 'bg-green-500', 'bg-blue-500'] as const;
const MODEL_TEXT_COLORS = ['text-red-500', 'text-green-500', 'text-blue-500'] as const;

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
  // Model filtering
  filteredModels: string[];
  setFilteredModels: (models: string[]) => void;
  getModelColor: (modelId: string) => string;
  getModelTextColor: (modelId: string) => string;
  toggleModelFilter: (modelId: string) => void;
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
  const [filteredModels, setFilteredModels] = useState<string[]>([]);

  // Initialize filtered models to show all selected models
  useEffect(() => {
    setFilteredModels([...selectedModels]);
  }, [selectedModels]);

  // Get consistent color for a model based on its position in selectedModels
  const getModelColor = (modelId: string): string => {
    const index = selectedModels.indexOf(modelId);
    return index >= 0 && index < MODEL_COLORS.length ? MODEL_COLORS[index] : 'bg-gray-500';
  };

  // Get consistent text color for a model
  const getModelTextColor = (modelId: string): string => {
    const index = selectedModels.indexOf(modelId);
    return index >= 0 && index < MODEL_TEXT_COLORS.length
      ? MODEL_TEXT_COLORS[index]
      : 'text-gray-500';
  };

  // Toggle model filter
  const toggleModelFilter = (modelId: string) => {
    setFilteredModels((prev) => {
      if (prev.includes(modelId)) {
        // Remove from filter
        const newFiltered = prev.filter((id) => id !== modelId);
        // If no models left, show all
        return newFiltered.length === 0 ? [...selectedModels] : newFiltered;
      } else {
        // Add to filter
        return [...prev, modelId];
      }
    });
  };

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
        filteredModels,
        setFilteredModels,
        getModelColor,
        getModelTextColor,
        toggleModelFilter,
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
