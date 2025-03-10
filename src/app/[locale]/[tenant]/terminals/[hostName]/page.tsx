'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert';
import { useToast } from '@/components/shadcn/use-toast';

import { Terminal } from '../_components/Terminal';

interface MachineConnection {
  id: string;
  name: string;
  ip: string;
  type: string;
  port: number;
  username: string;
  password: string;
  host?: string;
  user?: string;
  os_type?: string;
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

  // Get count from URL if present (for multiple terminals)
  const count =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('count') : null;

  const terminalCount = count ? parseInt(count, 10) : 1;

  // Fetch host by name
  const fetchMachineByName = async (name: string) => {
    try {
      // First check if we have the host data in session storage (prioritize this)
      if (typeof window !== 'undefined') {
        const storedHost = sessionStorage.getItem('currentHost');
        if (storedHost) {
          try {
            const parsedHost = JSON.parse(storedHost);
            // Verify this is the correct host
            if (parsedHost.name.toLowerCase() === name.toLowerCase()) {
              console.log('Using host data from session storage');
              
              // Store the last access timestamp
              sessionStorage.setItem('currentHost_accessed', Date.now().toString());
              
              return parsedHost;
            }
          } catch (e) {
            console.error('Error parsing stored host:', e);
            // Continue to fetch if parsing fails
          }
        }
      }

      // If no valid cached data, fetch from API
      console.log(`Fetching host by name: ${name}`);

      // Fetch from the standardized lowercase route
      console.log(`Fetching from /api/hosts/byname/${name}`);
      const response = await fetch(`/api/hosts/byname/${name}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        throw new Error(errorData.error || 'Failed to fetch host');
      }
      
      const data = await response.json();
      if (!data.success || !data.data) {
        console.error('Invalid host data returned:', data);
        throw new Error('Invalid host data');
      }
      
      const hostData = data.data;

      if (!hostData) {
        throw new Error(`Failed to fetch host with name: ${name}`);
      }

      // Cache the result for future use
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('currentHost', JSON.stringify(hostData));
          sessionStorage.setItem('currentHost_accessed', Date.now().toString());
          console.log('Host data cached in sessionStorage');
        } catch (e) {
          console.error('Error caching host data:', e);
        }
      }

      console.log('Host data fetched successfully:', hostData.name);
      return hostData;
    } catch (error) {
      console.error('Error fetching host:', error);
      throw error;
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
    // Prevent duplicate initialization
    if (initializationAttemptedRef.current) {
      console.log('Preventing duplicate terminal initialization');
      return;
    }

    initializationAttemptedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // For single terminal case
      if (terminalCount === 1) {
        // First try to get the full host data from sessionStorage
        // With our new approach, we have multiple ways to retrieve it
        if (typeof window !== 'undefined') {
          // First check if we have a reference to the current host
          const currentHostRef = sessionStorage.getItem('currentHost');
          
          // Try different approaches to get the host data
          let hostData = null;
          
          // 1. Try to get the host using the reference (most efficient)
          if (currentHostRef && !currentHostRef.startsWith('{')) {
            // This is a reference like "host_123", not a full JSON object
            try {
              const storedHostData = sessionStorage.getItem(currentHostRef);
              if (storedHostData) {
                const parsedHost = JSON.parse(storedHostData);
                if (parsedHost && parsedHost.name.toLowerCase() === hostName.toLowerCase()) {
                  console.log('Found host using reference from sessionStorage:', currentHostRef);
                  hostData = parsedHost;
                }
              }
            } catch (e) {
              console.error('Error retrieving host from reference:', e);
            }
          }
          
          // 2. Try direct storage as full object (backward compatibility)
          if (!hostData && currentHostRef) {
            try {
              // Try parsing it directly in case it's a full JSON object
              const parsedHost = JSON.parse(currentHostRef);
              if (parsedHost && parsedHost.name && 
                  parsedHost.name.toLowerCase() === hostName.toLowerCase()) {
                console.log('Found host stored as full JSON object');
                hostData = parsedHost;
              }
            } catch (e) {
              // Not a JSON object, which is expected with the new approach
            }
          }
          
          // 3. Try by name directly
          if (!hostData) {
            try {
              const storedHostByName = sessionStorage.getItem(`host_name_${hostName.toLowerCase()}`);
              if (storedHostByName) {
                const parsedHost = JSON.parse(storedHostByName);
                console.log('Found host by name in sessionStorage');
                hostData = parsedHost;
              }
            } catch (e) {
              console.error('Error retrieving host by name:', e);
            }
          }
          
          // 4. Try the backup full object we stored for debugging
          if (!hostData) {
            try {
              const fullHost = sessionStorage.getItem('currentHost_full');
              if (fullHost) {
                const parsedHost = JSON.parse(fullHost);
                if (parsedHost && parsedHost.name.toLowerCase() === hostName.toLowerCase()) {
                  console.log('Found host in backup currentHost_full storage');
                  hostData = parsedHost;
                }
              }
            } catch (e) {
              console.error('Error retrieving backup host data:', e);
            }
          }
          
          // If we found host data through any method, use it
          if (hostData) {
            console.log('Using host data from sessionStorage without API calls:', {
              name: hostData.name,
              is_windows: hostData.is_windows,
              os_type: hostData.os_type
            });
            setConnections([hostData]);
            setLoading(false);
            return;
          }
        }
        
        // Only fetch if we don't have the data in sessionStorage
        const host = await fetchMachineByName(hostName);
        if (!host) {
          throw new Error(`Host not found: ${hostName}`);
        }
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
      console.error('Terminal initialization error:', message);
      
      // Important: Don't reset initializationAttemptedRef here to prevent infinite loop
      // initializationAttemptedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [hostName, terminalCount, fetchMachineByName, fetchMachineDetails]);

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
          <div className="flex justify-center">
            <button
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
              onClick={() => router.back()}
            >
              Go Back
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
