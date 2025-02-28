import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import { authConfig } from "./app/api/auth/[...nextauth]/auth.config";

// Import provider configurations
import { getGoogleProvider } from './app/api/auth/[...nextauth]/providers/google';
import { getGithubProvider } from './app/api/auth/[...nextauth]/providers/github';
import { getCredentialsProvider } from './app/api/auth/[...nextauth]/providers/credentials';

// Custom interfaces for type safety
interface CustomUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId: string;
  tenantName: string;
  accessToken?: string;
}

interface CustomToken extends JWT {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId: string;
  tenantName: string;
  accessToken?: string;
}

interface CustomSession extends Session {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    tenantId: string;
    tenantName: string;
  };
  accessToken?: string;
}

// Load providers with health checking
async function loadProviders() {
  try {
    const [googleProvider, githubProvider, credentialsProvider] = await Promise.all([
      getGoogleProvider().catch((err) => {
        console.error("Error loading Google provider:", err);
        return null;
      }),
      getGithubProvider().catch((err) => {
        console.error("Error loading GitHub provider:", err);
        return null;
      }),
      getCredentialsProvider().catch((err) => {
        console.error("Error loading Credentials provider:", err);
        return null;
      }),
    ]);
    
    const providers = [googleProvider, githubProvider, credentialsProvider].filter(
      (provider): provider is NonNullable<typeof provider> => !!provider
    );
    
    console.log(`Successfully loaded ${providers.length} providers`);
    
    if (providers.length === 0) {
      console.error("No authentication providers loaded successfully");
      throw new Error("Authentication provider initialization failed");
    }
    
    return providers;
  } catch (error) {
    console.error("Critical error loading providers:", error);
    throw error;
  }
}

// Lazy initialization with proper caching mechanism
let authHandler: any = null;

async function getAuthHandler() {
  if (!authHandler) {
    const providers = await loadProviders();
    const config = {
      ...authConfig,
      providers
    };
    authHandler = NextAuth(config);
  }
  return authHandler;
}

// Export the GET and POST handlers for Next.js API routes
export async function GET(req: Request, context: { params: { nextauth: string[] } }) {
  try {
    const handler = await getAuthHandler();
    // Wait for params to be ready and then add to the request
    const params = await context.params;
    const enhancedReq = Object.assign({}, req, {
      query: { nextauth: params.nextauth }
    });
    return handler(enhancedReq);
  } catch (error) {
    console.error("Authentication GET handler error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }), 
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

export async function POST(req: Request, context: { params: { nextauth: string[] } }) {
  try {
    const handler = await getAuthHandler();
    // Wait for params to be ready and then add to the request
    const params = await context.params;
    const enhancedReq = Object.assign({}, req, {
      query: { nextauth: params.nextauth }
    });
    return handler(enhancedReq);
  } catch (error) {
    console.error("Authentication POST handler error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }), 
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

// Export auth utilities with async initialization wrapper
// These are helper methods for use in other parts of the application
export async function auth(...args: any[]) {
  const handler = await getAuthHandler();
  return handler.auth?.(...args);
}

export async function signIn(...args: any[]) {
  const handler = await getAuthHandler();
  return handler.signIn?.(...args);
}

export async function signOut(...args: any[]) {
  const handler = await getAuthHandler();
  return handler.signOut?.(...args);
}