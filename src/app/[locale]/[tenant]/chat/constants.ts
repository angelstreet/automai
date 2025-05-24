// Debug settings
export const DEBUG = false;

// Cache TTL settings (in milliseconds)
export const CACHE_TTL = {
  HOSTS: 2 * 60 * 1000, // 2 minutes
  CHAT_HISTORY: 5 * 60 * 1000, // 5 minutes
  OPENROUTER_MODELS: 30 * 60 * 1000, // 30 minutes
};

// Request cooldown period to prevent excessive API calls
export const REQUEST_COOLDOWN = 5000; // 5 seconds

// Error messages
export const ERROR_MESSAGES = {
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  OPENROUTER_KEY_MISSING: 'OpenRouter API key is required',
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  MESSAGE_SEND_FAILED: 'Failed to send message',
};

// UI Layout Constants
export const CHAT_LAYOUT = {
  SIDEBAR_WIDTH: 'w-64', // 256px - reduced from w-80
  HEADER_HEIGHT: 'h-14', // 56px - reduced slightly
  MESSAGE_INPUT_HEIGHT: 'h-20', // 80px - compact height for input only
  MIN_CHAT_HEIGHT: 'min-h-0', // Allow flexible height
} as const;

// Import the full OpenRouter models data
import openRouterModelsData from './openrouter_models.json';

// Model interface for OpenRouter models
export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  isFree: boolean;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    modality: string;
  };
}

