'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Terminal, Play, Trash2 } from 'lucide-react';

interface TerminalLine {
  id: number;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export default function TerminalPanelClient() {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 1,
      type: 'output',
      content: 'Welcome to Automai Terminal',
      timestamp: new Date(),
    },
    {
      id: 2,
      type: 'output',
      content: 'Type git commands or basic shell commands below',
      timestamp: new Date(),
    },
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = (type: 'command' | 'output' | 'error', content: string) => {
    const newLine: TerminalLine = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date(),
    };
    setLines((prev) => [...prev, newLine]);
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsExecuting(true);
    addLine('command', `$ ${command}`);

    try {
      // Here you would typically send the command to a backend API
      // For now, we'll simulate some common git commands
      await simulateCommand(command.trim());
    } catch (error) {
      addLine('error', `Error: ${error}`);
    } finally {
      setIsExecuting(false);
      setCurrentCommand('');
      inputRef.current?.focus();
    }
  };

  const simulateCommand = async (command: string): Promise<void> => {
    // Simulate command execution delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cmd = command.toLowerCase();

    if (cmd === 'help') {
      addLine('output', 'Available commands:');
      addLine('output', '  git status     - Show working tree status');
      addLine('output', '  git log        - Show commit history');
      addLine('output', '  git pull       - Fetch and merge changes');
      addLine('output', '  git push       - Push changes to remote');
      addLine('output', '  git add .      - Stage all changes');
      addLine('output', '  git commit -m  - Commit staged changes');
      addLine('output', '  ls             - List directory contents');
      addLine('output', '  pwd            - Show current directory');
      addLine('output', '  clear          - Clear terminal');
    } else if (cmd === 'clear') {
      setLines([]);
    } else if (cmd === 'pwd') {
      addLine('output', '/workspace/repository');
    } else if (cmd === 'ls') {
      addLine('output', 'src/  docs/  package.json  README.md  .git/');
    } else if (cmd === 'git status') {
      addLine('output', 'On branch main');
      addLine('output', "Your branch is up to date with 'origin/main'.");
      addLine('output', '');
      addLine('output', 'nothing to commit, working tree clean');
    } else if (cmd.startsWith('git log')) {
      addLine('output', 'commit abc123... (HEAD -> main, origin/main)');
      addLine('output', 'Author: Developer <dev@example.com>');
      addLine('output', 'Date:   ' + new Date().toISOString());
      addLine('output', '');
      addLine('output', '    Latest commit message');
    } else if (cmd === 'git pull') {
      addLine('output', 'Already up to date.');
    } else if (cmd === 'git push') {
      addLine('output', 'Everything up-to-date');
    } else if (cmd === 'git add .') {
      addLine('output', 'Changes staged successfully');
    } else if (cmd.startsWith('git commit')) {
      addLine('output', '[main abc123] Commit message');
      addLine('output', '1 file changed, 1 insertion(+)');
    } else {
      addLine('error', `Command not found: ${command}`);
      addLine('output', 'Type "help" for available commands');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(currentCommand);
    }
  };

  const clearTerminal = () => {
    setLines([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Terminal</span>
        </div>
        <Button variant="ghost" size="sm" onClick={clearTerminal} className="h-8 w-8 p-0">
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1 font-mono text-sm">
          {lines.map((line) => (
            <div
              key={line.id}
              className={`flex items-start gap-2 ${
                line.type === 'command'
                  ? 'text-blue-400'
                  : line.type === 'error'
                    ? 'text-red-400'
                    : 'text-muted-foreground'
              }`}
            >
              <span className="text-xs text-muted-foreground/60 min-w-[60px]">
                {formatTime(line.timestamp)}
              </span>
              <span className="flex-1 whitespace-pre-wrap">{line.content}</span>
            </div>
          ))}
          {isExecuting && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs min-w-[60px]">{formatTime(new Date())}</span>
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border border-muted-foreground border-r-transparent"></div>
                <span className="text-sm">Executing...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terminal Input */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground">$</span>
          <Input
            ref={inputRef}
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isExecuting}
            placeholder="Enter command (type 'help' for available commands)"
            className="flex-1 font-mono text-sm bg-background"
            autoFocus
          />
          <Button
            onClick={() => executeCommand(currentCommand)}
            disabled={isExecuting || !currentCommand.trim()}
            size="sm"
            className="h-9"
          >
            <Play size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
