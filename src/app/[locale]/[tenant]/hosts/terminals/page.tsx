'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Terminal } from '@/components/virtualization/Terminal';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

export default function TerminalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [connection, setConnection] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [host, setHost] = useState<any>(null);

  useEffect(() => {
    const hostId = searchParams.get('machine');
    if (!hostId) {
      setError('No host ID provided');
      return;
    }

    // Fetch host details and establish SSH connection
    const initializeTerminal = async () => {
      try {
        setIsLoading(true);
        // Fetch host details
        const response = await fetch(`/api/hosts/${hostId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch host details');
        }
        const hostData = await response.json();
        setHost(hostData.data);

        // Connect to the host
        const sshResponse = await fetch('/api/hosts/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: hostId }),
        });

        if (!sshResponse.ok) {
          throw new Error('Failed to establish SSH connection');
        }

        logger.info('SSH connection established', {
          action: 'TERMINAL_CONNECTED',
          data: { hostId, ip: hostData.data.ip },
          saveToDb: true
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to initialize terminal';
        setError(message);
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: message,
        });
        
        logger.error(`Terminal initialization failed: ${message}`, {
          action: 'TERMINAL_INIT_ERROR',
          data: { hostId, error: message },
          saveToDb: true
        });
      }
    };

    initializeTerminal();

    // Disconnect on unmount
    return () => {
      if (hostId) {
        fetch('/api/hosts/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: hostId }),
        }).catch(error => console.error('Error disconnecting:', error));
      }
    };
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Connection Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !host) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <Terminal connection={host} />
    </div>
  );
} 