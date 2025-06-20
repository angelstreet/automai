import { createClient } from '../supabase/server';
import { cookies } from 'next/headers';

// Types for execution results
export interface ExecutionResult {
  id?: string;
  team_id: string;

  // Execution categorization
  execution_category: 'verification' | 'action' | 'navigation';
  execution_type: string; // 'image_verification', 'text_verification', 'click_action', 'scroll_action', etc.

  // Initiator context (where was this triggered from?)
  initiator_type: 'editor' | 'node' | 'edge' | 'standalone' | 'batch';
  initiator_id?: string; // node_id, edge_id, test_case_id, etc.
  initiator_name?: string; // human-readable name
  tree_id?: string;

  // Device information
  host_name: string;
  device_model?: string;

  // Execution details
  command: string; // what was executed
  parameters?: Record<string, any>;

  // Execution context
  source_filename?: string;
  execution_order?: number;

  // Results
  success: boolean;
  execution_time_ms?: number;
  message?: string;
  error_details?: Record<string, any>;
  confidence_score?: number;

  // Metadata
  executed_by?: string;
  executed_at?: string;
}

export interface ExecutionConfidence {
  total_executions: number;
  successful_executions: number;
  confidence_score: number;
  last_execution_at: string | null;
}

export interface ExecutionHistory {
  id: string;
  execution_type: string;
  command: string;
  success: boolean;
  execution_time_ms: number | null;
  message: string | null;
  executed_at: string;
}

export interface TeamExecutionStats {
  execution_category: string;
  initiator_type: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
}

/**
 * Database service for execution results tracking
 * Handles verifications, actions, and navigation executions
 */
export class ExecutionResultsDb {
  private static async getClient() {
    const cookieStore = await cookies();
    return createClient(cookieStore);
  }

