'use client';

import ModelSelector from './ModelSelector';

/**
 * Chat header component - model selection only
 */
export default function ChatHeader() {
  return (
    <div className="px-4 border-border bg-background/50">
      <div className="flex items-start justify-end">
        {/* Model Selection */}
        <div className="flex-1">
          <ModelSelector />
        </div>
      </div>
    </div>
  );
}
