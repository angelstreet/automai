import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import type { NextAuthConfig } from "next-auth"

// Import provider configurations
import { getGoogleProvider } from './app/api/auth/[...nextauth]/providers/google'
import { getGithubProvider } from './app/api/auth/[...nextauth]/providers/github'
import { getCredentialsProvider } from './app/api/auth/[...nextauth]/providers/credentials'

// Load providers dynamically
async function loadProviders() {
  try {
    // Load each provider with error handling
    const [googleProvider, githubProvider, credentialsProvider] = await Promise.all([
      getGoogleProvider().catch(err => {
        console.error('Error loading Google provider:', err)
        return null
      }),
      getGithubProvider().catch(err => {
        console.error('Error loading GitHub provider:', err)
        return null
      }),
      getCredentialsProvider().catch(err => {
        console.error('Error loading Credentials provider:', err)
        return null
      })
    ])
    
    // Filter out any providers that failed to load
    const providers = [googleProvider, githubProvider, credentialsProvider].filter(Boolean)
    console.log(`Successfully loaded ${providers.length} providers`)
    
    if (providers.length === 0) {
      console.warn('No authentication providers loaded')
      return []
    }
    
    return providers
  } catch (error) {
    console.error('Error loading providers:', error)
    return []
  }
}

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: '/login',
    error: '/error',
    signOut: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-do-not-use-in-production',
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenantName = user.tenantName
        token.accessToken = user.accessToken || account?.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user = session.user || {}
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.tenantName = token.tenantName as string
      }
      session.accessToken = token.accessToken as string
      return session
    },
  },
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig

// Avoid top-level await - initialize with empty providers
// and initialize them later in the handler
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [],
})

// Dynamic provider loading at runtime
// This will update the handler's providers when first called
let providersLoaded = false
const originalAuth = auth

export const handler = async (req: Request) => {
  if (!providersLoaded) {
    const providers = await loadProviders()
    // @ts-ignore - Update the internal providers list
    auth.providers = providers
    providersLoaded = true
  }
  return originalAuth(req)
} 