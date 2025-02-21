'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { SiteHeader } from '@/components/layout/site-header';
import { useTranslations } from 'next-intl';

export default function SignUpPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const t = useTranslations('Auth');

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
            <CardHeader>
              <CardTitle>{t('signupTitle')}</CardTitle>
              <CardDescription>{t('signupDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Input
                    id="email"
                    placeholder={t('emailPlaceholder')}
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Input
                    id="password"
                    placeholder={t('passwordPlaceholder')}
                    type="password"
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Input
                    id="confirmPassword"
                    placeholder={t('confirmPasswordPlaceholder')}
                    type="password"
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
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
              <Button className="w-full">{t('signupButton')}</Button>
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
          </Card>
        </div>
      </div>
    </div>
  );
} 