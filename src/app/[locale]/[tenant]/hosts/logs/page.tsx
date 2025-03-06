'use client';

import { useEffect, useState, useCallback } from 'react';

import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { useToast } from '@/components/shadcn/use-toast';
import { Host } from '@/types/hosts';

interface Log {
  id: string;
  deviceId: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export default function HostsLogsPage() {
  const [machines, setMachines] = useState<Host[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMachines = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/hosts');

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load hosts',
        });
        return;
      }

      const data = await response.json();
      setMachines(data.hosts || []);

      // Fetch logs from API
      const logsResponse = await fetch('/api/logs');
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.logs || []);
      }

      // Set first host as selected if none selected
      if (machines.length > 0 && !selectedDevice) {
        setSelectedDevice(machines[0].id);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load hosts',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, machines, selectedDevice]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const filteredLogs = selectedDevice
    ? logs.filter((log) => log.deviceId === selectedDevice)
    : logs;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Logs</h1>
        <Button onClick={fetchMachines}>Refresh</Button>
      </div>
      <div className="flex gap-4 h-full">
        {/* Sidebar */}
        <Card className="w-64 p-4">
          <h2 className="font-semibold mb-4">Devices</h2>
          <div className="space-y-2">
            <Button
              variant={selectedDevice === null ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedDevice(null)}
            >
              All Devices
            </Button>
            {machines.map((host) => (
              <Button
                key={host.id}
                variant={selectedDevice === host.id ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedDevice(host.id)}
              >
                {host.name}
              </Button>
            ))}
          </div>
        </Card>

        {/* Main content */}
        <Card className="flex-1 p-4">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4">
              {filteredLogs.map((log) => {
                const device = machines.find((m) => m.id === log.deviceId);

                return (
                  <div key={log.id} className="flex items-start gap-4 p-2 rounded border">
                    <Badge
                      variant={
                        log.level === 'error'
                          ? 'destructive'
                          : log.level === 'warning'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {log.level}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="text-sm font-medium">
                          {device?.name || 'Unknown Device'}
                        </span>
                      </div>
                      <p className="mt-1">{log.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
