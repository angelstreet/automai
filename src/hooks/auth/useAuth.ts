'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

import { signOut } from '@/app/actions/authAction';

// Generate a unique ID for each hook instance
let hookInstanceCounter = 0;

/**
 * Hook for handling authentication operations
 *
 * @param componentName Optional component name for debugging
 */
export function useAuth(componentName = 'unknown') {
  const router = useRouter();
  const params = useParams();
  const isMounted = useRef(false);
  const instanceId = useRef(++hookInstanceCounter);

  // Log on first render
  useEffect(() => {
    const currentInstanceId = instanceId.current;

    if (!isMounted.current) {
      console.log(
        `[@hook:useAuth:useAuth] Hook mounted #${currentInstanceId} in component: ${componentName}`,
      );
      isMounted.current = true;
    }

    return () => {
      console.log(
        `[@hook:useAuth:useAuth] Hook unmounted #${currentInstanceId} from component: ${componentName}`,
      );
    };
  }, [componentName]);

  // Log hook access in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[@hook:useAuth:useAuth] Hook accessed in component: ${componentName}`);
  }

  // Sign out mutation
  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: async () => {
      console.log(`[@hook:useAuth:logout] #${instanceId.current} Logging out user`);

      // Get locale from params or default to 'en'
      const locale = (params.locale as string) || 'en';

      // Create a FormData object to pass locale to signOut action
      const formData = new FormData();
      formData.append('locale', locale);

      return signOut(formData);
    },
    onSuccess: (result) => {
      console.log(
        `[@hook:useAuth:logout] #${instanceId.current} Logout successful, redirecting to ${result.redirectUrl}`,
      );

      // Clear any local storage data related to user
      try {
        localStorage.removeItem('cached_user');
        localStorage.removeItem('user_cache_timestamp');

        // Clear any avatar URL caches
        const localStorageKeys = Object.keys(localStorage);
        const avatarKeys = localStorageKeys.filter((key) => key.startsWith('avatar_'));
        avatarKeys.forEach((key) => localStorage.removeItem(key));
      } catch (e) {
        console.warn(
          `[@hook:useAuth:logout] #${instanceId.current} Error clearing local storage`,
          e,
        );
      }

      // Redirect to the URL provided by the server
      if (result.redirectUrl) {
        router.push(result.redirectUrl);
      }
    },
    onError: (error) => {
      console.error(`[@hook:useAuth:logout] #${instanceId.current} Logout failed:`, error);

      // Fallback redirect to login page on error
      const locale = (params.locale as string) || 'en';
      router.push(`/${locale}/login?error=logout_failed`);
    },
  });

  return {
    // Auth operations
    logout,

    // Operation states
    isLoggingOut,
  };
}
