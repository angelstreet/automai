export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          access_token: string | null;
          expires_at: number | null;
          id: string;
          id_token: string | null;
          provider: string;
          providerAccountId: string;
          refresh_token: string | null;
          scope: string | null;
          session_state: string | null;
          token_type: string | null;
          type: string;
          userId: string;
        };
        Insert: {
          access_token?: string | null;
          expires_at?: number | null;
          id?: string;
          id_token?: string | null;
          provider: string;
          providerAccountId: string;
          refresh_token?: string | null;
          scope?: string | null;
          session_state?: string | null;
          token_type?: string | null;
          type: string;
          userId: string;
        };
        Update: {
          access_token?: string | null;
          expires_at?: number | null;
          id?: string;
          id_token?: string | null;
          provider?: string;
          providerAccountId?: string;
          refresh_token?: string | null;
          scope?: string | null;
          session_state?: string | null;
          token_type?: string | null;
          type?: string;
          userId?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounts_userId_fkey';
            columns: ['userId'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      git_providers: {
        Row: {
          access_token: string | null;
          created_at: string | null;
          display_name: string | null;
          expires_at: string | null;
          id: string;
          is_configured: boolean | null;
          last_synced: string | null;
          name: string;
          profile_id: string;
          refresh_token: string | null;
          server_url: string | null;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          access_token?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          expires_at?: string | null;
          id?: string;
          is_configured?: boolean | null;
          last_synced?: string | null;
          name: string;
          profile_id: string;
          refresh_token?: string | null;
          server_url?: string | null;
          type: string;
          updated_at?: string | null;
        };
        Update: {
          access_token?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          expires_at?: string | null;
          id?: string;
          is_configured?: boolean | null;
          last_synced?: string | null;
          name?: string;
          profile_id?: string;
          refresh_token?: string | null;
          server_url?: string | null;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      hosts: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          ip: string;
          is_windows: boolean;
          name: string;
          password: string | null;
          port: number | null;
          status: string;
          type: string;
          updated_at: string;
          user: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          ip: string;
          is_windows?: boolean;
          name: string;
          password?: string | null;
          port?: number | null;
          status?: string;
          type: string;
          updated_at?: string;
          user?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          ip?: string;
          is_windows?: boolean;
          name?: string;
          password?: string | null;
          port?: number | null;
          status?: string;
          type?: string;
          updated_at?: string;
          user?: string | null;
        };
        Relationships: [];
      };
      repositories: {
        Row: {
          created_at: string | null;
          default_branch: string | null;
          description: string | null;
          error: string | null;
          id: string;
          is_private: boolean | null;
          language: string | null;
          last_synced_at: string | null;
          name: string;
          owner: string | null;
          provider_id: string;
          provider_type: string;
          sync_status: string | null;
          updated_at: string | null;
          url: string | null;
        };
        Insert: {
          created_at?: string | null;
          default_branch?: string | null;
          description?: string | null;
          error?: string | null;
          id?: string;
          is_private?: boolean | null;
          language?: string | null;
          last_synced_at?: string | null;
          name: string;
          owner?: string | null;
          provider_id: string;
          provider_type: string;
          sync_status?: string | null;
          updated_at?: string | null;
          url?: string | null;
        };
        Update: {
          created_at?: string | null;
          default_branch?: string | null;
          description?: string | null;
          error?: string | null;
          id?: string;
          is_private?: boolean | null;
          language?: string | null;
          last_synced_at?: string | null;
          name?: string;
          owner?: string | null;
          provider_id?: string;
          provider_type?: string;
          sync_status?: string | null;
          updated_at?: string | null;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'repositories_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'git_providers';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string;
          domain: string | null;
          id: string;
          name: string;
          plan: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          domain?: string | null;
          id?: string;
          name: string;
          plan?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          domain?: string | null;
          id?: string;
          name?: string;
          plan?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string;
          email: string | null;
          email_verified: string | null;
          id: string;
          image: string | null;
          name: string | null;
          password: string | null;
          provider: string | null;
          role: string;
          tenant_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          email_verified?: string | null;
          id?: string;
          image?: string | null;
          name?: string | null;
          password?: string | null;
          provider?: string | null;
          role?: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          email_verified?: string | null;
          id?: string;
          image?: string | null;
          name?: string | null;
          password?: string | null;
          provider?: string | null;
          role?: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      gtrgm_compress: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      gtrgm_decompress: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      gtrgm_in: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      gtrgm_options: {
        Args: {
          '': unknown;
        };
        Returns: undefined;
      };
      gtrgm_out: {
        Args: {
          '': unknown;
        };
        Returns: unknown;
      };
      set_limit: {
        Args: {
          '': number;
        };
        Returns: number;
      };
      show_limit: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      show_trgm: {
        Args: {
          '': string;
        };
        Returns: string[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
