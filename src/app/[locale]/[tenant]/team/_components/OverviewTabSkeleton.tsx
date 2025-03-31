'use client';

import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';

export default function OverviewTabSkeleton() {
  const t = useTranslations('team');

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle>{t('resources.title')}</CardTitle>
        <Skeleton className="h-4 w-72 mt-1" />
      </CardHeader>
      <CardContent className="pt-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-9 w-full" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
