'use client';

import { createContext, useContext, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

// Context type for browser automation state
interface BrowserAutomationContextType {
  isInitialized: boolean;
  setIsInitialized: (value: boolean) => void;
  startTime: string | null;
  setStartTime: (value: string | null) => void;
  activeHost: Host | null;
  setActiveHost: (host: Host | null) => void;
  sessionId: string | null;
  setSessionId: (sessionId: string | null) => void;
}

const BrowserAutomationContext = createContext<BrowserAutomationContextType | undefined>(undefined);

export const useBrowserAutomation = () => {
  const context = useContext(BrowserAutomationContext);
  if (!context) {
    throw new Error('useBrowserAutomation must be used within BrowserAutomationProvider');
  }
  return context;
};

export function BrowserAutomationProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [activeHost, setActiveHost] = useState<Host | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  return (
    <BrowserAutomationContext.Provider
      value={{
        isInitialized,
        setIsInitialized,
        startTime,
        setStartTime,
        activeHost,
        setActiveHost,
        sessionId,
        setSessionId,
      }}
    >
      {children}
    </BrowserAutomationContext.Provider>
  );
} 