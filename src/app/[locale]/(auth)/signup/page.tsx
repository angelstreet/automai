'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useUser } from '@/lib/contexts/UserContext';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/layout/site-header';

export default function SignUpPage() {
  const { locale } = useParams();
  const router = useRouter();
  const t = useTranslations('Auth');
  const { refreshUser } = useUser();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError(t('allFieldsRequired'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    if (!formData.acceptTerms) {
      setError(t('acceptTermsRequired'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      // Store the token
      localStorage.setItem('token', data.token);
      
      // Refresh user data which will trigger the redirect
      await refreshUser();

      // Note: No need for manual redirect here as RouteGuard will handle it
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          Automai
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              {t('signupHeroText')}
            </p>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>{t('signupTitle')}</CardTitle>
                <CardDescription>{t('signupDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {error && (
                    <div className="text-sm text-red-500">
                      {error}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Input
                      id="email"
                      placeholder={t('emailPlaceholder')}
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Input
                      id="password"
                      placeholder={t('passwordPlaceholder')}
                      type="password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Input
                      id="confirmPassword"
                      placeholder={t('confirmPasswordPlaceholder')}
                      type="password"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={formData.acceptTerms}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-muted-foreground">
                      {t('termsText')}{' '}
                      <Link 
                        href={`/${locale}/terms`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {t('termsLink')}
                      </Link>
                    </label>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? t('signingUp') : t('signupButton')}
                </Button>
                <div className="text-sm text-muted-foreground text-center">
                  {t('haveAccount')}{' '}
                  <Link 
                    href={`/${locale}/login`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t('loginLink')}
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
} 