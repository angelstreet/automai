'use client';

import { Copy, Loader2, Play } from 'lucide-react';
import { useState, useEffect } from 'react';

import {
  getBrowserStatus,
  executeBrowserTask,
} from '@/app/actions/browserAutomationActions';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Textarea } from '@/components/shadcn/textarea';
import { useToast } from '@/components/shadcn/use-toast';
import { useBrowserAutomation } from '@/context';

import EmbeddedHostInterface from './EmbeddedHostInterface';

interface BrowserAutomationState {
  isExecuting: boolean;
  taskInput: string;
  taskResult: string;
  logOutput: string;
  serverInitialized: boolean;
  serverExecuting: boolean;
  currentTask: string | null;
  startTime: string | null;
}

const EXAMPLE_TASKS = ['Go to TV Guide', 'Click on Live TV then wait 3s'];

export default function BrowserAutomationClient() {
  const { toast } = useToast();
  const { isInitialized, activeHost } = useBrowserAutomation();

  const [state, setState] = useState<BrowserAutomationState>({
    isExecuting: false,
    taskInput: '',
    taskResult: '',
    logOutput: '',
    serverInitialized: false,
    serverExecuting: false,
    currentTask: null,
    startTime: null,
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

  // Check server status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await getBrowserStatus();
        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            serverInitialized: result.data!.initialized,
            serverExecuting: result.data!.executing,
            currentTask: result.data!.current_task,
            startTime: result.data!.start_time,
          }));

          // Update logs if they changed
          if (result.data.logs && result.data.logs !== state.logOutput) {
            setState((prev) => ({
              ...prev,
              logOutput: result.data!.logs,
            }));
          }
        }
      } catch (error) {
        console.error('[@component:BrowserAutomationClient] Error checking status:', error);
      }
    };

    // Only check status if automation is initialized
    if (isInitialized) {
      checkStatus();
      const interval = setInterval(checkStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, state.logOutput]);

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

    if (!isInitialized || !state.serverInitialized) {
      toast({
        title: 'Error',
        description: 'Browser automation not initialized. Please start the automation system first.',
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

    try {
      const result = await executeBrowserTask(state.taskInput);

      if (result.success && result.data) {
        const taskOutput = `Task:\n${state.taskInput}\n\n${'='.repeat(50)}\n\nResult:\n${result.data.result}`;

        setState((prev) => ({
          ...prev,
          isExecuting: false,
          taskResult: taskOutput,
          taskInput: '',
          logOutput: result.data!.logs,
        }));

        // Show success/failure toast based on status
        const isSuccess = result.data.status === 'SUCCESS';
        toast({
          title: isSuccess ? 'Success' : 'Task Completed with Issues',
          description: isSuccess ? 'Task executed successfully!' : 'Task completed but encountered some issues',
          variant: isSuccess ? 'default' : 'destructive',
        });
      } else {
        setState((prev) => ({
          ...prev,
          isExecuting: false,
          taskResult: `Task:\n${state.taskInput}\n\n${'='.repeat(50)}\n\nError:\n${result.error}`,
          taskInput: '',
        }));

        toast({
          title: 'Error',
          description: result.error || 'Task execution failed',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isExecuting: false,
        taskResult: `Task:\n${state.taskInput}\n\n${'='.repeat(50)}\n\nError:\n${error.message}`,
        taskInput: '',
      }));

      updateLog(`Error: ${error.message}`);

      toast({
        title: 'Error',
        description: error.message || 'Failed to execute task',
        variant: 'destructive',
      });
    }
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
    <div className="max-w-6xl mx-auto space-y-2">
      {/* Embedded Host Interface */}
      <EmbeddedHostInterface host={activeHost} isVisible={!!activeHost} />

      {/* Status Message */}
      {!isInitialized && (
        <Card>
          <CardContent className="py-4">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">
                Please take control of a host and click "Start" to begin browser automation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Input - Only show if initialized */}
      {isInitialized && (
        <Card>
          <CardHeader className="pb-0 pt-3">
            <CardTitle className="text-sm font-medium">Task Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2 pb-3">
            {/* Task Input - Inline Label */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Textarea
                  placeholder="Enter your task here..."
                  value={state.taskInput}
                  onChange={(e) => setState((prev) => ({ ...prev, taskInput: e.target.value }))}
                  rows={2}
                  className="resize-none text-sm flex-1"
                  disabled={state.isExecuting || state.serverExecuting}
                />
              </div>

              <Button
                onClick={handleExecuteTask}
                disabled={
                  !state.serverInitialized ||
                  state.isExecuting ||
                  state.serverExecuting ||
                  !state.taskInput.trim()
                }
                className="w-full flex items-center gap-2 h-8"
                variant="default"
                size="sm"
              >
                {state.isExecuting || state.serverExecuting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {state.isExecuting || state.serverExecuting ? 'Executing Task...' : 'Execute Task'}
              </Button>

              {/* Example Tasks - Inline */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground min-w-fit">Examples:</span>
                {EXAMPLE_TASKS.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleClick(example)}
                    className="text-xs h-6 px-2"
                    disabled={state.isExecuting || state.serverExecuting}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output Areas - Only show if initialized */}
      {isInitialized && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Task Result - Compact */}
          <Card>
            <CardHeader className="pb-0 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Task Result</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <Textarea
                value={state.taskResult}
                readOnly
                rows={10}
                className="resize-none font-mono text-xs"
                placeholder="Task results will appear here..."
              />
            </CardContent>
          </Card>

          {/* Log Output - Compact */}
          <Card>
            <CardHeader className="pb-0 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Log Output</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLogs}
                  disabled={!state.logOutput}
                  className="flex items-center gap-1 h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                  <span className="text-xs">Copy</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <Textarea
                value={state.logOutput}
                readOnly
                rows={10}
                className="resize-none font-mono text-xs"
                placeholder="Logs will appear here..."
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Bar - Only show if initialized */}
      {isInitialized && (
        <Card>
          <CardContent className="py-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      state.serverInitialized ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-xs">
                    Browser: {state.serverInitialized ? 'Ready' : 'Not Initialized'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      state.serverExecuting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-xs">
                    Task: {state.serverExecuting ? 'Executing' : 'Idle'}
                  </span>
                </div>

                {state.currentTask && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Current: {state.currentTask}</span>
                  </div>
                )}
              </div>

              <div className="text-xs">
                {state.startTime ? `Started: ${state.startTime}` : 'Ready for automation tasks'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 