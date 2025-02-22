'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Github, Chrome } from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useParams();
  const { user, isLoading, refreshUser } = useUser();
  const t = useTranslations('Auth');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      // User is already logged in, redirect to appropriate dashboard
      const tenant = user.tenantId || (user.plan === 'TRIAL' ? 'trial' : 'pro');
      router.push(`/${locale}/${tenant}/dashboard`);
    }
  }, [user, isLoading, router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // Store token in both localStorage and cookie for redundancy
      localStorage.setItem('token', data.token);
      
      // Set token as cookie
      document.cookie = `token=${data.token}; path=/; max-age=86400; samesite=lax`;
      
      // Immediately refresh user data which will trigger the redirect
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    window.location.href = `http://localhost:5001/api/auth/${provider}`;
  };

  // Show nothing while checking initial auth state
  if (isLoading) {
    return null;
  }

  // Show nothing if already authenticated (will be redirected)
  if (user) {
    return null;
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('loginTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('loginDescription')}
          </p>
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

            <Button 
              type="submit" 
              className="w-full h-11 text-base"
              disabled={isSubmitting}
            >
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

          <div className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => handleOAuthLogin('google')}
            >
              <Chrome className="mr-2 h-5 w-5" />
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => handleOAuthLogin('github')}
            >
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