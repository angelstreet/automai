'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { isFeatureEnabled, canCreateMore, getPlanFeatures } from '@/lib/features';
import { useSession } from 'next-auth/react';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
  plan: string;
};

type UserContextType = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isFeatureEnabled: (feature: string) => boolean;
  canCreateMore: (
    feature: 'maxProjects' | 'maxUseCases' | 'maxCampaigns',
    currentCount: number
  ) => boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      if (!session?.accessToken) {
        console.log('No access token available');
        setUser(null);
        return;
      }

      console.log('Fetching user profile with token:', session.accessToken ? 'present' : 'missing');
      const response = await fetch('http://localhost:5001/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Profile fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error
        });
        throw new Error(errorData.error || `Failed to fetch user profile: ${response.status}`);
      }

      const userData = await response.json();
      console.log('User profile fetched:', {
        id: userData.id,
        email: userData.email,
        plan: userData.plan,
        tenantId: userData.tenantId
      });
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error('Error in fetchUser:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUser();
    } else if (status === 'unauthenticated') {
      setUser(null);
      setIsLoading(false);
    }
  }, [status, session]);

  const checkFeature = (feature: string): boolean => {
    if (!user) return false;
    return isFeatureEnabled(user.plan, feature as keyof typeof getPlanFeatures);
  };

  const checkCanCreateMore = (
    feature: 'maxProjects' | 'maxUseCases' | 'maxCampaigns',
    currentCount: number
  ): boolean => {
    if (!user) return false;
    return canCreateMore(user.plan, feature, currentCount);
  };

  const logout = async () => {
    setUser(null);
  };

  const value = {
    user,
    isLoading: isLoading || status === 'loading',
    error,
    isFeatureEnabled: checkFeature,
    canCreateMore: checkCanCreateMore,
    logout,
    refreshUser: fetchUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 