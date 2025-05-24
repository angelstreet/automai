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

      // Get current user for authentication
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await chatDb.getConversations(options);

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
  input: Omit<CreateConversationInput, never>, // No fields to omit anymore
): Promise<ActionResult<ChatConversation>> {
  try {
    console.log(`[@action:chat:createConversation] Creating conversation: ${input.title}`);

    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await chatDb.createConversation(input);

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
    conversation?: ChatConversation;
    userMessage?: ChatMessage;
    aiMessages: Array<{
      modelId: string;
      content: string;
      metadata?: any;
      error?: string;
      responseTime: number;
    }>;
    conversationId: string;
  }>
> {
  try {
    console.log('[@action:chat:sendMessage] Starting to send message');

    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get OpenRouter API key from environment variables
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return { success: false, error: 'OpenRouter API key not configured' };
    }

    const openRouterClient = createOpenRouterClient(openrouterApiKey);

    let conversation: ChatConversation | undefined;
    let existingMessages: ChatMessage[] = [];

    // If conversation exists, get it and its messages for context
    if (input.conversationId) {
      const getResult = await chatDb.getConversationById(input.conversationId);
      if (!getResult.success || !getResult.data) {
        return { success: false, error: getResult.error || 'Conversation not found' };
      }
      conversation = getResult.data;

      // Get existing messages for context
      const messagesResult = await chatDb.getMessages(conversation.id);
      existingMessages = messagesResult.success ? messagesResult.data || [] : [];
    }

    // Prepare messages for OpenRouter (existing + new user message)
    const allMessages = [
      ...existingMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: input.content,
      },
    ];

    const aiResponses: Array<{
      modelId: string;
      content: string;
      metadata?: any;
      error?: string;
      responseTime: number;
    }> = [];

    // Send to each selected model and collect responses
    for (const modelId of input.modelIds) {
      try {
        const startTime = Date.now();
        console.log(`[@action:chat:sendMessage] Sending to model: ${modelId}`);

        const response = await openRouterClient.createChatCompletion({
          model: modelId,
          messages: allMessages,
          max_tokens: 2000,
          temperature: 0.7,
        });

        const responseTime = Date.now() - startTime;

        if (response.success && response.data) {
          const aiContent = response.data.choices[0]?.message?.content || 'No response generated';

          aiResponses.push({
            modelId,
            content: aiContent,
            metadata: {
              usage: response.data.usage,
              finish_reason: response.data.choices[0]?.finish_reason,
              model_name: response.data.model,
            },
            responseTime,
          });

          console.log(`[@action:chat:sendMessage] Got successful response from ${modelId}`);
        } else {
          aiResponses.push({
            modelId,
            content: 'Sorry, I encountered an error while processing your message.',
            error: response.error || 'Unknown error',
            responseTime,
          });

          console.error(`[@action:chat:sendMessage] Error from model ${modelId}:`, response.error);
        }
      } catch (modelError: any) {
        console.error(`[@action:chat:sendMessage] Exception with model ${modelId}:`, modelError);

        aiResponses.push({
          modelId,
          content: 'Sorry, I encountered an error while processing your message.',
          error: modelError.message || 'Unknown error',
          responseTime: 0,
        });
      }
    }

    // Check if we got any responses (successful or error)
    if (aiResponses.length === 0) {
      return { success: false, error: 'No responses received from any models' };
    }

    // Return responses immediately for display
    // The database saving will happen in the background via a separate action
    const conversationId = input.conversationId || 'temp-' + Date.now();

    console.log(
      `[@action:chat:sendMessage] Returning ${aiResponses.length} AI responses for immediate display`,
    );

    // Start background saving (don't await it)
    saveMessageToDatabase({
      conversation,
      input,
      aiResponses,
    }).catch((error) => {
      console.error('[@action:chat:sendMessage] Background save error:', error);
    });

    return {
      success: true,
      data: {
        conversation,
        aiMessages: aiResponses,
        conversationId,
      },
    };
  } catch (error: any) {
    console.error('[@action:chat:sendMessage] Error:', error);
    return { success: false, error: error.message || 'Failed to send message' };
  }
}

/**
 * Save message to database (background operation)
 */
