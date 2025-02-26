'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Terminal } from '@/components/virtualization/Terminal';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  const { toast } = useToast();
  const [connections, setConnections] = useState<MachineConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initializationAttemptedRef = useRef<boolean>(false);

  // Get host name from URL params
  const hostName = params.hostName as string;
  
  // Log the host name for debugging
  useEffect(() => {
    logger.info(`Terminal page loaded with host name: ${hostName}`, {
      action: 'TERMINAL_PAGE_LOADED',
      data: { hostName },
      saveToDb: true
    });
  }, [hostName]);
  
  // Get count from URL if present (for multiple terminals)
  const count = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('count') 
    : null;
  
  const terminalCount = count ? parseInt(count, 10) : 1;

  // Function to fetch machine details by name
  const fetchMachineByName = async (name: string) => {
    try {
      logger.info(`Fetching machine by name: ${name}`, {
        action: 'TERMINAL_FETCH_ATTEMPT',
        data: { hostName: name },
        saveToDb: true
      });
      
      const response = await fetch(`/api/virtualization/machines/byName/${name}`);
      if (!response.ok) {
        const errorText = await response.text();
        toast({
          variant: 'destructive',
          title: 'Failed to fetch host details',
          description: `Error: ${errorText || response.statusText}`,
          duration: 5000,
        });
        throw new Error(`Failed to fetch host details for ${name}: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success || !data.data) {
        toast({
          variant: 'destructive',
          title: 'Invalid host data',
          description: `Could not retrieve valid data for ${name}`,
          duration: 5000,
        });
        throw new Error(`Invalid host data for ${name}`);
      }
      
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to fetch host ${name}`;
      logger.error(message, {
        action: 'TERMINAL_FETCH_ERROR',
        data: { hostName: name, error: message },
        saveToDb: true
      });
      
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: message,
        duration: 5000,
      });
      
      throw error;
    }
  };

  // Initialize terminals
  const initializeTerminals = async () => {
    // Reset the initialization flag when manually called (e.g., from retry button)
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
        const machine = await fetchMachineByName(hostName);
        setConnections([machine]);
        return;
      }
      
      // For multiple terminals case (from session storage)
      const sessionData = sessionStorage.getItem('selectedMachines');
      if (!sessionData) {
        throw new Error('No hosts selected for multiple terminals view');
      }
      
      const machineIds = JSON.parse(sessionData);
      if (!Array.isArray(machineIds) || machineIds.length === 0) {
        throw new Error('Invalid host selection data');
      }
      
      // Limit to max 4 terminals
      const limitedIds = machineIds.slice(0, 4);
      
      // Fetch all machines in parallel
      const machinePromises = limitedIds.map(id => 
        fetch(`/api/virtualization/machines/${id}`)
          .then(res => res.json())
          .then(data => data.data)
      );
      
      const machines = await Promise.all(machinePromises);
      setConnections(machines);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize terminals';
      setError(message);
      
      logger.error(`Terminal initialization failed: ${message}`, {
        action: 'TERMINAL_INIT_ERROR',
        data: { error: message },
        saveToDb: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeTerminals();

    // Cleanup on unmount
    return () => {
      logger.info('Terminal page unmounted', {
        action: 'TERMINAL_PAGE_UNMOUNTED',
        data: { hostName },
        saveToDb: true
      });
    };
  }, [hostName, terminalCount]);

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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Terminals</h1>
      </div>
      <div className={`grid gap-4 flex-1 ${
        connections.length === 1 ? 'grid-cols-1' : 
        connections.length === 2 ? 'grid-cols-2' :
        connections.length === 3 ? 'grid-cols-3' : 'grid-cols-2 grid-rows-2'
      }`}>
        {connections.map((connection) => (
          <div key={connection.id} className="border border-border rounded-lg overflow-hidden flex flex-col">
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