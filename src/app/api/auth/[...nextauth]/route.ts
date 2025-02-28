import { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Initialize providers once
let authHandler: any = null;

async function getAuthHandler() {
  if (!authHandler) {
    try {
      console.log('Loading providers...');
      const { getProviders } = await import('./auth.config');
      const providers = await getProviders();
      console.log(`Successfully loaded ${providers.length} providers`);
      
      // Create the handler with the loaded providers
      authHandler = NextAuth({
        ...authConfig,
        providers
      });
    } catch (error) {
      console.error('Error initializing NextAuth:', error);
      throw error;
    }
  }
  return authHandler;
}

export async function GET(req: NextRequest) {
  try {
    const handler = await getAuthHandler();
    return await handler(req);
  } catch (error) {
    console.error('NextAuth GET error:', error);
    return new Response(JSON.stringify({ error: 'Authentication service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const handler = await getAuthHandler();
    return await handler(req);
  } catch (error) {
    console.error('NextAuth POST error:', error);
    return new Response(JSON.stringify({ error: 'Authentication service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
