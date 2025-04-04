import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

interface BillingContentProps {
  pageMetadata?: {
    title: string;
    description: string;
    actions?: ReactNode;
  };
}

export default async function BillingContent({ pageMetadata }: BillingContentProps = {}) {
  const t = await getTranslations('billing');

  return (
    <div className="p-2">
      {/* Current Plan Card */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>{t('current_plan_label')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <div className="border p-4 rounded-md">
              <h3 className="text-lg font-semibold mb-2">{t('pro')}</h3>
              <p className="text-muted-foreground">
                {t('price_label')}: $19.99 / {t('monthly')}
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium">{t('features_label')}:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>Unlimited deployments</li>
                  <li>10 team members</li>
                  <li>Advanced analytics</li>
                  <li>Priority support</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History Card */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>{t('billing_history_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold">Date</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold">Description</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 px-4 text-sm">March 1, 2024</td>
                  <td className="py-3 px-4 text-sm">Pro Plan Subscription</td>
                  <td className="py-3 px-4 text-sm text-right">$19.99</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm">February 1, 2024</td>
                  <td className="py-3 px-4 text-sm">Pro Plan Subscription</td>
                  <td className="py-3 px-4 text-sm text-right">$19.99</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
