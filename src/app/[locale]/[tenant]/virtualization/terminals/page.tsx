'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { XTerminal } from '@/components/virtualization/XTerminal';
import { MOCK_DEVICES } from '@/constants/virtualization';
import { Plus, Maximize2, Minimize2 } from 'lucide-react';

export default function VirtualizationTerminalsPage() {
  const t = useTranslations('Common');
  const params = useParams();
  const tenant = params.tenant as string;
  
  const [terminals, setTerminals] = useState([
    { id: '1', deviceId: MOCK_DEVICES[0].id, isMaximized: false },
    { id: '2', deviceId: MOCK_DEVICES[1].id, isMaximized: false }
  ]);

  const handleAddTerminal = () => {
    if (terminals.length < 4) {
      setTerminals(prev => [
        ...prev,
        { 
          id: `${prev.length + 1}`,
          deviceId: MOCK_DEVICES[0].id,
          isMaximized: false
        }
      ]);
    }
  };

  const handleMaximize = (id: string) => {
    setTerminals(prev => prev.map(terminal => ({
      ...terminal,
      isMaximized: terminal.id === id ? !terminal.isMaximized : false
    })));
  };

  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Terminal Sessions</h1>
        <Button onClick={handleAddTerminal} disabled={terminals.length >= 4}>
          <Plus className="mr-2 h-4 w-4" /> New Terminal
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 h-[calc(100vh-180px)]">
        {terminals.map(terminal => {
          const device = MOCK_DEVICES.find(d => d.id === terminal.deviceId);
          const maximizedClass = terminal.isMaximized ? 'md:col-span-2 md:row-span-2' : '';
          
          return (
            <Card key={terminal.id} className={`flex flex-col ${maximizedClass}`}>
              <div className="flex items-center justify-between p-2 border-b">
                <span className="font-medium">{device?.name || 'Terminal'}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMaximize(terminal.id)}
                >
                  {terminal.isMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex-1 p-2 min-h-[300px]">
                <XTerminal
                  deviceId={terminal.deviceId}
                  onCommand={(cmd) => console.log(`Terminal ${terminal.id}:`, cmd)}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 