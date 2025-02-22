import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      tenantId?: string | null
      plan?: 'TRIAL' | 'PRO' | 'ENTERPRISE'
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role?: string
    tenantId?: string | null
    plan?: 'TRIAL' | 'PRO' | 'ENTERPRISE'
    accessToken?: string
  }
} 