'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Checkbox } from '@/components/shadcn/checkbox';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';

export default function SignUpPage() {
  const t = useTranslations('auth');
  
  return (
    <div>
      <h1>{t('signup.title')}</h1>
    </div>
  );
}
