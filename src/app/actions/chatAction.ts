'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';

import { getUser } from '@/app/actions/userAction';
import { getUserActiveTeam } from '@/app/actions/teamAction';
import chatDb from '@/lib/db/chatDb';
import { createOpenRouterClient } from '@/lib/apis/openrouter';
import type {
  ChatConversation,
  ChatMessage,
  CreateConversationInput,
  CreateMessageInput,
  OpenRouterModel,
} from '@/lib/db/chatDb';

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SendMessageInput {
  conversationId?: string; // Optional - will create new conversation if not provided
  content: string;
  modelIds: string[]; // Array of model IDs to use
  conversationTitle?: string; // Title for new conversation
}

export interface StreamChatResponse {
  conversationId: string;
  messageId: string;
  stream: ReadableStream;
}

/**
 * Get conversations for the current user's active team
 */
export const getConversations = cache(
  async (options?: {
    limit?: number;
    offset?: number;
  }): Promise<ActionResult<ChatConversation[]>> => {
    try {
      console.log('[@action:chat:getConversations] Starting to fetch conversations');

      // Get current user and team
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const activeTeam = await getUserActiveTeam(user.id);
      if (!activeTeam?.id) {
        return { success: false, error: 'No active team found' };
      }

      const result = await chatDb.getConversations(activeTeam.id, options);

      if (!result.success) {
        console.error('[@action:chat:getConversations] Error:', result.error);
        return { success: false, error: result.error };
      }

      console.log(
        `[@action:chat:getConversations] Successfully fetched ${result.data?.length || 0} conversations`,
      );
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('[@action:chat:getConversations] Error:', error);
      return { success: false, error: error.message || 'Failed to fetch conversations' };
    }
  },
);

/**
 * Get conversation by ID
 */
export const getConversationById = cache(
  async (conversationId: string): Promise<ActionResult<ChatConversation>> => {
    try {
      console.log(`[@action:chat:getConversationById] Getting conversation: ${conversationId}`);

      const user = await getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await chatDb.getConversationById(conversationId);

      if (!result.success) {
        console.error('[@action:chat:getConversationById] Error:', result.error);
        return { success: false, error: result.error };
      }

      console.log(
        `[@action:chat:getConversationById] Successfully fetched conversation: ${conversationId}`,
      );
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('[@action:chat:getConversationById] Error:', error);
      return { success: false, error: error.message || 'Failed to fetch conversation' };
    }
  },
);

/**
 * Get messages for a conversation
 */
export const getMessages = cache(
  async (
    conversationId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ActionResult<ChatMessage[]>> => {
    try {
      console.log(
        `[@action:chat:getMessages] Getting messages for conversation: ${conversationId}`,
      );

      const user = await getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await chatDb.getMessages(conversationId, options);

      if (!result.success) {
        console.error('[@action:chat:getMessages] Error:', result.error);
        return { success: false, error: result.error };
      }

      console.log(
        `[@action:chat:getMessages] Successfully fetched ${result.data?.length || 0} messages`,
      );
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('[@action:chat:getMessages] Error:', error);
      return { success: false, error: error.message || 'Failed to fetch messages' };
    }
  },
);

/**
 * Create a new conversation
 */
export async function createConversation(
  input: Omit<CreateConversationInput, 'team_id' | 'creator_id' | 'tenant_id'>,
): Promise<ActionResult<ChatConversation>> {
  try {
    console.log(`[@action:chat:createConversation] Creating conversation: ${input.title}`);

    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const activeTeam = await getUserActiveTeam(user.id);
    if (!activeTeam?.id) {
      return { success: false, error: 'No active team found' };
    }

    const conversationInput: CreateConversationInput = {
      ...input,
      team_id: activeTeam.id,
      creator_id: user.id,
      tenant_id: user.tenant_id,
    };

    const result = await chatDb.createConversation(conversationInput);

    if (!result.success) {
      console.error('[@action:chat:createConversation] Error:', result.error);
      return { success: false, error: result.error };
    }

    // Revalidate conversations list
    revalidatePath('/[locale]/[tenant]/chat', 'page');

    console.log(
      `[@action:chat:createConversation] Successfully created conversation: ${result.data?.id}`,
    );
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:chat:createConversation] Error:', error);
    return { success: false, error: error.message || 'Failed to create conversation' };
  }
}

/**
 * Send message and get AI response
 */
export async function sendMessage(input: SendMessageInput): Promise<
  ActionResult<{
    conversation: ChatConversation;
    userMessage: ChatMessage;
    aiMessages: ChatMessage[];
  }>
