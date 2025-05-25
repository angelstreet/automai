'use client';

import { useState } from 'react';
import { Copy, Loader2, Play } from 'lucide-react';

import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Textarea } from '@/components/shadcn/textarea';
import { useToast } from '@/components/shadcn/use-toast';

import { useBrowserAutomation } from '../context/BrowserAutomationContext';

interface BrowserAutomationState {
  isExecuting: boolean;
  taskInput: string;
  taskResult: string;
  logOutput: string;
}

const EXAMPLE_TASKS = ['Go to TV Guide', 'Click on Live TV then wait 3s'];

export default function BrowserAutomationClient() {
  const { toast } = useToast();
  const { isInitialized, startTime } = useBrowserAutomation();

  const [state, setState] = useState<BrowserAutomationState>({
    isExecuting: false,
    taskInput: '',
    taskResult: '',
    logOutput: '',
  });

  // Helper function to update logs
  const updateLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;

    setState((prev) => ({
      ...prev,
      logOutput: prev.logOutput ? `${prev.logOutput}\n${formattedMessage}` : formattedMessage,
    }));
  };

  // Execute task action
  const handleExecuteTask = async () => {
    if (!state.taskInput.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a task before clicking Execute',
        variant: 'destructive',
      });
      return;
    }

    if (!isInitialized) {
      toast({
        title: 'Error',
        description: 'Browser not initialized. Please start the automation system first.',
        variant: 'destructive',
      });
      return;
    }

    setState((prev) => ({ ...prev, isExecuting: true }));
    updateLog(`Executing new task:\n${state.taskInput}`);

    toast({
      title: 'Task Execution',
      description: 'Executing browser automation task...',
    });

    // Simulate task execution
    setTimeout(() => {
      const actions = [
        'Navigated to target page',
        'Located target element',
        'Performed click action',
        'Waited for page load',
        'Task completed successfully',
      ];

      const taskOutput = `Task:\n${state.taskInput}\n\n${'='.repeat(50)}\n\nResult:\nActions performed:\n${actions.map((action) => `- ${action}`).join('\n')}`;

      setState((prev) => ({
        ...prev,
        isExecuting: false,
        taskResult: taskOutput,
        taskInput: '',
      }));

      actions.forEach((action) => {
        updateLog(`Action completed: ${action}`);
      });
      updateLog('Task execution completed');

      toast({
        title: 'Success',
        description: 'Task executed successfully!',
      });
    }, 3000);
  };

  // Handle example task selection
  const handleExampleClick = (example: string) => {
    setState((prev) => ({ ...prev, taskInput: example }));
    toast({
      title: 'Example Selected',
      description: `Selected example: "${example}"`,
    });
  };

  // Copy log output to clipboard
  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(state.logOutput);
      toast({
        title: 'Success',
        description: 'Logs copied to clipboard!',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy logs to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Task Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your task here..."
            value={state.taskInput}
            onChange={(e) => setState((prev) => ({ ...prev, taskInput: e.target.value }))}
            rows={3}
            className="resize-none"
          />

          <Button
            onClick={handleExecuteTask}
            disabled={!isInitialized || state.isExecuting || !state.taskInput.trim()}
            className="w-full flex items-center gap-2"
            variant="default"
          >
            {state.isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {state.isExecuting ? 'Executing Task...' : 'Execute Task'}
          </Button>

          {/* Example Tasks */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Example Tasks</h4>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_TASKS.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleClick(example)}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Result */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Result</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={state.taskResult}
              readOnly
              rows={12}
              className="resize-none font-mono text-sm"
              placeholder="Task results will appear here..."
            />
          </CardContent>
        </Card>

        {/* Log Output */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Log Output</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLogs}
              disabled={!state.logOutput}
              className="flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={state.logOutput}
              readOnly
              rows={12}
              className="resize-none font-mono text-sm"
              placeholder="Logs will appear here..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Status Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isInitialized ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <span>Browser Status: {isInitialized ? 'Ready' : 'Not Initialized'}</span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    state.isExecuting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                <span>Task Status: {state.isExecuting ? 'Executing' : 'Idle'}</span>
              </div>
            </div>

            <div>Ready for automation tasks</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 