import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Minimize2, Maximize2, X } from 'lucide-react';
import { Machine } from '@/types/virtualization';
import { CONNECTION_COLORS } from '@/constants/virtualization';

interface XTerminalProps {
  device: Machine;
  isMaximized: boolean;
  onMaximize: () => void;
  onRestore: () => void;
}

const badges = {
  portainer: <Badge className="bg-blue-500">P</Badge>,
  docker: <Badge className="bg-green-500">D</Badge>,
  ssh: <Badge className="bg-gray-500">S</Badge>,
  unknown: <Badge className="bg-gray-500">?</Badge>
} as const;

export function XTerminal({ 
  device,
  isMaximized,
  onMaximize,
  onRestore
}: XTerminalProps) {
  const terminalRef = useRef(null);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([
    { text: `Connected to ${device.name} via ${device.type}`, type: 'system' },
    { text: 'Terminal ready', type: 'system' }
  ]);

  const executeCommand = async () => {
    if (!command.trim()) return;
    
    // Add command to history
    setHistory(prev => [...prev, { text: `$ ${command}`, type: 'command' }]);
    
    try {
      // Send command to API
      const response = await fetch('/api/virtualization/machines/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: device.id,
          command
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute command');
      }
      
      const data = await response.json();
      
      if (data.success) {
        if (command === 'clear') {
          setHistory([
            { text: `Connected to ${device.name} via ${device.type}`, type: 'system' },
            { text: 'Terminal cleared', type: 'system' }
          ]);
        } else {
          setHistory(prev => [...prev, { 
            text: data.output, 
            type: 'output' 
          }]);
        }
      } else {
        setHistory(prev => [...prev, { 
          text: data.message || 'Command failed', 
          type: 'error' 
        }]);
      }
    } catch (error) {
      setHistory(prev => [...prev, { 
        text: error instanceof Error ? error.message : 'Failed to execute command', 
        type: 'error' 
      }]);
    }
    
    setCommand('');
  };

  return (
    <div 
      className={`h-full flex flex-col overflow-hidden rounded-md border bg-gradient-to-b ${CONNECTION_COLORS[device.type]} border-${device.type === 'portainer' ? 'blue' : device.type === 'docker' ? 'green' : 'gray'}-500/20`}
    >
      <div className="flex items-center justify-between px-3 py-1 border-b border-muted">
        <div className="flex items-center gap-2">
          {badges[device.type] || badges.unknown}
          <span className="text-xs font-medium">{device.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {isMaximized ? (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={onRestore}>
              <Minimize2 className="h-3 w-3" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={onMaximize}>
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-3 py-2 bg-black/50">
        <div className="font-mono text-xs">
          {history.map((entry, i) => (
            <div key={i} className={
              entry.type === 'system' ? 'text-blue-400' : 
              entry.type === 'command' ? 'text-green-400' : 
              entry.type === 'error' ? 'text-red-400' : 
              'text-gray-300'
            }>
              {entry.text}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="px-3 py-2 border-t border-muted flex items-center">
        <span className="text-xs text-green-500 mr-1">$</span>
        <input
          ref={terminalRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') executeCommand();
          }}
          className="flex-1 bg-transparent border-none outline-none text-xs font-mono"
          placeholder="Type a command..."
        />
      </div>
    </div>
  );
} 