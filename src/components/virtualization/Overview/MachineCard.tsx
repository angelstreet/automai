'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Machine } from '@/types/virtualization';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MachineCardProps {
  machine: Machine;
}

export function MachineCard({ machine }: MachineCardProps) {
  const router = useRouter();
  const [showError, setShowError] = useState(false);

  const handleTerminalClick = () => {
    router.push(`/virtualization/terminals?machine=${machine.id}`);
  };

  return (
    <>
      <Card className="relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>{machine.name}</span>
            <div className="flex items-center space-x-2">
              {machine.status === 'failed' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowError(true)}
                >
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleTerminalClick}
                disabled={machine.status !== 'connected'}
              >
                <Terminal className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>{machine.ip}{machine.port ? `:${machine.port}` : ''}</p>
            <p className="text-xs mt-1">{machine.description}</p>
          </div>
          <div className="absolute top-2 right-2">
            <div className={`h-2 w-2 rounded-full ${
              machine.status === 'connected' ? 'bg-green-500' :
              machine.status === 'failed' ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={showError} onOpenChange={setShowError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              Connection Error
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium mb-2">Error Details:</p>
              <pre className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-xs">
                {machine.errorMessage || 'No error details available'}
              </pre>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Last successful connection: {machine.lastConnected ? 
                new Date(machine.lastConnected).toLocaleString() : 
                'Never'
              }</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 