// Helper function to extract provider from model name
const extractProvider = (name: string): string => {
  const parts = name.split(':');
  if (parts.length > 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  // Fallback extraction from name
  if (name.includes('OpenAI')) return 'OpenAI';
  if (name.includes('Anthropic')) return 'Anthropic';
  if (name.includes('Google')) return 'Google';
  if (name.includes('Meta')) return 'Meta';
  if (name.includes('Mistral')) return 'Mistral';
  if (name.includes('Microsoft')) return 'Microsoft';
  if (name.includes('Qwen')) return 'Qwen';
  if (name.includes('DeepSeek')) return 'DeepSeek';
  if (name.includes('xAI')) return 'xAI';
  if (name.includes('NVIDIA')) return 'NVIDIA';

  return 'Other';
};

// Helper function to check if a model is free
const isModelFree = (model: any): boolean => {
  // Check if model ID ends with :free
  if (model.id.endsWith(':free')) return true;

  // Check if pricing is zero for both prompt and completion
  const promptCost = parseFloat(model.pricing?.prompt || '0');
  const completionCost = parseFloat(model.pricing?.completion || '0');

  return promptCost === 0 && completionCost === 0;
};

// Process the OpenRouter models data
const processOpenRouterModels = (): OpenRouterModel[] => {
  return openRouterModelsData.data.map(
    (model): OpenRouterModel => ({
      id: model.id,
      name: model.name,
      provider: extractProvider(model.name),
      description: model.description || '',
      contextLength: model.context_length || 0,
      isFree: isModelFree(model),
      pricing: {
        prompt: model.pricing?.prompt || '0',
        completion: model.pricing?.completion || '0',
      },
      architecture: model.architecture,
    }),
  );
};

// All available models from OpenRouter
export const ALL_OPENROUTER_MODELS = processOpenRouterModels();

// Free models (sorted by popularity/quality)
export const FREE_OPENROUTER_MODELS = ALL_OPENROUTER_MODELS.filter((model) => model.isFree).sort(
  (a, b) => {
    // Prioritize well-known providers and larger models
    const providerPriority = (provider: string) => {
      switch (provider.toLowerCase()) {
        case 'meta':
          return 10;
        case 'mistral':
          return 9;
        case 'microsoft':
          return 8;
        case 'qwen':
          return 7;
        case 'google':
          return 6;
        case 'deepseek':
          return 5;
        default:
          return 1;
      }
    };

    const providerDiff = providerPriority(b.provider) - providerPriority(a.provider);
    if (providerDiff !== 0) return providerDiff;

    // Then by context length (larger is better)
    return b.contextLength - a.contextLength;
  },
);

// Popular paid models (manually curated list of high-quality models)
export const POPULAR_OPENROUTER_MODELS = ALL_OPENROUTER_MODELS.filter((model) => !model.isFree)
  .filter((model) => {
    const id = model.id.toLowerCase();
    const name = model.name.toLowerCase();

    // Include popular models from major providers
    return (
      id.includes('claude') ||
      id.includes('gpt-4') ||
      id.includes('gemini') ||
      id.includes('llama-4') ||
      (id.includes('deepseek') && (id.includes('v3') || id.includes('r1'))) ||
      (id.includes('qwen') && id.includes('3')) ||
      id.includes('grok-3')
    );
  })
  .sort((a, b) => {
    // Sort by provider priority and model quality
    const getModelPriority = (model: OpenRouterModel) => {
      const id = model.id.toLowerCase();
      const name = model.name.toLowerCase();

      // Claude models (highest priority)
      if (id.includes('claude-opus-4')) return 100;
      if (id.includes('claude-sonnet-4')) return 99;
      if (id.includes('claude-3.5-sonnet')) return 98;

      // OpenAI models
      if (id.includes('o3')) return 95;
      if (id.includes('o4')) return 94;
      if (id.includes('gpt-4.1')) return 93;
      if (id.includes('gpt-4-turbo')) return 92;

      // Google models
      if (id.includes('gemini-2.5-pro')) return 90;
      if (id.includes('gemini-2.5-flash')) return 89;

      // Meta models
      if (id.includes('llama-4')) return 85;

      // Other quality models
      if (id.includes('deepseek-v3')) return 80;
      if (id.includes('qwen3')) return 75;
      if (id.includes('grok-3')) return 70;

      return 50;
    };

    return getModelPriority(b) - getModelPriority(a);
  })
  .slice(0, 15); // Limit to top 15 popular models

// Combined models with free options first
export const ALL_AVAILABLE_MODELS = [
  ...FREE_OPENROUTER_MODELS,
  ...POPULAR_OPENROUTER_MODELS,
] as const;

// Available AI Models (backwards compatibility)
export const AI_MODELS = ALL_AVAILABLE_MODELS.map((model) => ({
  id: model.id,
  name: model.name,
  provider: model.provider,
}));

// Multi-model settings
export const MODEL_SELECTION = {
  MIN_MODELS: 1,
  MAX_MODELS: 3,
  DEFAULT_MODELS: [FREE_OPENROUTER_MODELS[0]?.id || 'meta-llama/llama-3.3-8b-instruct:free'], // Default to first free model
} as const;

// Helper functions for model management
export const hasFreeModelsOnly = (modelIds: string[]): boolean => {
  const freeModelIds = FREE_OPENROUTER_MODELS.map((model) => model.id);
  return modelIds.every((id) => freeModelIds.includes(id) || id.endsWith(':free'));
};

export const hasPaidModels = (modelIds: string[]): boolean => {
  return !hasFreeModelsOnly(modelIds);
};

export const getModelById = (id: string): OpenRouterModel | undefined => {
  return ALL_OPENROUTER_MODELS.find((model) => model.id === id);
};

// OpenRouter Branding and Attribution
export const OPENROUTER = {
  NAME: 'OpenRouter',
  LOGO_URL: 'https://openrouter.ai/favicon.ico',
  WEBSITE: 'https://openrouter.ai',
  DESCRIPTION: 'Unified API for LLMs',
  ATTRIBUTION: 'Powered by OpenRouter',
  DOCS_URL: 'https://openrouter.ai/docs',
  API_KEY_URL: 'https://openrouter.ai/keys',
} as const;

// Provider Logos (can be used for displaying model providers)
export const PROVIDER_LOGOS = {
  Anthropic: 'https://www.anthropic.com/favicon.ico',
  OpenAI: 'https://openai.com/favicon.ico',
  Meta: 'https://about.meta.com/brand/resources/meta/company-brand/',
  Google: 'https://www.google.com/favicon.ico',
  Mistral: 'https://mistral.ai/favicon.ico',
  Cohere: 'https://cohere.com/favicon.ico',
} as const;

// Chat History Settings
export const CHAT_HISTORY = {
  RETENTION_DAYS: 3, // How long to keep chat history
  MAX_CONVERSATIONS: 50, // Maximum conversations to display
  MESSAGES_PER_PAGE: 50, // Messages per page when loading history
} as const;

// Chat Message Settings
export const CHAT_SETTINGS = {
  MAX_MESSAGE_LENGTH: 4000, // Maximum characters per message
  DEFAULT_TEMPERATURE: 0.7, // Default temperature for AI responses
  DEFAULT_MAX_TOKENS: 2000, // Default max tokens for responses
  STREAMING_ENABLED: true, // Enable streaming responses by default
} as const;

// Chat History Mock Data (for UI layout - will be replaced with real data)
export const MOCK_CHAT_HISTORY = [
  { id: '1', title: 'Frontend Development Help', timestamp: new Date(), messageCount: 15 },
  { id: '2', title: 'API Integration Questions', timestamp: new Date(), messageCount: 8 },
  { id: '3', title: 'Database Design Review', timestamp: new Date(), messageCount: 22 },
  { id: '4', title: 'Code Optimization Tips', timestamp: new Date(), messageCount: 12 },
] as const;
