'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/shadcn/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/shadcn/card';

export default function OverviewTabSkeleton() {
  const t = useTranslations('team');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('resources.title')}</CardTitle>
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-10 w-full" />
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
