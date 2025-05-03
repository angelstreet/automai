'use client';

import { Key, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

interface EnvironmentVariablesEmptyStateProps {
  onAddClick: () => void;
}

export function EnvironmentVariablesEmptyState({
  onAddClick,
}: EnvironmentVariablesEmptyStateProps) {
  const t = useTranslations('environmentVariables');

  return (
    <Card className="w-full border border-dashed">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          {t('none_title')}
        </CardTitle>
        <CardDescription>{t('none_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center items-center py-6">
          <div className="rounded-full bg-muted p-3">
            <Key className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center border-t bg-muted/50 py-4">
        <Button onClick={onAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add_button')}
        </Button>
      </CardFooter>
    </Card>
  );
}
