/**
 * Authentication Configuration
 * Configuration for authentication and authorization
 */

/**
 * Auth provider types
 */
export enum AuthProviderType {
  PASSWORD = 'password',
  GITHUB = 'github',
  GOOGLE = 'google',
  GITLAB = 'gitlab',
}

/**
 * Auth provider configuration
 */
export interface AuthProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  scope?: string[];
  callbackUrl?: string;
}

/**
 * Authentication configuration
 */
export const AUTH_CONFIG = {
  providers: {
    [AuthProviderType.PASSWORD]: {
      enabled: true,
    },
    [AuthProviderType.GITHUB]: {
      enabled: true,
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scope: ['user:email', 'read:user', 'repo'],
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/github`,
    },
    [AuthProviderType.GOOGLE]: {
      enabled: true,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scope: ['email', 'profile'],
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
    },
    [AuthProviderType.GITLAB]: {
      enabled: false,
      clientId: process.env.GITLAB_CLIENT_ID,
      clientSecret: process.env.GITLAB_CLIENT_SECRET,
      scope: ['read_user', 'profile', 'email'],
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/gitlab`,
    },
  },

  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // JWT configuration
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Password validation rules
  password: {
    minLength: 8,
    requireCapital: true,
    requireNumber: true,
    requireSpecialChar: true,
  },

  // Authentication pages
  pages: {
    signIn: '/login',
    signUp: '/signup',
    error: '/error',
    verifyRequest: '/verify-request',
    newUser: '/new-user',
  },

  // User roles and permissions
  roles: {
    ADMIN: 'admin',
    USER: 'user',
    VIEWER: 'viewer',
  },

  // Default role for new users
  defaultRole: 'user',
};

/**
 * Get enabled auth providers
 */
export function getEnabledProviders(): AuthProviderType[] {
  return Object.keys(AUTH_CONFIG.providers)
    .filter((key) => AUTH_CONFIG.providers[key as AuthProviderType].enabled)
    .map((key) => key as AuthProviderType);
}

/**
 * Validate password against rules
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  const { minLength, requireCapital, requireNumber, requireSpecialChar } = AUTH_CONFIG.password;

  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters`,
    };
  }

  if (requireCapital && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one capital letter',
    };
  }

  if (requireNumber && !/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }

  if (requireSpecialChar && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character',
    };
  }

  return { valid: true };
}

// Export auth configuration
const authConfig = {
  AUTH_CONFIG,
  AuthProviderType,
  getEnabledProviders,
  validatePassword,
};

export default authConfig;
