'use client';

import { useState } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { ThirdPartyActionsClient } from './ThirdPartyActionsClient';
import { ThirdPartyContentClient } from './ThirdPartyContentClient';

interface ThirdPartyPageClientProps {
  title: string;
  description: string;
}

export function ThirdPartyPageClient({ title, description }: ThirdPartyPageClientProps) {
  const [showToolSelector, setShowToolSelector] = useState(false);

  const handleAddTools = () => {
    setShowToolSelector(true);
  };

  const actions = <ThirdPartyActionsClient onAddTools={handleAddTools} />;

  return (
    <FeaturePageContainer title={title} description={description} actions={actions}>
      <ThirdPartyContentClient
        showToolSelector={showToolSelector}
        onShowToolSelectorChange={setShowToolSelector}
      />
    </FeaturePageContainer>
  );
}
