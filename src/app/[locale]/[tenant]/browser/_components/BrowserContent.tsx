/**
 * Server component for browser automation information
 */
'use client';

import BrowserAutomationClient from './client/BrowserAutomationClient';

export default function BrowserContent() {
  return (
    <div className="space-y-6 p-6">
      <BrowserAutomationClient />
    </div>
  );
}
