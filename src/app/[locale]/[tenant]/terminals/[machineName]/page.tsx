'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Terminal } from '@/components/virtualization/Terminal';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

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

  // Get machine name from URL params
  const machineName = params.machineName as string;
  
  // Log the machine name for debugging
  useEffect(() => {
    logger.info(`Terminal page loaded with machine name: ${machineName}`, {
      action: 'TERMINAL_PAGE_LOADED',
      data: { machineName },
      saveToDb: true
    });
  }, [machineName]);
  
  // Get count from URL if present (for multiple terminals)
  const count = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('count') 
    : null;
  
  const terminalCount = count ? parseInt(count, 10) : 1;

  useEffect(() => {
    // Function to fetch machine details by name
    const fetchMachineByName = async (name: string) => {
      try {
        logger.info(`Fetching machine by name: ${name}`, {
          action: 'TERMINAL_FETCH_ATTEMPT',
          data: { machineName: name },
          saveToDb: true
        });
        
        const response = await fetch(`/api/virtualization/machines/byName/${name}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch machine details for ${name}`);
        }
        
        const data = await response.json();
        if (!data.success || !data.data) {
          throw new Error(`Invalid machine data for ${name}`);
        }
        
        return data.data;
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to fetch machine ${name}`;
        logger.error(message, {
          action: 'TERMINAL_FETCH_ERROR',
          data: { machineName: name, error: message },
          saveToDb: true
        });
        throw error;
      }
    };

    // Function to establish SSH connection
    const connectToMachine = async (machine: MachineConnection) => {
      try {
        const sshResponse = await fetch('/api/virtualization/machines/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            machineId: machine.id,
            type: machine.type,
            ip: machine.ip,
            port: machine.port,
            username: machine.user,
            password: machine.password,
          }),
        });

        if (!sshResponse.ok) {
          throw new Error(`Failed to establish SSH connection to ${machine.name}`);
        }

        logger.info(`SSH connection established to ${machine.name}`, {
          action: 'TERMINAL_CONNECTED',
          data: { machineId: machine.id, ip: machine.ip },
          saveToDb: true
        });
        
        return machine;
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to connect to ${machine.name}`;
        logger.error(message, {
          action: 'TERMINAL_CONNECT_ERROR',
          data: { machineId: machine.id, error: message },
          saveToDb: true
        });
        throw error;
      }
    };

    // Initialize terminals
    const initializeTerminals = async () => {
      setLoading(true);
      try {
        // For single terminal case
        if (terminalCount === 1) {
          const machine = await fetchMachineByName(machineName);
          await connectToMachine(machine);
          setConnections([machine]);
          return;
        }
        
        // For multiple terminals case (from session storage)
        const sessionData = sessionStorage.getItem('selectedMachines');
        if (!sessionData) {
          throw new Error('No machines selected for multiple terminals view');
        }
        
        const machineIds = JSON.parse(sessionData);
        if (!Array.isArray(machineIds) || machineIds.length === 0) {
          throw new Error('Invalid machine selection data');
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
        
        // Connect to all machines in parallel
        const connectionPromises = machines.map(machine => connectToMachine(machine));
        await Promise.all(connectionPromises);
        
        setConnections(machines);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to initialize terminals';
        setError(message);
        toast({
          variant: 'destructive',
          description: `Connection Error: ${message}`,
        });
        
        logger.error(`Terminal initialization failed: ${message}`, {
          action: 'TERMINAL_INIT_ERROR',
          data: { error: message },
          saveToDb: true
        });
      } finally {
        setLoading(false);
      }
    };

    initializeTerminals();

    // Cleanup on unmount
    return () => {
      connections.forEach(connection => {
        fetch('/api/virtualization/machines/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            machineId: connection.id,
          }),
        }).catch(console.error);
      });
    };
  }, [machineName, terminalCount]);

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

  if (loading || connections.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background p-4">
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
      <div className={`grid gap-4 h-[calc(100%-3rem)] ${
        connections.length === 1 ? 'grid-cols-1' : 
        connections.length === 2 ? 'grid-cols-2' :
        connections.length === 3 ? 'grid-cols-3' : 'grid-cols-2 grid-rows-2'
      }`}>
        {connections.map((connection) => (
          <div key={connection.id} className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 text-sm font-medium border-b border-border">
              {connection.name} ({connection.ip})
            </div>
            <Terminal connection={connection} />
          </div>
        ))}
      </div>
    </div>
  );
} 