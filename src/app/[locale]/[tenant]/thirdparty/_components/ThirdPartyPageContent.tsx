'use client';

import { useState } from 'react';

import { ThirdPartyActionsClient } from './client/ThirdPartyActionsClient';
import { ThirdPartyContentClient } from './client/ThirdPartyContentClient';

export function ThirdPartyPageContent() {
  const [showToolSelector, setShowToolSelector] = useState(false);

  const handleAddTools = () => {
    setShowToolSelector(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Actions Bar */}
      <div className="flex justify-end mb-6">
        <ThirdPartyActionsClient onAddTools={handleAddTools} />
      </div>
      
      {/* Content */}
      <div className="flex-1">
        <ThirdPartyContentClient
          showToolSelector={showToolSelector}
          onShowToolSelectorChange={setShowToolSelector}
        />
      </div>
    </div>
  );
} 