'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shadcn/button';
import { Package2 } from 'lucide-react';
import { useUser } from '@/context';

interface UpgradePromptProps {
  feature: string;
  className?: string;
}

export function UpgradePrompt({ feature, className = '' }: UpgradePromptProps) {
  const { user } = useUser();
  const router = useRouter();

  if (!user) return null;

  // Get the user's plan from metadata
  const userPlan = (user.user_metadata as any)?.plan || 'trial';

  // Simple message based on feature
  const message = {
    title: `Upgrade to access ${feature}`,
    description: `This feature is only available on higher plans. Upgrade now to unlock ${feature} and more premium features.`,
  };

  return (
    <div className={`p-4 bg-muted/50 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold mb-2">{message.title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{message.description}</p>
      <Button onClick={() => router.push('/billing')}>Upgrade Now</Button>
    </div>
  );
}
