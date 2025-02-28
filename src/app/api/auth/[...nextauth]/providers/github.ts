// Dynamically import the provider to reduce initial load time
export async function getGithubProvider() {
  const GithubProvider = (await import('next-auth/providers/github')).default;
  
  return GithubProvider({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  });
} 