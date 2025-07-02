import { useState, useCallback } from 'react';

import { Host, Device } from '../../types/common/Host_Types';

interface ExecutionLogEntry {
  timestamp: string;
  type: string;
  action_type: string;
  value: any;
  description: string;
}

interface UseAIAgentProps {
  host: Host;
  device: Device;
  enabled?: boolean;
}

interface UseAIAgentReturn {
  // State
  isExecuting: boolean;
  currentStep: string;
  executionLog: ExecutionLogEntry[];
  taskInput: string;
  errorMessage: string | null;

  // AI plan from backend
  aiPlan: any;
  isPlanFeasible: boolean;

  // Actions
  setTaskInput: (input: string) => void;
  executeTask: () => Promise<void>;
  stopExecution: () => Promise<void>;
  clearLog: () => void;
}

export const useAIAgent = ({ host, device, enabled = true }: UseAIAgentProps): UseAIAgentReturn => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI plan response
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [isPlanFeasible, setIsPlanFeasible] = useState<boolean>(true);

  const executeTask = useCallback(async () => {
    if (!enabled || !taskInput.trim() || isExecuting) return;

    try {
      setIsExecuting(true);
      setErrorMessage(null);
      setCurrentStep('Asking AI for execution plan...');
      setExecutionLog([]);
      setAiPlan(null);
      setIsPlanFeasible(true);

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
        setCurrentStep(result.current_step || 'Plan generated');
        setExecutionLog(result.execution_log || []);

        // Extract AI plan from execution_log
        const executionLog = result.execution_log || [];
        const planEntry = executionLog.find(
          (entry: ExecutionLogEntry) =>
            entry.action_type === 'plan_generated' && entry.type === 'ai_plan',
        );

        if (planEntry && planEntry.value) {
          setAiPlan(planEntry.value);
          setIsPlanFeasible(planEntry.value.feasible !== false);
        }
      } else {
        setErrorMessage(result.error || 'Failed to generate plan');
        setCurrentStep('Plan generation failed');
        setExecutionLog(result.execution_log || []);
        setIsPlanFeasible(false);
      }
    } catch (error) {
      console.error('[useAIAgent] Task execution error:', error);
      setErrorMessage('Network error during plan generation');
      setCurrentStep('Error');
      setIsPlanFeasible(false);
    } finally {
      setIsExecuting(false);
    }
  }, [enabled, taskInput, isExecuting, host, device?.device_id]);

  const stopExecution = useCallback(async () => {
    if (!enabled || !isExecuting) return;

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
  }, [enabled, isExecuting, host, device?.device_id]);

  const clearLog = useCallback(() => {
    setExecutionLog([]);
    setErrorMessage(null);
    setCurrentStep('');
    setAiPlan(null);
    setIsPlanFeasible(true);
  }, []);

  return {
    // State
    isExecuting,
    currentStep,
    executionLog,
    taskInput,
    errorMessage,
    aiPlan,
    isPlanFeasible,

    // Actions
    setTaskInput,
    executeTask,
    stopExecution,
    clearLog,
  };
};