> {
  try {
    console.log('[@action:chat:sendMessage] Starting to send message');

    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const activeTeam = await getUserActiveTeam(user.id);
    if (!activeTeam?.id) {
      return { success: false, error: 'No active team found' };
    }

    let conversation: ChatConversation;

    // Create conversation if not provided
    if (!input.conversationId) {
      const title = input.conversationTitle || `Chat ${new Date().toLocaleDateString()}`;
      const createResult = await chatDb.createConversation({
        title,
        team_id: activeTeam.id,
        creator_id: user.id,
        tenant_id: user.tenant_id,
        model_ids: input.modelIds,
      });

      if (!createResult.success || !createResult.data) {
        return { success: false, error: createResult.error || 'Failed to create conversation' };
      }

      conversation = createResult.data;
    } else {
      const getResult = await chatDb.getConversationById(input.conversationId);
      if (!getResult.success || !getResult.data) {
        return { success: false, error: getResult.error || 'Conversation not found' };
      }
      conversation = getResult.data;
    }

    // Create user message
    const userMessageInput: CreateMessageInput = {
      conversation_id: conversation.id,
      role: 'user',
      content: input.content,
      team_id: activeTeam.id,
      creator_id: user.id,
    };

    const userMessageResult = await chatDb.createMessage(userMessageInput);
    if (!userMessageResult.success || !userMessageResult.data) {
      return { success: false, error: userMessageResult.error || 'Failed to create user message' };
    }

    // Get OpenRouter API key from environment variables or team settings
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return { success: false, error: 'OpenRouter API key not configured' };
    }

    const openRouterClient = createOpenRouterClient(openrouterApiKey);

    // Get conversation history for context
    const messagesResult = await chatDb.getMessages(conversation.id);
    const messages = messagesResult.success ? messagesResult.data || [] : [];

    // Convert to OpenRouter format
    const openRouterMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const aiMessages: ChatMessage[] = [];

    // Send to each selected model
    for (const modelId of input.modelIds) {
      try {
        const startTime = Date.now();

        const response = await openRouterClient.createChatCompletion({
          model: modelId,
          messages: openRouterMessages,
          max_tokens: 2000,
          temperature: 0.7,
        });

        const responseTime = Date.now() - startTime;

        if (response.success && response.data) {
          const aiContent = response.data.choices[0]?.message?.content || 'No response generated';

          // Create AI message
          const aiMessageInput: CreateMessageInput = {
            conversation_id: conversation.id,
            role: 'assistant',
            content: aiContent,
            model_id: modelId,
            model_name: response.data.model,
            provider: 'openrouter',
            token_count: response.data.usage?.total_tokens || null,
            response_time_ms: responseTime,
            metadata: {
              usage: response.data.usage,
              finish_reason: response.data.choices[0]?.finish_reason,
            },
            team_id: activeTeam.id,
            creator_id: user.id,
          };

          const aiMessageResult = await chatDb.createMessage(aiMessageInput);
          if (aiMessageResult.success && aiMessageResult.data) {
            aiMessages.push(aiMessageResult.data);
          }
        } else {
          // Create error message
          const errorMessageInput: CreateMessageInput = {
            conversation_id: conversation.id,
            role: 'assistant',
            content: 'Sorry, I encountered an error while processing your message.',
            model_id: modelId,
            model_name: modelId,
            provider: 'openrouter',
            error_message: response.error || 'Unknown error',
            response_time_ms: responseTime,
            team_id: activeTeam.id,
            creator_id: user.id,
          };

          const errorMessageResult = await chatDb.createMessage(errorMessageInput);
          if (errorMessageResult.success && errorMessageResult.data) {
            aiMessages.push(errorMessageResult.data);
          }
        }
      } catch (modelError: any) {
        console.error(`[@action:chat:sendMessage] Error with model ${modelId}:`, modelError);

        // Create error message for this model
        const errorMessageInput: CreateMessageInput = {
          conversation_id: conversation.id,
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your message.',
          model_id: modelId,
          model_name: modelId,
          provider: 'openrouter',
          error_message: modelError.message || 'Unknown error',
          team_id: activeTeam.id,
          creator_id: user.id,
        };

        const errorMessageResult = await chatDb.createMessage(errorMessageInput);
        if (errorMessageResult.success && errorMessageResult.data) {
          aiMessages.push(errorMessageResult.data);
        }
      }
    }

    // Update conversation's model_ids if needed
    const updatedModelIds = Array.from(new Set([...conversation.model_ids, ...input.modelIds]));
    if (updatedModelIds.length !== conversation.model_ids.length) {
      await chatDb.updateConversation(conversation.id, {
        model_ids: updatedModelIds,
      });
    }

    // Revalidate chat page
    revalidatePath('/[locale]/[tenant]/chat', 'page');

    console.log(
      `[@action:chat:sendMessage] Successfully sent message and got ${aiMessages.length} AI responses`,
    );
    return {
      success: true,
      data: {
        conversation,
        userMessage: userMessageResult.data,
        aiMessages,
      },
    };
  } catch (error: any) {
    console.error('[@action:chat:sendMessage] Error:', error);
    return { success: false, error: error.message || 'Failed to send message' };
  }
}

