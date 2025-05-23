// Debug settings
export const DEBUG = false;

// Cache TTL settings (in milliseconds)
export const CACHE_TTL = {
  HOSTS: 2 * 60 * 1000, // 2 minutes
};

// Request cooldown period to prevent excessive API calls
export const REQUEST_COOLDOWN = 5000; // 5 seconds

// Error messages
export const ERROR_MESSAGES = {
  UNEXPECTED_ERROR: 'An unexpected error occurred',
};

// UI Layout Constants
export const CHAT_LAYOUT = {
  SIDEBAR_WIDTH: 'w-64', // 256px - reduced from w-80
  HEADER_HEIGHT: 'h-14', // 56px - reduced slightly
  MESSAGE_INPUT_HEIGHT: 'h-16', // 64px - more elegant height
  MIN_CHAT_HEIGHT: 'min-h-0', // Allow flexible height
} as const;

// Available AI Models
export const AI_MODELS = [
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
] as const;

// Multi-model settings
export const MODEL_SELECTION = {
  MIN_MODELS: 1,
  MAX_MODELS: 3,
} as const;

// Chat History Mock Data (for UI layout)
export const MOCK_CHAT_HISTORY = [
  { id: '1', title: 'Frontend Development Help', timestamp: new Date(), messageCount: 15 },
  { id: '2', title: 'API Integration Questions', timestamp: new Date(), messageCount: 8 },
  { id: '3', title: 'Database Design Review', timestamp: new Date(), messageCount: 22 },
  { id: '4', title: 'Code Optimization Tips', timestamp: new Date(), messageCount: 12 },
] as const;
