'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';

export function ThirdPartyActionsClient() {
  const handleAddTools = () => {
    // Dispatch custom event to communicate with ThirdPartyContentClient
    window.dispatchEvent(new CustomEvent('OPEN_TOOL_SELECTOR'));
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" className="h-8 gap-1" onClick={handleAddTools}>
        <Plus className="h-4 w-4" />
        <span>Add Tools</span>
      </Button>
    </div>
  );
}
