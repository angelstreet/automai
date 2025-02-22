'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useUser } from '@/lib/contexts/UserContext';

export default function AuthRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useUser();
  const { locale } = useParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Read the token once
  const token = searchParams.get('token');

  useEffect(() => {
    // Prevent multiple redirects
    if (isRedirecting) return;

    // If there's no token, redirect to login
    if (!token) {
      router.replace(`/${locale}/login?error=No authentication token`);
      return;
    }

    const handleRedirect = async () => {
      setIsRedirecting(true);
      try {
        // Store the token
        localStorage.setItem('token', token);
        
        // Refresh user context
        await refreshUser();
        
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
        
        // Get updated user info after refresh
        const response = await fetch('http://localhost:5001/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const userData = await response.json();

        // Determine tenant ID based on user plan
        let tenantId;
        if (userData.tenantId) {
          // Enterprise users use their actual tenant ID
          tenantId = userData.tenantId;
        } else {
          // Trial and Pro users use fixed tenant IDs
          tenantId = userData.plan.toLowerCase();
        }

        // Redirect to the appropriate dashboard
        router.replace(`/${locale}/${tenantId}/dashboard`);
      } catch (error) {
        console.error('Error during redirect:', error);
        router.replace(`/${locale}/login?error=Failed to authenticate`);
      }
    };

    handleRedirect();
  }, [token, locale]); // Keep minimal dependencies

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-primary animate-pulse"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-2xl font-bold">Automai</span>
        </div>
        <h2 className="text-xl font-semibold">Setting up your workspace...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
} 