import { useState, useCallback } from 'react';

interface MCPTaskResponse {
  success: boolean;
  result?: string;
  tool_executed?: string;
  tool_result?: any;
  ai_analysis?: string;
  execution_log?: any[];
  error?: string;
}

interface UseMCPTaskReturn {
  // Panel state
  isPanelVisible: boolean;
  togglePanel: () => void;
  closePanel: () => void;

  // Task state
  currentTask: string;
  setCurrentTask: (task: string) => void;

  // Execution state
  isExecuting: boolean;
  lastResponse: MCPTaskResponse | null;

  // Actions
  executeTask: () => Promise<void>;
  clearResponse: () => void;
}

export const useMCPTask = (): UseMCPTaskReturn => {
  // Panel visibility state
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  // Task input state
  const [currentTask, setCurrentTask] = useState('');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResponse, setLastResponse] = useState<MCPTaskResponse | null>(null);

  // Toggle panel visibility
  const togglePanel = useCallback(() => {
    setIsPanelVisible((prev) => !prev);
    // Clear response when opening panel
    if (!isPanelVisible) {
      setLastResponse(null);
    }
  }, [isPanelVisible]);

  // Close panel
  const closePanel = useCallback(() => {
    setIsPanelVisible(false);
    setLastResponse(null);
  }, []);

  // Execute MCP task
  const executeTask = useCallback(async () => {
    if (!currentTask.trim() || isExecuting) {
      return;
    }

    setIsExecuting(true);
    setLastResponse(null);

    try {
      const response = await fetch('/server/mcp/execute-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: currentTask.trim(),
        }),
      });

      const data: MCPTaskResponse = await response.json();

      if (response.ok) {
        setLastResponse(data);
        // Clear task input on success
        if (data.success) {
          setCurrentTask('');
        }
      } else {
        setLastResponse({
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error) {
      console.error('[useMCPTask] Execute task error:', error);
      setLastResponse({
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [currentTask, isExecuting]);

  // Clear response
  const clearResponse = useCallback(() => {
    setLastResponse(null);
  }, []);

  return {
    // Panel state
    isPanelVisible,
    togglePanel,
    closePanel,

    // Task state
    currentTask,
    setCurrentTask,

    // Execution state
    isExecuting,
    lastResponse,

    // Actions
    executeTask,
    clearResponse,
  };
};
