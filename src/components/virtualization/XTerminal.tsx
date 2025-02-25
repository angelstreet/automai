import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Minimize2, Maximize2, X } from 'lucide-react';
import { ConnectionType } from '@/types/virtualization';
import { CONNECTION_COLORS } from '@/constants/virtualization';

interface XTerminalProps {
  id: string;
  vm: string;
  connectionType: ConnectionType;
  isActive: boolean;
  height?: string;
}

const badges = {
  portainer: <Badge className="bg-blue-500">P</Badge>,
  docker: <Badge className="bg-green-500">D</Badge>,
  ssh: <Badge className="bg-gray-500">S</Badge>,
  unknown: <Badge className="bg-gray-500">?</Badge>
} as const;

export function XTerminal({ 
  id, 
  vm, 
  connectionType, 
  isActive, 
  height = '100%' 
}: XTerminalProps) {
  const terminalRef = useRef(null);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([
    { text: `Connected to ${vm} via ${connectionType}`, type: 'system' },
    { text: 'Terminal ready', type: 'system' }
  ]);

  const executeCommand = () => {
    if (!command.trim()) return;
    
    // Add command to history
    setHistory(prev => [...prev, { text: `$ ${command}`, type: 'command' }]);
    
    // Mock response based on command type
    if (command.startsWith('ls')) {
      setHistory(prev => [...prev, { 
        text: 'app.js  node_modules  package.json  public  README.md  src  tsconfig.json', 
        type: 'output' 
      }]);
    } else if (command.startsWith('docker')) {
      setHistory(prev => [...prev, { 
        text: connectionType === 'docker' || connectionType === 'portainer' 
          ? 'CONTAINER ID   IMAGE          COMMAND      STATUS          PORTS     NAMES\nabc123456789   nginx:latest   "/docker-en…"   Up 2 hours   80/tcp    web-server' 
          : 'Error: Docker command not available in SSH mode',
        type: connectionType === 'docker' || connectionType === 'portainer' ? 'output' : 'error'
      }]);
    } else if (command === 'clear') {
      setHistory([
        { text: `Connected to ${vm} via ${connectionType}`, type: 'system' },
        { text: 'Terminal cleared', type: 'system' }
      ]);
    } else {
      setHistory(prev => [...prev, { 
        text: `Command not found: ${command}`, 
        type: 'error' 
      }]);
    }
    
    setCommand('');
  };

  return (
    <div 
      className={`h-full flex flex-col overflow-hidden rounded-md border bg-gradient-to-b ${CONNECTION_COLORS[connectionType]} border-${connectionType === 'portainer' ? 'blue' : connectionType === 'docker' ? 'green' : 'gray'}-500/20`} 
      style={{ height }}
    >
      <div className="flex items-center justify-between px-3 py-1 border-b border-muted">
        <div className="flex items-center gap-2">
          {badges[connectionType] || badges.unknown}
          <span className="text-xs font-medium">{vm}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm">
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm">
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm hover:bg-red-500/10 hover:text-red-500">
            <X className="h-3 w-3" />
          </Button>
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
          autoFocus={isActive}
        />
      </div>
    </div>
  );
} 