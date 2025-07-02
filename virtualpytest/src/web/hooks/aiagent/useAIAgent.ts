import { useState, useCallback } from 'react';

import { Host, Device } from '../../types/common/Host_Types';

interface ExecutionLogEntry {
  timestamp: number;
  type: string;
  action_type: string;
  description: string;
  success: boolean;
}

interface UseAIAgentProps {
  host: Host;
  device: Device;
}

interface UseAIAgentReturn {
  // State
  isExecuting: boolean;
  currentStep: string;
  executionLog: ExecutionLogEntry[];
  taskInput: string;
  errorMessage: string | null;

  // Suggested actions/verifications from AI
  suggestedAction: any;
  suggestedVerification: any;

  // Actions
  setTaskInput: (input: string) => void;
  executeTask: () => Promise<void>;
  stopExecution: () => Promise<void>;
  clearLog: () => void;
}

export const useAIAgent = ({ host, device }: UseAIAgentProps): UseAIAgentReturn => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI suggestions
  const [suggestedAction, setSuggestedAction] = useState<any>(null);
  const [suggestedVerification, setSuggestedVerification] = useState<any>(null);

  const executeTask = useCallback(async () => {
    if (!taskInput.trim() || isExecuting) return;

    try {
      setIsExecuting(true);
      setErrorMessage(null);
      setCurrentStep('Starting task execution...');
      setExecutionLog([]);
      setSuggestedAction(null);
      setSuggestedVerification(null);

      console.log('[useAIAgent] Executing task:', taskInput);

      const response = await fetch('/server/aiagent/executeTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: device?.device_id,
          task_description: taskInput.trim(),
        }),
      });

      const result = await response.json();
      console.log('[useAIAgent] Task execution result:', result);

      if (result.success) {
        setCurrentStep(result.current_step || 'Task completed');
        setExecutionLog(result.execution_log || []);
        setSuggestedAction(result.suggested_action);
        setSuggestedVerification(result.suggested_verification);
      } else {
        setErrorMessage(result.error || 'Task execution failed');
        setCurrentStep('Task failed');
        setExecutionLog(result.execution_log || []);
      }
    } catch (error) {
      console.error('[useAIAgent] Task execution error:', error);
      setErrorMessage('Network error during task execution');
      setCurrentStep('Error');
    } finally {
      setIsExecuting(false);
    }
  }, [taskInput, isExecuting, host, device?.device_id]);

  const stopExecution = useCallback(async () => {
    if (!isExecuting) return;

    try {
      console.log('[useAIAgent] Stopping task execution');

      const response = await fetch('/server/aiagent/stopExecution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: device?.device_id,
        }),
      });

      const result = await response.json();
      console.log('[useAIAgent] Stop execution result:', result);

      if (result.success) {
        setCurrentStep('Stopped by user');
        setExecutionLog(result.execution_log || []);
      }
    } catch (error) {
      console.error('[useAIAgent] Stop execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, host, device?.device_id]);

  const clearLog = useCallback(() => {
    setExecutionLog([]);
    setErrorMessage(null);
    setCurrentStep('');
    setSuggestedAction(null);
    setSuggestedVerification(null);
  }, []);

  return {
    // State
    isExecuting,
    currentStep,
    executionLog,
    taskInput,
    errorMessage,
    suggestedAction,
    suggestedVerification,

    // Actions
    setTaskInput,
    executeTask,
    stopExecution,
    clearLog,
  };
};