/**
 * Get available OpenRouter models
 */
export const getOpenRouterModels = cache(async (): Promise<ActionResult<OpenRouterModel[]>> => {
  try {
    console.log('[@action:chat:getOpenRouterModels] Getting OpenRouter models');

    const result = await chatDb.getOpenRouterModels();

    if (!result.success) {
      console.error('[@action:chat:getOpenRouterModels] Error:', result.error);
      return { success: false, error: result.error };
    }

    console.log(
      `[@action:chat:getOpenRouterModels] Successfully fetched ${result.data?.length || 0} models`,
    );
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:chat:getOpenRouterModels] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch OpenRouter models' };
  }
});

/**
 * Sync OpenRouter models from API
 */
export async function syncOpenRouterModels(): Promise<ActionResult<{ count: number }>> {
  try {
    console.log('[@action:chat:syncOpenRouterModels] Syncing OpenRouter models');

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return { success: false, error: 'OpenRouter API key not configured' };
    }

    const openRouterClient = createOpenRouterClient(openrouterApiKey);
    const modelsResponse = await openRouterClient.getModels();

    if (!modelsResponse.success || !modelsResponse.data) {
      return {
        success: false,
        error: modelsResponse.error || 'Failed to fetch models from OpenRouter',
      };
    }

    // Transform API models to database format
    const dbModels = modelsResponse.data.map((model) => ({
      model_id: model.id,
      model_name: model.name,
      provider: model.id.split('/')[0] || 'unknown',
      provider_logo_url: null, // Could be enhanced to fetch provider logos
      context_length: model.context_length,
      input_cost_per_token: model.pricing.prompt,
      output_cost_per_token: model.pricing.completion,
      is_active: true,
      supports_streaming: true, // Most OpenRouter models support streaming
      description: model.description || null,
      model_metadata: {
        top_provider: model.top_provider,
        per_request_limits: model.per_request_limits,
      },
    }));

    const upsertResult = await chatDb.upsertOpenRouterModels(dbModels);

    if (!upsertResult.success) {
      return { success: false, error: upsertResult.error };
    }

    console.log(
      `[@action:chat:syncOpenRouterModels] Successfully synced ${dbModels.length} models`,
    );
    return { success: true, data: { count: dbModels.length } };
  } catch (error: any) {
    console.error('[@action:chat:syncOpenRouterModels] Error:', error);
    return { success: false, error: error.message || 'Failed to sync OpenRouter models' };
  }
}

/**
 * Delete expired conversations (run as cleanup job)
 */
export async function cleanupExpiredConversations(): Promise<ActionResult<{ count: number }>> {
  try {
    console.log('[@action:chat:cleanupExpiredConversations] Starting cleanup');

    const result = await chatDb.deleteExpiredConversations();

    if (!result.success) {
      console.error('[@action:chat:cleanupExpiredConversations] Error:', result.error);
      return { success: false, error: result.error };
    }

    // Revalidate chat page if conversations were deleted
    if (result.data && result.data.count > 0) {
      revalidatePath('/[locale]/[tenant]/chat', 'page');
    }

    console.log(
      `[@action:chat:cleanupExpiredConversations] Successfully deleted ${result.data?.count || 0} expired conversations`,
    );
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:chat:cleanupExpiredConversations] Error:', error);
    return { success: false, error: error.message || 'Failed to cleanup expired conversations' };
  }
}

/**
 * Check if the provided model IDs have any free models
 * Free models typically end with ":free" in OpenRouter
 */
export async function hasFreeModelsOnly(modelIds: string[]): Promise<ActionResult<boolean>> {
  try {
    console.log('[@action:chat:hasFreeModelsOnly] Checking if models are free:', modelIds);

    // Check if any model ends with ":free" or is in the known free models list
    const freeModelPatterns = [
      ':free',
      'mistralai/devstral-small:free',
      'nousresearch/deephermes-3-mistral-24b-preview:free',
      'mistralai/mistral-small-3.1-24b-instruct:free',
      'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
    ];

    const hasFreeModels = modelIds.some((modelId) =>
      freeModelPatterns.some((pattern) =>
        pattern.startsWith(':') ? modelId.endsWith(pattern) : modelId === pattern,
      ),
    );

    console.log(`[@action:chat:hasFreeModelsOnly] Has free models: ${hasFreeModels}`);
    return { success: true, data: hasFreeModels };
  } catch (error: any) {
    console.error('[@action:chat:hasFreeModelsOnly] Error:', error);
    return { success: false, error: error.message || 'Failed to check free models' };
  }
}
