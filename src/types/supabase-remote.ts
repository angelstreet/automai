export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
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
      connections: {
        Row: {
          createdAt: string;
          host: string;
          id: string;
          name: string;
          password: string | null;
          port: number;
          privateKey: string | null;
          tenantId: string | null;
          updatedAt: string;
          userId: string;
          username: string;
        };
        Insert: {
          createdAt?: string;
          host: string;
          id?: string;
          name: string;
          password?: string | null;
          port?: number;
          privateKey?: string | null;
          tenantId?: string | null;
          updatedAt?: string;
          userId: string;
          username: string;
        };
        Update: {
          createdAt?: string;
          host?: string;
          id?: string;
          name?: string;
          password?: string | null;
          port?: number;
          privateKey?: string | null;
          tenantId?: string | null;
          updatedAt?: string;
          userId?: string;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'connections_tenantId_fkey';
            columns: ['tenantId'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'connections_userId_fkey';
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
          created_at: string;
          display_name: string | null;
          expires_at: string | null;
          id: string;
          name: string;
          refresh_token: string | null;
          server_url: string | null;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token?: string | null;
          created_at?: string;
          display_name?: string | null;
          expires_at?: string | null;
          id?: string;
          name: string;
          refresh_token?: string | null;
          server_url?: string | null;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string | null;
          created_at?: string;
          display_name?: string | null;
          expires_at?: string | null;
          id?: string;
          name?: string;
          refresh_token?: string | null;
          server_url?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "git_providers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
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
          private_key: string | null;
          status: string;
          tenant_id: string | null;
          type: string;
          updated_at: string;
          user_id: string;
          username: string | null;
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
          private_key?: string | null;
          status?: string;
          tenant_id?: string | null;
          type: string;
          updated_at?: string;
          user_id: string;
          username?: string | null;
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
          private_key?: string | null;
          status?: string;
          tenant_id?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hosts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hosts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      repositories: {
        Row: {
          created_at: string;
          default_branch: string | null;
          description: string | null;
          id: string;
          last_synced_at: string | null;
          name: string;
          provider_id: string;
          sync_status: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          created_at?: string;
          default_branch?: string | null;
          description?: string | null;
          id?: string;
          last_synced_at?: string | null;
          name: string;
          provider_id: string;
          sync_status?: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          default_branch?: string | null;
          description?: string | null;
          id?: string;
          last_synced_at?: string | null;
          name?: string;
          provider_id?: string;
          sync_status?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "repositories_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "git_providers";
            referencedColumns: ["id"];
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
          user_role: string;
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
          user_role?: string;
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
          user_role?: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      verificationtokens: {
        Row: {
          expires: string;
          identifier: string;
          token: string;
        };
        Insert: {
          expires: string;
          identifier: string;
          token: string;
        };
        Update: {
          expires?: string;
          identifier?: string;
          token?: string;
        };
        Relationships: [];
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
