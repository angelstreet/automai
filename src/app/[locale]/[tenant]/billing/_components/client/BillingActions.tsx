'use client';

import { RefreshCw, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { Button } from '@/components/shadcn/button';

export function BillingActions() {
  const t = useTranslations('billing');
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleManagePayment = useCallback(() => {
    // Add payment management logic here
    console.log('Manage payment method clicked');
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="h-8" onClick={handleRefresh}>
        <RefreshCw className="h-4 w-4 mr-2" />
        {t('refresh')}
      </Button>
      <Button size="sm" className="h-8 gap-1" onClick={handleManagePayment}>
        <CreditCard className="h-4 w-4" />
        <span>{t('addPaymentMethod')}</span>
      </Button>
    </div>
  );
}
