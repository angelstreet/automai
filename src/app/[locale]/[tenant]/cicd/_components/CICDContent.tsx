'use client';

import { useState } from 'react';
import { useCICD } from '@/hooks/useCICD';

import CICDDetailsClient from './client/CICDDetailsClient';

export default function CICDContent() {
  // Use hook instead of fetching data directly
  const { providers } = useCICD();

  // Lift the dialog state up to be shared between components
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="w-full border-0 shadow-none">
      <CICDDetailsClient
        initialProviders={providers}
        isAddDialogOpen={isAddDialogOpen}
        setIsAddDialogOpen={setIsAddDialogOpen}
      />
    </div>
  );
}
