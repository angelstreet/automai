// Dynamically import the provider to reduce initial load time
export async function getCredentialsProvider() {
  const CredentialsProvider = (await import('next-auth/providers/credentials')).default;
  
  return CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Email and password are required');
      }

      try {
        const res = await fetch('http://localhost:5001/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        // Check if response is empty before parsing JSON
        const text = await res.text();
        if (!text) {
          console.error('Empty response from server');
          throw new Error('Empty response from authentication server');
        }

        // Safely parse JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse JSON response:', text);
          throw new Error('Invalid JSON response from authentication server');
        }

        if (!res.ok) {
          console.error('Login failed:', data);
          throw new Error(data.error || 'Failed to login');
        }

        if (!data.user || !data.token) {
          console.error('Invalid response:', data);
          throw new Error('Invalid response from authentication server');
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          tenantId: data.user.tenantId,
          tenantName: data.user.tenantName,
          plan: data.user.plan,
          accessToken: data.token,
        };
      } catch (error: any) {
        console.error('Auth error:', error);
        throw error;
      }
    },
  });
} 