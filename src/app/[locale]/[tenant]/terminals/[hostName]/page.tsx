'use client';

import { AlertCircle } from 'lucide-react';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert';

import { useToast } from '@/components/shadcn/use-toast';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

import { Terminal } from '../../hosts/_components/Terminal';

interface MachineConnection {
  id: string;
  name: string;
  ip: string;
  type: string;
  port: number;
  user: string;
  password: string;
}

export default function TerminalPage() {
  const router = useRouter();
  const params = useParams();
  const [connections, setConnections] = useState<MachineConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initializationAttemptedRef = useRef<boolean>(false);
  const { toast } = useToast();

  // Get host name from URL params
  const hostName = params.hostName as string;

  // Log the host name for debugging
  useEffect(() => {
    logger.info(`Terminal page loaded with host name: ${hostName}`, {
      action: 'TERMINAL_PAGE_LOADED',
      data: { hostName },
      saveToDb: true,
    });
  }, [hostName]);

  // Get count from URL if present (for multiple terminals)
  const count =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('count') : null;

  const terminalCount = count ? parseInt(count, 10) : 1;

  // Fetch host by name
  const fetchMachineByName = async (name: string) => {
    try {
      const response = await fetch(`/api/hosts/byName/${name}`);
      if (!response.ok) {
        throw new Error('Failed to fetch host');
      }
      const data = await response.json();
      if (!data.success || !data.data) {
        throw new Error('Invalid host data');
      }
      return data.data;
    } catch (error) {
      console.error('Error fetching host:', error);
      return null;
    }
  };

  // Fetch host details
  const fetchMachineDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/hosts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch host details');
      }
      const data = await response.json();
      if (!data.success || !data.data) {
        throw new Error('Invalid host data');
      }
      return data.data;
    } catch (error) {
      console.error('Error fetching host details:', error);
      return null;
    }
  };

  // Initialize terminals
  const initializeTerminals = useCallback(async () => {
    if (error) {
      initializationAttemptedRef.current = false;
    }

    // Prevent duplicate initialization
    if (initializationAttemptedRef.current) {
      console.log('Preventing duplicate terminal initialization');
      return;
    }

    initializationAttemptedRef.current = true;
    setLoading(true);

    try {
      // For single terminal case
      if (terminalCount === 1) {
        const host = await fetchMachineByName(hostName);
        setConnections([host]);
        return;
      }

      // For multiple terminals case (from session storage)
      const sessionData = sessionStorage.getItem('selectedMachines');
      if (!sessionData) {
        throw new Error('No hosts selected for multiple terminals view');
      }

      const hostIds = JSON.parse(sessionData);
      if (!Array.isArray(hostIds) || hostIds.length === 0) {
        throw new Error('Invalid host selection data');
      }

      // Limit to max 4 terminals
      const limitedIds = hostIds.slice(0, 4);

      // Fetch all hosts in parallel
      const hostPromises = limitedIds.map((id) => fetchMachineDetails(id));

      const hosts = await Promise.all(hostPromises);
      setConnections(hosts);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize terminals';
      setError(message);

      logger.error(`Terminal initialization failed: ${message}`, {
        action: 'TERMINAL_INIT_ERROR',
        data: { error: message },
        saveToDb: true,
      });
    } finally {
      setLoading(false);
    }
  }, [hostName, terminalCount, fetchMachineByName, fetchMachineDetails, error]);

  useEffect(() => {
    initializeTerminals();
  }, [initializeTerminals]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center p-8 bg-card border border-border rounded-lg shadow-lg max-w-md -mt-32">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center space-x-4">
            <button
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
              onClick={() => router.back()}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              onClick={() => {
                setError(null);
                setLoading(true);
                initializeTerminals();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || connections.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background p-4 flex flex-col">
      <div className="flex items-center mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mr-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Terminals</h1>
      </div>
      <div
        className={`grid gap-4 flex-1 ${
          connections.length === 1
            ? 'grid-cols-1'
            : connections.length === 2
              ? 'grid-cols-2'
              : connections.length === 3
                ? 'grid-cols-3'
                : 'grid-cols-2 grid-rows-2'
        }`}
      >
        {connections.map((connection) => (
          <div
            key={connection.id}
            className="border border-border rounded-lg overflow-hidden flex flex-col"
          >
            <div className="bg-muted px-4 py-2 text-sm font-medium border-b border-border">
              {connection.name} ({connection.ip})
            </div>
            <div className="flex-1">
              <Terminal connection={connection} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