  /**
   * Record a single execution result
   */
  static async recordExecution(
    execution: ExecutionResult,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      console.log('[@db:executionResults:recordExecution] Recording execution:', {
        execution_category: execution.execution_category,
        execution_type: execution.execution_type,
        initiator_type: execution.initiator_type,
        initiator_id: execution.initiator_id,
        command: execution.command,
        success: execution.success,
      });

      const supabase = await this.getClient();

      const { data, error } = await supabase
        .from('execution_results')
        .insert([execution])
        .select('id')
        .single();

      if (error) {
        console.error('[@db:executionResults:recordExecution] Error inserting execution:', error);
        return { success: false, error: error.message };
      }

      console.log(
        '[@db:executionResults:recordExecution] Successfully recorded execution:',
        data.id,
      );
      return { success: true, id: data.id };
    } catch (error: any) {
      console.error('[@db:executionResults:recordExecution] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record multiple executions in a batch
   */
  static async recordBatchExecutions(
    executions: ExecutionResult[],
  ): Promise<{ success: boolean; ids?: string[]; error?: string }> {
    try {
      console.log(
        '[@db:executionResults:recordBatchExecutions] Recording batch of',
        executions.length,
        'executions',
      );

      const supabase = await this.getClient();

      const { data, error } = await supabase
        .from('execution_results')
        .insert(executions)
        .select('id');

      if (error) {
        console.error(
          '[@db:executionResults:recordBatchExecutions] Error inserting batch executions:',
          error,
        );
        return { success: false, error: error.message };
      }

      const ids = data.map((row) => row.id);
      console.log(
        '[@db:executionResults:recordBatchExecutions] Successfully recorded',
        ids.length,
        'executions',
      );
      return { success: true, ids };
    } catch (error: any) {
      console.error('[@db:executionResults:recordBatchExecutions] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get confidence score for a specific context
   */
  static async getConfidence(
    teamId: string,
    executionCategory: 'verification' | 'action' | 'navigation',
    initiatorType: 'editor' | 'node' | 'edge' | 'standalone' | 'batch',
    initiatorId: string,
    executionType?: string,
    limit: number = 10,
  ): Promise<{ success: boolean; data?: ExecutionConfidence; error?: string }> {
    try {
      console.log('[@db:executionResults:getConfidence] Getting confidence for:', {
        teamId,
        executionCategory,
        initiatorType,
        initiatorId,
        executionType,
        limit,
      });

      const supabase = await this.getClient();

      const { data, error } = await supabase.rpc('get_execution_confidence', {
        p_team_id: teamId,
        p_execution_category: executionCategory,
        p_initiator_type: initiatorType,
        p_initiator_id: initiatorId,
        p_execution_type: executionType || null,
        p_limit: limit,
      });

      if (error) {
        console.error('[@db:executionResults:getConfidence] Error getting confidence:', error);
        return { success: false, error: error.message };
      }

      const result = data?.[0] || {
        total_executions: 0,
        successful_executions: 0,
        confidence_score: 0.5,
        last_execution_at: null,
      };

      console.log(
        '[@db:executionResults:getConfidence] Successfully retrieved confidence:',
        result,
      );
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[@db:executionResults:getConfidence] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent execution history for a context
   */
  static async getHistory(
    teamId: string,
    executionCategory: 'verification' | 'action' | 'navigation',
    initiatorType: 'editor' | 'node' | 'edge' | 'standalone' | 'batch',
    initiatorId: string,
    limit: number = 20,
  ): Promise<{ success: boolean; data?: ExecutionHistory[]; error?: string }> {
    try {
      console.log('[@db:executionResults:getHistory] Getting history for:', {
        teamId,
        executionCategory,
        initiatorType,
        initiatorId,
        limit,
      });

      const supabase = await this.getClient();

      const { data, error } = await supabase.rpc('get_execution_history', {
        p_team_id: teamId,
        p_execution_category: executionCategory,
        p_initiator_type: initiatorType,
        p_initiator_id: initiatorId,
        p_limit: limit,
      });

      if (error) {
        console.error('[@db:executionResults:getHistory] Error getting history:', error);
        return { success: false, error: error.message };
      }

      console.log(
        '[@db:executionResults:getHistory] Successfully retrieved',
        data?.length || 0,
        'history records',
      );
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('[@db:executionResults:getHistory] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get team execution statistics
   */
  static async getTeamStats(
    teamId: string,
    days: number = 7,
  ): Promise<{ success: boolean; data?: TeamExecutionStats[]; error?: string }> {
    try {
      console.log(
        '[@db:executionResults:getTeamStats] Getting team stats for:',
        teamId,
        'last',
        days,
        'days',
      );

      const supabase = await this.getClient();

      const { data, error } = await supabase.rpc('get_team_execution_stats', {
        p_team_id: teamId,
        p_days: days,
      });

      if (error) {
        console.error('[@db:executionResults:getTeamStats] Error getting team stats:', error);
        return { success: false, error: error.message };
      }

      console.log(
        '[@db:executionResults:getTeamStats] Successfully retrieved team stats:',
        data?.length || 0,
        'categories',
      );
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('[@db:executionResults:getTeamStats] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // CONVENIENCE METHODS FOR SPECIFIC USE CASES
  // =====================================================

  /**
   * Convenience method for recording verification executions
   */
  static async recordVerification(
    teamId: string,
    initiatorType: 'editor' | 'node' | 'edge' | 'standalone',
    initiatorId: string,
    initiatorName: string,
    hostName: string,
    deviceModel: string,
    verificationType:
      | 'image_verification'
      | 'text_verification'
      | 'ocr_verification'
      | 'adb_verification',
    command: string,
    parameters: Record<string, any>,
    sourceFilename: string,
    success: boolean,
    executionTimeMs: number,
    message: string,
    errorDetails?: Record<string, any>,
    confidenceScore?: number,
    executionOrder?: number,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const execution: ExecutionResult = {
      team_id: teamId,
      execution_category: 'verification',
      execution_type: verificationType,
      initiator_type: initiatorType,
      initiator_id: initiatorId,
      initiator_name: initiatorName,
      host_name: hostName,
      device_model: deviceModel,
      command: command,
      parameters: parameters,
      source_filename: sourceFilename,
      execution_order: executionOrder,
      success: success,
      execution_time_ms: executionTimeMs,
      message: message,
      error_details: errorDetails,
      confidence_score: confidenceScore,
    };

    return this.recordExecution(execution);
  }

  /**
   * Convenience method for recording action executions
   */
  static async recordAction(
    teamId: string,
    initiatorType: 'edge' | 'standalone' | 'batch',
    initiatorId: string,
    initiatorName: string,
    hostName: string,
    deviceModel: string,
    actionType: 'click_action' | 'scroll_action' | 'input_action' | 'swipe_action' | 'wait_action',
    command: string,
    parameters: Record<string, any>,
    success: boolean,
    executionTimeMs: number,
    message: string,
    errorDetails?: Record<string, any>,
    executionOrder?: number,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const execution: ExecutionResult = {
      team_id: teamId,
      execution_category: 'action',
      execution_type: actionType,
      initiator_type: initiatorType,
      initiator_id: initiatorId,
      initiator_name: initiatorName,
      host_name: hostName,
      device_model: deviceModel,
      command: command,
      parameters: parameters,
      execution_order: executionOrder,
      success: success,
      execution_time_ms: executionTimeMs,
      message: message,
      error_details: errorDetails,
    };

    return this.recordExecution(execution);
  }
}
