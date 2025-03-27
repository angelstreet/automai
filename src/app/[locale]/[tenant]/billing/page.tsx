import { useTranslations } from 'next-intl';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team Management',
  description: 'Manage teams and team members',
};

export default async function BillingPage() {
  const t = useTranslations('billing');
  
  return (
    <div className="container mx-auto py-6 space-x-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
    </div>
  );
}
