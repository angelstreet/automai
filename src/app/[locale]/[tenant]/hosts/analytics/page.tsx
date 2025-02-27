'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Host } from '@/types/hosts';
import { useToast } from '@/components/shadcn/use-toast';

export default function AnalyticsPage() {
  const t = useTranslations('Common');
  const { toast } = useToast();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch hosts from API
  const fetchHosts = async () => {
    try {
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
      setHosts(data.hosts || []);

      // Set first host as selected if none selected
      if (hosts.length > 0 && !selectedDevice) {
        setSelectedDevice(hosts[0].id);
      }
    } catch (error) {
      console.error('Error fetching hosts:', error);
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-2 pt-2 h-[calc(100vh-90px)] max-h-[calc(100vh-90px)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      </div>

      <div className="flex gap-4 h-full">
        {/* Sidebar */}
        <Card className="w-64 p-4">
          <h2 className="font-semibold mb-4">Devices</h2>
          <div className="space-y-2">
            {hosts.map((host) => (
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
          {selectedDevice && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Analytics data will be populated from API */}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
