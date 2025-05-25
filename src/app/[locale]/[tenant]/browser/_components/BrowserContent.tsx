/**
 * Server component for browser automation information
 */
'use client';

import BrowserAutomationClient from './client/BrowserAutomationClient';
import { BrowserAutomationProvider } from './context/BrowserAutomationContext';

export default function BrowserContent() {
  return (
    <BrowserAutomationProvider>
      <div className="space-y-6 p-6">
        <BrowserAutomationClient />
      </div>
    </BrowserAutomationProvider>
  );
}
