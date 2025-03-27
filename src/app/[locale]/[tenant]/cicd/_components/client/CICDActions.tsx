'use client';

import { Button } from '@/components/shadcn/button';
import { PlusCircle } from 'lucide-react';

export function CICDActions() {
  const handleAddProvider = () => {
    // Dispatch the event to show the add provider dialog
    window.dispatchEvent(new CustomEvent('open-provider-dialog'));
  };

  return (
    <Button id="add-provider-button" size="sm" className="h-8 gap-1" onClick={handleAddProvider}>
      <PlusCircle className="h-4 w-4" />
      <span>Add Provider</span>
    </Button>
  );
} 