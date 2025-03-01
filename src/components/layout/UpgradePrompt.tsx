'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/Shadcn/button';
import { useUser } from '@/context/UserContext';
import { getUpgradeMessage } from '@/lib/features';

interface UpgradePromptProps {
  feature: string;
  className?: string;
}

export function UpgradePrompt({ feature, className = '' }: UpgradePromptProps) {
  const { user } = useUser();
  const router = useRouter();

  if (!user) return null;

  const message = getUpgradeMessage(user.plan, feature as any);
  if (!message) return null;

  return (
    <div className={`bg-muted/50 p-4 rounded-lg ${className}`}>
      <p className="text-sm text-muted-foreground mb-2">{message}</p>
      <Button variant="outline" size="sm" onClick={() => router.push('/pricing')}>
        View Plans
      </Button>
    </div>
  );
}
