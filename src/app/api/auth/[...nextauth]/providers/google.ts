// Dynamically import the provider to reduce initial load time
export async function getGoogleProvider() {
  const GoogleProvider = (await import('next-auth/providers/google')).default;
  
  return GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
      params: {
        prompt: 'select_account',
      },
    },
  });
} 