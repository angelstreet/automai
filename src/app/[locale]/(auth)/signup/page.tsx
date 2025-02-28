'use client';

import { useTranslations } from 'next-intl';

export default function SignUpPage() {
  const t = useTranslations('auth');
  
  return (
    <div>
      <h1>{t('signup.title')}</h1>
    </div>
  );
}
