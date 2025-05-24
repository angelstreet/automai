/**
 * Chat database table definitions
 * Aligned with Supabase schema for OpenRouter chat functionality
 * Simplified schema - user-based only (no teams/tenants)
 */
import { BaseRow, Json } from './db-common';

/**
 * Chat conversations table schema
 * Stores conversation metadata with 3-day retention
 */
export interface ChatConversationsTable {
  Row: BaseRow & {
    title: string;
    summary: string | null;
    creator_id: string;
    last_message_at: string;
    model_ids: string[]; // Array of OpenRouter model IDs used in conversation
    is_active: boolean;
    message_count: number;
    expires_at: string; // For 3-day retention policy
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    title: string;
    summary?: string | null;
    creator_id?: string;
    last_message_at?: string;
    model_ids?: string[];
    is_active?: boolean;
    message_count?: number;
    expires_at?: string;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    title?: string;
    summary?: string | null;
    creator_id?: string;
    last_message_at?: string;
    model_ids?: string[];
    is_active?: boolean;
    message_count?: number;
    expires_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'chat_conversations_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * Chat messages table schema
 * Stores individual messages with OpenRouter model responses
 * Usage tracking: token_count for total, metadata.usage for breakdown
 */
export interface ChatMessagesTable {
  Row: BaseRow & {
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model_id: string | null; // OpenRouter model ID for assistant messages
    model_name: string | null; // Display name of the model
    provider: string | null; // OpenRouter provider (e.g., 'anthropic', 'openai')
    token_count: number | null; // Total tokens used (prompt + completion)
    response_time_ms: number | null; // Response time in milliseconds
    error_message: string | null; // Error if response failed
    metadata: Json | null; // Additional OpenRouter response metadata including usage breakdown
    creator_id: string;
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model_id?: string | null;
    model_name?: string | null;
    provider?: string | null;
    token_count?: number | null;
    response_time_ms?: number | null;
    error_message?: string | null;
    metadata?: Json | null;
    creator_id?: string;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    conversation_id?: string;
    role?: 'user' | 'assistant' | 'system';
    content?: string;
    model_id?: string | null;
    model_name?: string | null;
    provider?: string | null;
    token_count?: number | null;
    response_time_ms?: number | null;
    error_message?: string | null;
    metadata?: Json | null;
    creator_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'chat_messages_conversation_id_fkey';
      columns: ['conversation_id'];
      isOneToOne: false;
      referencedRelation: 'chat_conversations';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'chat_messages_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * OpenRouter models configuration table
 * Stores available models and their configurations
 */
export interface OpenrouterModelsTable {
  Row: BaseRow & {
    model_id: string; // OpenRouter model identifier
    model_name: string; // Display name
    provider: string; // Provider name (anthropic, openai, etc.)
    provider_logo_url: string | null; // URL to provider logo
    context_length: number;
    input_cost_per_token: number;
    output_cost_per_token: number;
    is_active: boolean;
    supports_streaming: boolean;
    description: string | null;
    model_metadata: Json | null; // Additional model information from OpenRouter
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    model_id: string;
    model_name: string;
    provider: string;
    provider_logo_url?: string | null;
    context_length: number;
    input_cost_per_token: number;
    output_cost_per_token: number;
    is_active?: boolean;
    supports_streaming?: boolean;
    description?: string | null;
    model_metadata?: Json | null;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    model_id?: string;
    model_name?: string;
    provider?: string;
    provider_logo_url?: string | null;
    context_length?: number;
    input_cost_per_token?: number;
    output_cost_per_token?: number;
    is_active?: boolean;
    supports_streaming?: boolean;
    description?: string | null;
    model_metadata?: Json | null;
  };
  Relationships: [];
}
