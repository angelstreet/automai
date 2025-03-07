declare module 'next-auth' {
  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string;
    tenant_id?: string | null;
    tenant_name?: string | null;
  }

  interface Session {
    user: User;
    accessToken: string;
    expires: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string;
    tenant_id?: string | null;
    tenant_name?: string | null;
    accessToken: string;
  }
}

declare module 'next-auth/providers/credentials' {
  interface CredentialInput {
    value: string;
  }
}
