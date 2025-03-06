'use client';

import { Chrome, Github } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import * as React from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import supabaseAuth from '@/lib/supabase-auth';

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useParams();
  const t = useTranslations('Auth');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    // Check for existing Supabase session with retry logic
    let checkAttempts = 0;
    const maxAttempts = 3;
    
    async function checkSession() {
      try {
        console.log('Login page - Checking for existing session...');
        const { data } = await supabaseAuth.getSession();
        
        if (data.session) {
          console.log('Login page - Session found, redirecting to dashboard:', {
            userId: data.session.user.id,
            email: data.session.user.email,
            tokenExpiry: data.session.expires_at 
              ? new Date(data.session.expires_at * 1000).toISOString() 
              : 'unknown'
          });
          
          // User is already logged in, redirect to dashboard
          // Use replace instead of push to avoid having the login page in history
          setTimeout(() => {
            router.replace(`/${locale}/trial/dashboard`);
          }, 100); // Small delay to ensure proper redirection
        } else {
          console.log('Login page - No session found, showing login form');
          setIsLoading(false);
          
          if (checkAttempts < maxAttempts) {
            // Retry after a delay with exponential backoff
            checkAttempts++;
            const delay = 1000 * Math.pow(2, checkAttempts);
            console.log(`Login page - Will retry session check in ${delay}ms (attempt ${checkAttempts})`);
            
            setTimeout(checkSession, delay);
          }
        }
      } catch (error) {
        console.error('Login page - Error checking session:', error);
        setIsLoading(false);
      }
    }
    
    checkSession();
    
    // Also listen for auth state changes
    const { data: authListener } = supabaseAuth.onAuthStateChange((event, session) => {
      console.log('Login page - Auth state changed:', { event, hasSession: !!session });
      
      if (session) {
        // User signed in, redirect to dashboard
        router.replace(`/${locale}/trial/dashboard`);
      }
    });
    
    return () => {
      // Cleanup listener on unmount
      authListener?.subscription.unsubscribe();
    };
  }, [router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      console.log('Login page - Attempting sign in with password...');
      
      // Use Supabase authentication
      const { data, error } = await supabaseAuth.signInWithPassword(email, password);
      
      if (error) {
        console.error('Login page - Sign in error:', error);
        setError(error.message);
        return;
      }
      
      if (data?.session) {
        console.log('Login page - Sign in successful:', {
          userId: data.session.user.id,
          email: data.session.user.email
        });
        
        // Login successful, redirect to dashboard
        // Wait briefly to ensure the session is properly set
        setTimeout(() => {
          // Use replace to avoid having login in history
          router.replace(`/${locale}/trial/dashboard`);
        }, 500);
      } else {
        console.error('Login page - No session returned after successful login');
        setError('Authentication successful but no session was created');
      }
    } catch (err: any) {
      console.error('Login page - Error during login:', err);
      setError(err.message || 'An error occurred during login');
      setIsSubmitting(false);
    }
    // Don't set isSubmitting to false if successful, as we're redirecting
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setError('');
    setIsSubmitting(true);
    
    try {
      // Use Supabase OAuth
      console.log(`Starting ${provider} OAuth login flow`);
      const { data, error } = await supabaseAuth.signInWithOAuth(provider);
      
      if (error) {
        console.error(`${provider} OAuth error:`, error);
        setError(error.message || `Failed to authenticate with ${provider}`);
        setIsSubmitting(false);
        return;
      }
      
      // If we reach here, it means the OAuth popup was successfully launched
      console.log(`${provider} OAuth flow initiated:`, { 
        provider,
        url: data?.url,
        hasUrl: !!data?.url 
      });
      
      // No need to set isSubmitting to false as we're redirecting to provider
    } catch (err: any) {
      console.error(`${provider} OAuth error:`, err);
      setError(err.message || `An unexpected error occurred with ${provider} sign in`);
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-8 left-8">
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-primary"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-2xl font-bold text-primary">Automai</span>
        </div>
      </div>

      <div className="w-full max-w-[400px] p-4 sm:p-0 space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('loginTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('loginDescription')}</p>
        </div>

        <div className="grid gap-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Input
                  id="email"
                  placeholder={t('emailPlaceholder')}
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="grid gap-1">
                <Input
                  id="password"
                  placeholder={t('passwordPlaceholder')}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              {error && (
                <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {error}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
              {isSubmitting ? t('loggingIn') : t('loginButton')}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => handleOAuthLogin('google')} className="h-11">
              <Chrome className="mr-2 h-5 w-5" />
              Google
            </Button>
            <Button variant="outline" onClick={() => handleOAuthLogin('github')} className="h-11">
              <Github className="mr-2 h-5 w-5" />
              GitHub
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          {t('noAccount')}{' '}
          <Link
            href={`/${locale}/signup`}
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            {t('signupLink')}
          </Link>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          <Link
            href={`/${locale}/forgot-password`}
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            {t('forgotPassword')}
          </Link>
        </div>
      </div>
    </div>
  );
}
