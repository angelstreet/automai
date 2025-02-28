import { NextRequest } from 'next/server';

// Use dynamic imports to reduce initial load time
async function getHandler() {
  try {
    console.log('Initializing NextAuth handler...');
    const [NextAuth, { authConfig, getProviders }] = await Promise.all([
      import('next-auth').then(mod => mod.default),
      import('./auth.config')
    ]);
    
    console.log('Loading providers...');
    // Get providers dynamically
    const providers = await getProviders();
    console.log('Providers loaded successfully');
    
    // Create a new config with the dynamically loaded providers
    const config = {
      ...authConfig,
      providers
    };
    
    console.log('Creating NextAuth handler...');
    return NextAuth(config);
  } catch (error) {
    console.error('Error initializing NextAuth:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

export async function GET(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  try {
    console.log('NextAuth GET request received', params);
    const handler = await getHandler();
    console.log('NextAuth GET handler created, processing request');
    
    // Create a modified request with the params
    const url = new URL(req.url);
    url.pathname = `/api/auth/${params.nextauth.join('/')}`;
    const modifiedReq = new Request(url, {
      headers: req.headers,
      method: req.method,
      body: req.body,
      cache: req.cache,
      credentials: req.credentials,
      integrity: req.integrity,
      keepalive: req.keepalive,
      mode: req.mode,
      redirect: req.redirect,
      referrer: req.referrer,
      referrerPolicy: req.referrerPolicy,
      signal: req.signal,
    });
    
    return handler(modifiedReq);
  } catch (error) {
    console.error('NextAuth GET error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return new Response(JSON.stringify({ error: 'Authentication service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  try {
    console.log('NextAuth POST request received', params);
    const handler = await getHandler();
    console.log('NextAuth POST handler created, processing request');
    
    // Create a modified request with the params
    const url = new URL(req.url);
    url.pathname = `/api/auth/${params.nextauth.join('/')}`;
    const modifiedReq = new Request(url, {
      headers: req.headers,
      method: req.method,
      body: req.body,
      cache: req.cache,
      credentials: req.credentials,
      integrity: req.integrity,
      keepalive: req.keepalive,
      mode: req.mode,
      redirect: req.redirect,
      referrer: req.referrer,
      referrerPolicy: req.referrerPolicy,
      signal: req.signal,
    });
    
    return handler(modifiedReq);
  } catch (error) {
    console.error('NextAuth POST error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return new Response(JSON.stringify({ error: 'Authentication service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