async function saveMessageToDatabase({
  conversation,
  input,
  aiResponses,
}: {
  conversation?: ChatConversation;
  input: SendMessageInput;
  aiResponses: Array<{
    modelId: string;
    content: string;
    metadata?: any;
    error?: string;
    responseTime: number;
  }>;
}) {
  try {
    console.log('[@action:chat:saveMessageToDatabase] Starting background save');

    let finalConversation = conversation;

    // Create conversation if it doesn't exist
    if (!input.conversationId || !conversation) {
      const title = input.conversationTitle || `Chat ${new Date().toLocaleDateString()}`;
      const createResult = await chatDb.createConversation({
        title,
        model_ids: input.modelIds,
      });

      if (!createResult.success || !createResult.data) {
        throw new Error(createResult.error || 'Failed to create conversation');
      }

      finalConversation = createResult.data;
      console.log(
        `[@action:chat:saveMessageToDatabase] Created new conversation: ${finalConversation.id}`,
      );
    }

    if (!finalConversation) {
      throw new Error('No conversation available for saving');
    }

    // Create user message
    const userMessageInput: CreateMessageInput = {
      conversation_id: finalConversation.id,
      role: 'user',
      content: input.content,
    };

    const userMessageResult = await chatDb.createMessage(userMessageInput);
    if (!userMessageResult.success || !userMessageResult.data) {
      throw new Error(userMessageResult.error || 'Failed to create user message');
    }

    console.log(
      `[@action:chat:saveMessageToDatabase] Created user message: ${userMessageResult.data.id}`,
    );

    // Create AI messages
    for (const response of aiResponses) {
      const aiMessageInput: CreateMessageInput = {
        conversation_id: finalConversation.id,
        role: 'assistant',
        content: response.content,
        model_id: response.modelId,
        model_name: response.metadata?.model_name || response.modelId,
        provider: 'openrouter',
        token_count: response.metadata?.usage?.total_tokens || null,
        response_time_ms: response.responseTime,
        error_message: response.error || null,
        metadata: response.metadata || null,
      };

      const aiMessageResult = await chatDb.createMessage(aiMessageInput);
      if (aiMessageResult.success && aiMessageResult.data) {
        console.log(
          `[@action:chat:saveMessageToDatabase] Created AI message: ${aiMessageResult.data.id}`,
        );
      }
    }

    // Update conversation's model_ids if needed
    const updatedModelIds = Array.from(
      new Set([...finalConversation.model_ids, ...input.modelIds]),
    );
    if (updatedModelIds.length !== finalConversation.model_ids.length) {
      await chatDb.updateConversation(finalConversation.id, {
        model_ids: updatedModelIds,
      });
      console.log(`[@action:chat:saveMessageToDatabase] Updated conversation model_ids`);
    }

    // Revalidate chat page
    revalidatePath('/[locale]/[tenant]/chat', 'page');

    console.log('[@action:chat:saveMessageToDatabase] Successfully completed background save');
  } catch (error: any) {
    console.error('[@action:chat:saveMessageToDatabase] Error:', error);
    // Don't throw here since this is background operation
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
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  conversationId: string,
): Promise<ActionResult<{ count: number }>> {
  try {
    console.log(`[@action:chat:deleteConversation] Deleting conversation: ${conversationId}`);

    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await chatDb.deleteConversation(conversationId);

    if (!result.success) {
      console.error('[@action:chat:deleteConversation] Error:', result.error);
      return { success: false, error: result.error };
    }

    // Revalidate chat page
    revalidatePath('/[locale]/[tenant]/chat', 'page');

    console.log(
      `[@action:chat:deleteConversation] Successfully deleted conversation: ${conversationId}`,
    );
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:chat:deleteConversation] Error:', error);
    return { success: false, error: error.message || 'Failed to delete conversation' };
  }
}

/**
 * Delete a specific message
 */
export async function deleteMessage(
  messageId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    console.log(`[@action:chat:deleteMessage] Deleting message: ${messageId}`);

    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await chatDb.deleteMessage(messageId);

    if (!result.success) {
      console.error('[@action:chat:deleteMessage] Error:', result.error);
      return { success: false, error: result.error };
    }

    // Revalidate chat page
    revalidatePath('/[locale]/[tenant]/chat', 'page');

    console.log(`[@action:chat:deleteMessage] Successfully deleted message: ${messageId}`);
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:chat:deleteMessage] Error:', error);
    return { success: false, error: error.message || 'Failed to delete message' };
  }
}

/**
 * Clear all messages in a conversation (keep conversation but delete messages)
 */
export async function clearConversationMessages(
  conversationId: string,
): Promise<ActionResult<{ count: number }>> {
  try {
    console.log(
      `[@action:chat:clearConversationMessages] Clearing messages for: ${conversationId}`,
    );

    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await chatDb.clearConversationMessages(conversationId);

    if (!result.success) {
      console.error('[@action:chat:clearConversationMessages] Error:', result.error);
      return { success: false, error: result.error };
    }

    // Revalidate chat page
    revalidatePath('/[locale]/[tenant]/chat', 'page');

    console.log(
      `[@action:chat:clearConversationMessages] Successfully cleared ${result.data?.count || 0} messages`,
    );
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:chat:clearConversationMessages] Error:', error);
    return { success: false, error: error.message || 'Failed to clear conversation messages' };
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
