'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Host } from '@/types/hosts';
import { useToast } from '@/components/ui/use-toast';

interface Log {
  id: string;
  deviceId: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export default function LogsPage() {
  const t = useTranslations('Common');
  const { toast } = useToast();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch hosts from API
  const fetchHosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/hosts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch hosts');
      }
      
      const data = await response.json();
      setHosts(data.data || []);

      // Set first host as selected if none selected
      if (hosts.length > 0 && !selectedDevice) {
        setSelectedDevice(hosts[0].id);
      }

      // Fetch logs for all machines
      const mockLogs: Log[] = [
        { id: '1', deviceId: hosts[0]?.id, timestamp: '2024-03-20T10:00:00Z', level: 'info', message: 'Container started successfully' },
        { id: '2', deviceId: hosts[0]?.id, timestamp: '2024-03-20T10:01:00Z', level: 'warning', message: 'High memory usage detected' },
        { id: '3', deviceId: hosts[1]?.id, timestamp: '2024-03-20T10:02:00Z', level: 'error', message: 'Failed to connect to network' }
      ].filter(log => log.deviceId); // Only keep logs for existing machines

      setLogs(mockLogs);
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
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  const filteredLogs = selectedDevice
    ? logs.filter(log => log.deviceId === selectedDevice)
    : logs;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-2 pt-2 h-[calc(100vh-90px)] max-h-[calc(100vh-90px)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
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
            {hosts.map(machine => (
              <Button
                key={machine.id}
                variant={selectedDevice === machine.id ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedDevice(machine.id)}
              >
                {machine.name}
              </Button>
            ))}
          </div>
        </Card>
        
        {/* Main content */}
        <Card className="flex-1 p-4">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4">
              {filteredLogs.map(log => {
                const device = machines.find(m => m.id === log.deviceId);
                
                return (
                  <div key={log.id} className="flex items-start gap-4 p-2 rounded border">
                    <Badge
                      variant={
                        log.level === 'error' ? 'destructive' :
                        log.level === 'warning' ? 'warning' :
                        'secondary'
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