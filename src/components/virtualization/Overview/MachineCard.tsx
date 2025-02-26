'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal, AlertCircle, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Machine } from '@/types/virtualization';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MachineCardProps {
  machine: Machine;
  onDelete?: (id: string) => void;
  onTestConnection?: (machine: Machine) => void;
}

export function MachineCard({ machine, onDelete, onTestConnection }: MachineCardProps) {
  const router = useRouter();
  const [showError, setShowError] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleTerminalClick = () => {
    router.push(`/terminals/${machine.name}`);
  };

  return (
    <>
      <Card className="relative">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{machine.name}</CardTitle>
              {getStatusBadge(machine.status)}
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleTerminalClick}
                disabled={machine.status !== 'connected'}
              >
                <Terminal className="h-4 w-4 mr-2" />
                Terminal
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onTestConnection?.(machine)}>
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/metrics/${machine.name}`)}>
                    Metrics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/logs/${machine.name}`)}>
                    Logs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(machine.id)} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>{machine.ip}{machine.port ? `:${machine.port}` : ''}</p>
            {machine.description && <p className="text-xs mt-1">{machine.description}</p>}
            {machine.lastConnected && (
              <p className="text-xs mt-1">Last connected: {new Date(machine.lastConnected).toLocaleString()}</p>
            )}
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