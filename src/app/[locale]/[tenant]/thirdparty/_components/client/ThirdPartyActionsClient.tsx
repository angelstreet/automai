'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';

interface ThirdPartyActionsClientProps {
  onAddTools: () => void;
}

export function ThirdPartyActionsClient({ onAddTools }: ThirdPartyActionsClientProps) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" className="h-8 gap-1" onClick={onAddTools}>
        <Plus className="h-4 w-4" />
        <span>Add Tools</span>
      </Button>
    </div>
  );
}
