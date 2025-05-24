/**
 * OpenRouter API client for chat completions
 * Provides streaming and non-streaming chat capabilities with multiple models
 */

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  top_provider: {
    max_completion_tokens?: number;
    is_moderated: boolean;
  };
  per_request_limits?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}

export interface OpenRouterStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason?: string;
  }>;
  created: number;
}

export interface ChatCompletionOptions {
  model: string;
  messages: OpenRouterMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
}

class OpenRouterClient {
  private baseUrl = 'https://openrouter.ai/api/v1';
  private apiKey: string;
  private appName: string;
  private appUrl: string;

  constructor(apiKey: string, appName = 'AutomAI', appUrl = 'https://automai.dev') {
    this.apiKey = apiKey;
    this.appName = appName;
    this.appUrl = appUrl;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.appUrl,
      'X-Title': this.appName,
    };
  }

  /**
   * Get available models from OpenRouter
   */
  async getModels(): Promise<{ success: boolean; data?: OpenRouterModel[]; error?: string }> {
    try {
      console.log('[@lib:openrouter:getModels] Fetching available models');

      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[@lib:openrouter:getModels] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        return {
          success: false,
          error: `Failed to fetch models: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log(
        `[@lib:openrouter:getModels] Successfully fetched ${data.data?.length || 0} models`,
      );

      return {
        success: true,
        data: data.data || [],
      };
    } catch (error: any) {
      console.error('[@lib:openrouter:getModels] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch models',
      };
    }
  }

  /**
   * Create chat completion (non-streaming)
   */
  async createChatCompletion(
    options: ChatCompletionOptions,
  ): Promise<{ success: boolean; data?: OpenRouterResponse; error?: string }> {
    try {
      console.log('[@lib:openrouter:createChatCompletion] Starting chat completion', {
        model: options.model,
        messageCount: options.messages.length,
        stream: false,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...options,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[@lib:openrouter:createChatCompletion] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        return {
          success: false,
          error: `Chat completion failed: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log('[@lib:openrouter:createChatCompletion] Successfully completed chat', {
        model: data.model,
        usage: data.usage,
      });

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('[@lib:openrouter:createChatCompletion] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create chat completion',
      };
    }
  }

  /**
   * Create streaming chat completion
   */
  async createStreamingChatCompletion(
    options: ChatCompletionOptions,
  ): Promise<{ success: boolean; stream?: ReadableStream; error?: string }> {
    try {
      console.log(
        '[@lib:openrouter:createStreamingChatCompletion] Starting streaming chat completion',
        {
          model: options.model,
          messageCount: options.messages.length,
          stream: true,
        },
      );

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...options,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[@lib:openrouter:createStreamingChatCompletion] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        return {
          success: false,
          error: `Streaming chat completion failed: ${response.status} ${response.statusText}`,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No response body received for streaming',
        };
      }

      console.log('[@lib:openrouter:createStreamingChatCompletion] Successfully started streaming');

      return {
        success: true,
        stream: response.body,
      };
    } catch (error: any) {
      console.error('[@lib:openrouter:createStreamingChatCompletion] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create streaming chat completion',
      };
    }
  }

  /**
   * Parse streaming response chunks
   */
  static parseStreamChunk(chunk: string): OpenRouterStreamChunk | null {
    try {
      // Remove 'data: ' prefix if present
      const jsonStr = chunk.replace(/^data: /, '').trim();

      // Skip [DONE] messages
      if (jsonStr === '[DONE]') {
        return null;
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      console.warn('[@lib:openrouter:parseStreamChunk] Failed to parse chunk:', chunk);
      return null;
    }
  }
}

/**
 * Create OpenRouter client instance
 */
export function createOpenRouterClient(apiKey: string): OpenRouterClient {
  return new OpenRouterClient(apiKey);
}

export default OpenRouterClient;
