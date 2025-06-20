import { createClient } from '../supabase/server';
import { cookies } from 'next/headers';

// Types for verification execution
export interface VerificationExecution {
  id?: string;
  team_id: string;
  execution_type: 'node_verification' | 'edge_verification' | 'standalone_verification';
  context_id?: string;
  context_name?: string;
  tree_id?: string;
  host_name: string;
  device_model?: string;
  verification_type: 'image' | 'text' | 'ocr';
  verification_command: string;
  verification_params?: Record<string, any>;
  source_filename?: string;
  execution_batch_id?: string;
  execution_order?: number;
  success: boolean;
  execution_time_ms?: number;
  message?: string;
  error_details?: Record<string, any>;
  confidence_score?: number;
  executed_by?: string;
  executed_at?: string;
}

export interface VerificationConfidence {
  total_executions: number;
  successful_executions: number;
  confidence_score: number;
  last_execution_at: string | null;
}

export interface VerificationHistory {
  id: string;
  verification_command: string;
  success: boolean;
  execution_time_ms: number | null;
  message: string | null;
  executed_at: string;
}

/**
 * Database service for verification results tracking
 */
export class VerificationResultsDb {
  private static async getClient() {
    const cookieStore = await cookies();
    return createClient(cookieStore);
  }

  /**
   * Record a verification execution result
   */
  static async recordExecution(
    execution: VerificationExecution,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      console.log('[@db:verificationResults:recordExecution] Recording verification execution:', {
        execution_type: execution.execution_type,
        context_id: execution.context_id,
        verification_command: execution.verification_command,
        success: execution.success,
      });

      const supabase = await this.getClient();

      const { data, error } = await supabase
        .from('verification_executions')
        .insert([execution])
        .select('id')
        .single();

      if (error) {
        console.error(
          '[@db:verificationResults:recordExecution] Error inserting verification execution:',
          error,
        );
        return { success: false, error: error.message };
      }

      console.log(
        '[@db:verificationResults:recordExecution] Successfully recorded verification execution:',
        data.id,
      );
      return { success: true, id: data.id };
    } catch (error: any) {
      console.error('[@db:verificationResults:recordExecution] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record multiple verification executions in a batch
   */
  static async recordBatchExecutions(
    executions: VerificationExecution[],
  ): Promise<{ success: boolean; ids?: string[]; error?: string }> {
    try {
      console.log(
        '[@db:verificationResults:recordBatchExecutions] Recording batch of',
        executions.length,
        'verification executions',
      );

      const supabase = await this.getClient();

      const { data, error } = await supabase
        .from('verification_executions')
        .insert(executions)
        .select('id');

      if (error) {
        console.error(
          '[@db:verificationResults:recordBatchExecutions] Error inserting batch executions:',
          error,
        );
        return { success: false, error: error.message };
      }

      const ids = data.map((row) => row.id);
      console.log(
        '[@db:verificationResults:recordBatchExecutions] Successfully recorded',
        ids.length,
        'verification executions',
      );
      return { success: true, ids };
    } catch (error: any) {
      console.error('[@db:verificationResults:recordBatchExecutions] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get confidence score for a specific context (node/edge/verification)
   */
  static async getConfidence(
    teamId: string,
    executionType: 'node_verification' | 'edge_verification' | 'standalone_verification',
    contextId: string,
    verificationCommand?: string,
    limit: number = 10,
  ): Promise<{ success: boolean; data?: VerificationConfidence; error?: string }> {
    try {
      console.log('[@db:verificationResults:getConfidence] Getting confidence for:', {
        teamId,
        executionType,
        contextId,
        verificationCommand,
        limit,
      });

      const supabase = await this.getClient();

      const { data, error } = await supabase.rpc('get_verification_confidence', {
        p_team_id: teamId,
        p_execution_type: executionType,
        p_context_id: contextId,
        p_verification_command: verificationCommand || null,
        p_limit: limit,
      });

      if (error) {
        console.error('[@db:verificationResults:getConfidence] Error getting confidence:', error);
        return { success: false, error: error.message };
      }

      const result = data?.[0] || {
        total_executions: 0,
        successful_executions: 0,
        confidence_score: 0.5,
        last_execution_at: null,
      };

      console.log(
        '[@db:verificationResults:getConfidence] Successfully retrieved confidence:',
        result,
      );
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[@db:verificationResults:getConfidence] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent verification history for a context
   */
  static async getHistory(
    teamId: string,
    executionType: 'node_verification' | 'edge_verification' | 'standalone_verification',
    contextId: string,
    limit: number = 20,
  ): Promise<{ success: boolean; data?: VerificationHistory[]; error?: string }> {
    try {
      console.log('[@db:verificationResults:getHistory] Getting history for:', {
        teamId,
        executionType,
        contextId,
        limit,
      });

      const supabase = await this.getClient();

      const { data, error } = await supabase.rpc('get_verification_history', {
        p_team_id: teamId,
        p_execution_type: executionType,
        p_context_id: contextId,
        p_limit: limit,
      });

      if (error) {
        console.error('[@db:verificationResults:getHistory] Error getting history:', error);
        return { success: false, error: error.message };
      }

      console.log(
        '[@db:verificationResults:getHistory] Successfully retrieved',
        data?.length || 0,
        'history records',
      );
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('[@db:verificationResults:getHistory] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get verification statistics for a team
   */
  static async getTeamStats(
    teamId: string,
    days: number = 7,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(
        '[@db:verificationResults:getTeamStats] Getting team stats for:',
        teamId,
        'last',
        days,
        'days',
      );

      const supabase = await this.getClient();

      const { data, error } = await supabase
        .from('verification_executions')
        .select('execution_type, success, executed_at, verification_type')
        .eq('team_id', teamId)
        .gte('executed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('[@db:verificationResults:getTeamStats] Error getting team stats:', error);
        return { success: false, error: error.message };
      }

      // Process statistics
      const stats = {
        total_executions: data.length,
        successful_executions: data.filter((r) => r.success).length,
        failed_executions: data.filter((r) => !r.success).length,
        by_type: {} as Record<string, { total: number; successful: number; failed: number }>,
        by_verification_type: {} as Record<
          string,
          { total: number; successful: number; failed: number }
        >,
        success_rate: data.length > 0 ? data.filter((r) => r.success).length / data.length : 0,
      };

      // Group by execution type
      for (const record of data) {
        if (!stats.by_type[record.execution_type]) {
          stats.by_type[record.execution_type] = { total: 0, successful: 0, failed: 0 };
        }
        stats.by_type[record.execution_type].total++;
        if (record.success) {
          stats.by_type[record.execution_type].successful++;
        } else {
          stats.by_type[record.execution_type].failed++;
        }

        // Group by verification type
        if (!stats.by_verification_type[record.verification_type]) {
          stats.by_verification_type[record.verification_type] = {
            total: 0,
            successful: 0,
            failed: 0,
          };
        }
        stats.by_verification_type[record.verification_type].total++;
        if (record.success) {
          stats.by_verification_type[record.verification_type].successful++;
        } else {
          stats.by_verification_type[record.verification_type].failed++;
        }
      }

      console.log(
        '[@db:verificationResults:getTeamStats] Successfully calculated team stats:',
        stats,
      );
      return { success: true, data: stats };
    } catch (error: any) {
      console.error('[@db:verificationResults:getTeamStats] Unexpected error:', error);
      return { success: false, error: error.message };
    }
  }
}
