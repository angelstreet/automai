'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { XTerminal } from '@/components/virtualization/XTerminal';
import { Machine } from '@/types/virtualization';
import { useToast } from '@/components/ui/use-toast';

interface Terminal {
  id: string;
  deviceId: string;
  isMaximized: boolean;
}

export default function TerminalsPage() {
  const t = useTranslations('Common');
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch machines from API
  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/virtualization/machines');
      
      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load machines',
        });
        return;
      }
      
      const data = await response.json();
      const machines = data.data || [];
      setMachines(machines);

      // Initialize terminals with first two machines if available
      if (machines.length > 0 && terminals.length === 0) {
        setTerminals([
          { id: '1', deviceId: machines[0].id, isMaximized: false },
          ...(machines.length > 1 ? [{ id: '2', deviceId: machines[1].id, isMaximized: false }] : [])
        ]);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load machines',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleMaximize = (terminalId: string) => {
    setTerminals(prev => prev.map(t => ({
      ...t,
      isMaximized: t.id === terminalId
    })));
  };

  const handleRestore = () => {
    setTerminals(prev => prev.map(t => ({
      ...t,
      isMaximized: false
    })));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-2 pt-2 h-[calc(100vh-90px)] max-h-[calc(100vh-90px)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Terminals</h1>
      </div>
      
      <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
        {terminals.map(terminal => {
          const device = machines.find(m => m.id === terminal.deviceId);
          
          if (!device) return null;
          
          return (
            <XTerminal
              key={terminal.id}
              device={device}
              isMaximized={terminal.isMaximized}
              onMaximize={() => handleMaximize(terminal.id)}
              onRestore={handleRestore}
            />
          );
        })}
      </div>
    </div>
  );
} 