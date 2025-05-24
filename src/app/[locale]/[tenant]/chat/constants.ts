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
  MESSAGE_INPUT_HEIGHT: 'h-16', // 64px - more elegant height
  MIN_CHAT_HEIGHT: 'min-h-0', // Allow flexible height
} as const;

// OpenRouter Popular Models (fallback when database is empty)
export const POPULAR_OPENROUTER_MODELS = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Most intelligent model, best for complex tasks',
    contextLength: 200000,
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'Fast and capable, good for most tasks',
    contextLength: 128000,
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Fastest and most affordable',
    contextLength: 200000,
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B',
    provider: 'Meta',
    description: 'Open source, good for general tasks',
    contextLength: 128000,
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: 'Google',
    description: "Google's advanced model with large context",
    contextLength: 1000000,
  },
] as const;

// Available AI Models (backwards compatibility)
export const AI_MODELS = POPULAR_OPENROUTER_MODELS.map((model) => ({
  id: model.id,
  name: model.name,
  provider: model.provider,
}));

// Multi-model settings
export const MODEL_SELECTION = {
  MIN_MODELS: 1,
  MAX_MODELS: 3,
  DEFAULT_MODELS: ['anthropic/claude-3.5-sonnet'], // Default selected models
} as const;

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
