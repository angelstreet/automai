/**
 * Chat database operations
 * Handles conversations, messages, and OpenRouter models with 3-day retention
 */

import { createClient } from '@/lib/supabase/server';
import type { DbResponse } from '@/lib/utils/commonUtils';
import type {
  ChatConversationsTable,
  ChatMessagesTable,
  OpenrouterModelsTable,
} from '@/types-new/db-chat';

export interface ChatConversation {
  id: string;
  title: string;
  summary: string | null;
  team_id: string;
  creator_id: string;
  tenant_id: string;
  last_message_at: string;
  model_ids: string[];
  is_active: boolean;
  message_count: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_id: string | null;
  model_name: string | null;
  provider: string | null;
  token_count: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  metadata: any;
  team_id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface OpenRouterModel {
  id: string;
  model_id: string;
  model_name: string;
  provider: string;
  provider_logo_url: string | null;
  context_length: number;
  input_cost_per_token: number;
  output_cost_per_token: number;
  is_active: boolean;
  supports_streaming: boolean;
  description: string | null;
  model_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface CreateConversationInput {
  title: string;
  summary?: string | null;
  team_id: string;
  creator_id: string;
  tenant_id: string;
  model_ids?: string[];
}

export interface CreateMessageInput {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_id?: string | null;
  model_name?: string | null;
  provider?: string | null;
  token_count?: number | null;
  response_time_ms?: number | null;
  error_message?: string | null;
  metadata?: any;
  team_id: string;
  creator_id: string;
}

export interface UpdateConversationInput {
  title?: string;
  summary?: string;
  last_message_at?: string;
  model_ids?: string[];
  is_active?: boolean;
  message_count?: number;
}

const chatDb = {
  /**
   * Get conversations for a team with optional pagination
   */
  async getConversations(
    teamId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<DbResponse<ChatConversation[]>> {
    try {
      console.log(`[@db:chatDb:getConversations] Getting conversations for team: ${teamId}`);
      const supabase = await createClient();

      let query = supabase
        .from('chat_conversations')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[@db:chatDb:getConversations] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      console.log(`[@db:chatDb:getConversations] Found ${data.length} conversations`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[@db:chatDb:getConversations] Error: ${error.message}`);
      return { success: false, error: error.message || 'Failed to get conversations' };
    }
  },

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string): Promise<DbResponse<ChatConversation>> {
    try {
      console.log(`[@db:chatDb:getConversationById] Getting conversation: ${conversationId}`);
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error(`[@db:chatDb:getConversationById] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      console.log(`[@db:chatDb:getConversationById] Found conversation: ${conversationId}`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[@db:chatDb:getConversationById] Error: ${error.message}`);
      return { success: false, error: error.message || 'Failed to get conversation' };
    }
  },

  /**
   * Create new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<DbResponse<ChatConversation>> {
    try {
      console.log(`[@db:chatDb:createConversation] Creating conversation: ${input.title}`);
      const supabase = await createClient();

      // Set expiration to 3 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      const conversationData: ChatConversationsTable['Insert'] = {
        title: input.title,
        summary: input.summary || null,
        team_id: input.team_id,
        creator_id: input.creator_id,
        tenant_id: input.tenant_id,
        last_message_at: new Date().toISOString(),
        model_ids: input.model_ids || [],
        is_active: true,
        message_count: 0,
        expires_at: expiresAt.toISOString(),
      };

      const { data, error } = await supabase
        .from('chat_conversations')
        .insert([conversationData])
        .select()
        .single();

      if (error) {
        console.error(`[@db:chatDb:createConversation] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      console.log(`[@db:chatDb:createConversation] Created conversation with ID: ${data.id}`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[@db:chatDb:createConversation] Error: ${error.message}`);
      return { success: false, error: error.message || 'Failed to create conversation' };
    }
  },

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    updates: UpdateConversationInput,
  ): Promise<DbResponse<ChatConversation>> {
    try {
      console.log(`[@db:chatDb:updateConversation] Updating conversation: ${conversationId}`);
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        console.error(`[@db:chatDb:updateConversation] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      console.log(`[@db:chatDb:updateConversation] Updated conversation: ${conversationId}`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[@db:chatDb:updateConversation] Error: ${error.message}`);
      return { success: false, error: error.message || 'Failed to update conversation' };
    }
  },

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<DbResponse<ChatMessage[]>> {
    try {
      console.log(`[@db:chatDb:getMessages] Getting messages for conversation: ${conversationId}`);
      const supabase = await createClient();

      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[@db:chatDb:getMessages] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      console.log(`[@db:chatDb:getMessages] Found ${data.length} messages`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[@db:chatDb:getMessages] Error: ${error.message}`);
      return { success: false, error: error.message || 'Failed to get messages' };
    }
  },

  /**
   * Create new message
   */
  async createMessage(input: CreateMessageInput): Promise<DbResponse<ChatMessage>> {
    try {
      console.log(
        `[@db:chatDb:createMessage] Creating message for conversation: ${input.conversation_id}`,
      );
      const supabase = await createClient();

      const messageData: ChatMessagesTable['Insert'] = {
        conversation_id: input.conversation_id,
        role: input.role,
        content: input.content,
        model_id: input.model_id || null,
        model_name: input.model_name || null,
        provider: input.provider || null,
        token_count: input.token_count || null,
        response_time_ms: input.response_time_ms || null,
        error_message: input.error_message || null,
        metadata: input.metadata || null,
        team_id: input.team_id,
        creator_id: input.creator_id,
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error(`[@db:chatDb:createMessage] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      // Update conversation's last_message_at and message_count
      await supabase
        .from('chat_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: supabase.raw('message_count + 1'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.conversation_id);

      console.log(`[@db:chatDb:createMessage] Created message with ID: ${data.id}`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[@db:chatDb:createMessage] Error: ${error.message}`);
      return { success: false, error: error.message || 'Failed to create message' };
    }
  },

  /**
   * Delete expired conversations (older than 3 days)
   */
  async deleteExpiredConversations(): Promise<DbResponse<{ count: number }>> {
    try {
      console.log(`[@db:chatDb:deleteExpiredConversations] Deleting expired conversations`);
      const supabase = await createClient();

      const now = new Date().toISOString();

      // First, delete messages from expired conversations
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .in(
          'conversation_id',
          supabase.from('chat_conversations').select('id').lt('expires_at', now),
        );

      if (messagesError) {
        console.error(
          `[@db:chatDb:deleteExpiredConversations] Error deleting messages: ${messagesError.message}`,
        );
        return { success: false, error: messagesError.message };
      }

      // Then delete the conversations
      const { data, error } = await supabase
        .from('chat_conversations')
        .delete()
        .lt('expires_at', now)
        .select('id');

      if (error) {
        console.error(
          `[@db:chatDb:deleteExpiredConversations] Error deleting conversations: ${error.message}`,
        );
        return { success: false, error: error.message };
      }

      const count = data?.length || 0;
      console.log(`[@db:chatDb:deleteExpiredConversations] Deleted ${count} expired conversations`);
      return { success: true, data: { count } };
    } catch (error: any) {
      console.error(`[@db:chatDb:deleteExpiredConversations] Error: ${error.message}`);
      return { success: false, error: error.message || 'Failed to delete expired conversations' };
    }
  },

  /**
   * Get OpenRouter models
   */
  async getOpenRouterModels(): Promise<DbResponse<OpenRouterModel[]>> {
    try {
      console.log(`[@db:chatDb:getOpenRouterModels] Getting OpenRouter models`);
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('openrouter_models')
        .select('*')
        .eq('is_active', true)
        .order('model_name', { ascending: true });

      if (error) {
        console.error(`[@db:chatDb:getOpenRouterModels] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      console.log(`[@db:chatDb:getOpenRouterModels] Found ${data.length} models`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[@db:chatDb:getOpenRouterModels] Error: ${error.message}`);
      return { success: false, error: error.message || 'Failed to get OpenRouter models' };
    }
  },

  /**
   * Upsert OpenRouter models (update existing or insert new)
   */
  async upsertOpenRouterModels(
    models: Omit<OpenRouterModel, 'id' | 'created_at' | 'updated_at'>[],
  ): Promise<DbResponse<OpenRouterModel[]>> {
    try {
      console.log(`[@db:chatDb:upsertOpenRouterModels] Upserting ${models.length} models`);
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('openrouter_models')
        .upsert(models, {
          onConflict: 'model_id',
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error(`[@db:chatDb:upsertOpenRouterModels] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      console.log(`[@db:chatDb:upsertOpenRouterModels] Upserted ${data.length} models`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[@db:chatDb:upsertOpenRouterModels] Error: ${error.message}`);
      return { success: false, error: error.message || 'Failed to upsert OpenRouter models' };
    }
  },
};

export default chatDb;
