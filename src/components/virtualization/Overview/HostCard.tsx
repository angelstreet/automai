'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal, AlertCircle, MoreHorizontal, BarChart2, RefreshCw, XCircle } from 'lucide-react';
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

interface HostCardProps {
  machine: Machine;
  onDelete?: (id: string) => void;
  onTestConnection?: (machine: Machine) => void;
}

export function HostCard({ machine, onDelete, onTestConnection }: HostCardProps) {
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
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div className="flex flex-col space-y-1.5">
            <CardTitle className="text-base font-semibold truncate max-w-[200px]">
              {machine.name}
            </CardTitle>
            {getStatusBadge(machine.status)}
            <CardDescription className="text-xs">
              {machine.ip}{machine.port ? `:${machine.port}` : ''}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/metrics/${machine.name}`)}>
                  <BarChart2 className="mr-2 h-4 w-4" />
                  <span>Metrics</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTestConnection?.(machine)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  <span>Refresh</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(machine.id)} className="text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex flex-col space-y-2">
            <div className="text-sm text-muted-foreground">
              {machine.description && <p>{machine.description}</p>}
              {machine.lastConnected && (
                <p className="text-xs mt-1">Last connected: {new Date(machine.lastConnected).toLocaleString()}</p>
              )}
            </div>
            <Button 
              variant="default"
              size="sm"
              className="w-full mt-2"
              onClick={handleTerminalClick}
              disabled={machine.status !== 'connected'}
            >
              <Terminal className="h-4 w-4 mr-2" />
              Terminal
            </Button>
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