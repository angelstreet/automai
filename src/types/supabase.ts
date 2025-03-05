export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          provider: string
          providerAccountId: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          userId: string
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          userId: string
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          createdAt: string
          host: string
          id: string
          name: string
          password: string | null
          port: number
          privateKey: string | null
          tenantId: string | null
          updatedAt: string
          userId: string
          username: string
        }
        Insert: {
          createdAt?: string
          host: string
          id?: string
          name: string
          password?: string | null
          port?: number
          privateKey?: string | null
          tenantId?: string | null
          updatedAt?: string
          userId: string
          username: string
        }
        Update: {
          createdAt?: string
          host?: string
          id?: string
          name?: string
          password?: string | null
          port?: number
          privateKey?: string | null
          tenantId?: string | null
          updatedAt?: string
          userId?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      git_providers: {
        Row: {
          accessToken: string | null
          createdAt: string
          displayName: string | null
          expiresAt: string | null
          id: string
          name: string
          refreshToken: string | null
          serverUrl: string | null
          type: string
          updatedAt: string
          userId: string
        }
        Insert: {
          accessToken?: string | null
          createdAt?: string
          displayName?: string | null
          expiresAt?: string | null
          id?: string
          name: string
          refreshToken?: string | null
          serverUrl?: string | null
          type: string
          updatedAt?: string
          userId: string
        }
        Update: {
          accessToken?: string | null
          createdAt?: string
          displayName?: string | null
          expiresAt?: string | null
          id?: string
          name?: string
          refreshToken?: string | null
          serverUrl?: string | null
          type?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      hosts: {
        Row: {
          createdAt: string
          description: string | null
          id: string
          ip: string
          is_windows: boolean
          name: string
          password: string | null
          port: number | null
          status: string
          type: string
          updatedAt: string
          user: string | null
        }
        Insert: {
          createdAt?: string
          description?: string | null
          id?: string
          ip: string
          is_windows?: boolean
          name: string
          password?: string | null
          port?: number | null
          status?: string
          type: string
          updatedAt?: string
          user?: string | null
        }
        Update: {
          createdAt?: string
          description?: string | null
          id?: string
          ip?: string
          is_windows?: boolean
          name?: string
          password?: string | null
          port?: number | null
          status?: string
          type?: string
          updatedAt?: string
          user?: string | null
        }
        Relationships: []
      }
      repositories: {
        Row: {
          createdAt: string
          defaultBranch: string | null
          description: string | null
          id: string
          lastSyncedAt: string | null
          name: string
          providerId: string
          syncStatus: string
          updatedAt: string
          url: string | null
        }
        Insert: {
          createdAt?: string
          defaultBranch?: string | null
          description?: string | null
          id?: string
          lastSyncedAt?: string | null
          name: string
          providerId: string
          syncStatus?: string
          updatedAt?: string
          url?: string | null
        }
        Update: {
          createdAt?: string
          defaultBranch?: string | null
          description?: string | null
          id?: string
          lastSyncedAt?: string | null
          name?: string
          providerId?: string
          syncStatus?: string
          updatedAt?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repositories_providerId_fkey"
            columns: ["providerId"]
            isOneToOne: false
            referencedRelation: "git_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          createdAt: string
          domain: string | null
          id: string
          name: string
          plan: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          domain?: string | null
          id?: string
          name: string
          plan?: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          domain?: string | null
          id?: string
          name?: string
          plan?: string
          updatedAt?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          createdAt: string
          email: string | null
          emailVerified: string | null
          id: string
          image: string | null
          name: string | null
          password: string | null
          provider: string | null
          role: string
          tenantId: string | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
          password?: string | null
          provider?: string | null
          role?: string
          tenantId?: string | null
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
          password?: string | null
          provider?: string | null
          role?: string
          tenantId?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      verificationtokens: {
        Row: {
          expires: string
          identifier: string
          token: string
        }
        Insert: {
          expires: string
          identifier: string
          token: string
        }
        Update: {
          expires?: string
          identifier?: string
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

