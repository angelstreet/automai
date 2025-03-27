'use client';

import { Button } from '@/components/shadcn/button';
import { PlusCircle } from 'lucide-react';

export function CICDActions() {
  return (
    <Button id="add-provider-button" size="sm" className="h-8 gap-1">
      <PlusCircle className="h-4 w-4" />
      <span>Add Provider</span>
    </Button>
  );
} 