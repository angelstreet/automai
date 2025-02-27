'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Terminal } from '@/components/hosts/Terminal';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

export default function TerminalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [connection, setConnection] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const machineId = searchParams.get('machine');
    if (!machineId) {
      setError('No machine ID provided');
      return;
    }

    // Fetch machine details and establish SSH connection
    const initializeTerminal = async () => {
      try {
        const response = await fetch(`/api/hosts/${machineId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch machine details');
        }

        const data = await response.json();
        if (!data.success || !data.data) {
          throw new Error('Invalid machine data');
        }

        setConnection(data.data);

        // Initialize SSH connection
        const sshResponse = await fetch('/api/hosts/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            machineId,
            type: data.data.type,
            ip: data.data.ip,
            port: data.data.port,
            username: data.data.user,
            password: data.data.password,
          }),
        });

        if (!sshResponse.ok) {
          throw new Error('Failed to establish SSH connection');
        }

        logger.info('SSH connection established', {
          action: 'TERMINAL_CONNECTED',
          data: { machineId, ip: data.data.ip },
          saveToDb: true,
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
          data: { machineId, error: message },
          saveToDb: true,
        });
      }
    };

    initializeTerminal();

    // Cleanup on unmount
    return () => {
      if (connection) {
        fetch('/api/hosts/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            machineId: connection.id,
          }),
        }).catch(console.error);
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

  if (!connection) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <Terminal connection={connection} />
    </div>
  );
}
