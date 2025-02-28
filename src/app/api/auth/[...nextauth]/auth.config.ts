import { AuthOptions } from 'next-auth';

// Import provider configurations from separate files
import { getGoogleProvider } from './providers/google';
import { getGithubProvider } from './providers/github';
import { getCredentialsProvider } from './providers/credentials';

// Create a simpler version of the auth config
export const authConfig: AuthOptions = {
  providers: [],
  pages: {
    signIn: '/login',
    error: '/error',
    signOut: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.accessToken = user.accessToken || account?.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

// Dynamically load providers when needed
export async function getProviders() {
  try {
    console.log('Loading auth providers...');
    
    // Load each provider with error handling
    const googleProvider = await getGoogleProvider().catch(err => {
      console.error('Error loading Google provider:', err);
      return null;
    });
    
    const githubProvider = await getGithubProvider().catch(err => {
      console.error('Error loading GitHub provider:', err);
      return null;
    });
    
    const credentialsProvider = await getCredentialsProvider().catch(err => {
      console.error('Error loading Credentials provider:', err);
      return null;
    });
    
    // Filter out any providers that failed to load
    const providers = [googleProvider, githubProvider, credentialsProvider].filter(Boolean);
    
    console.log(`Successfully loaded ${providers.length} providers`);
    return providers;
  } catch (error) {
    console.error('Error loading providers:', error);
    // Return empty array instead of throwing to prevent complete auth failure
    return [];
  }
}
