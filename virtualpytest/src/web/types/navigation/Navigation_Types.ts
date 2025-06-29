// =====================================================
// NAVIGATION EDGE ACTION TYPES
// =====================================================

// Edge action for navigation workflows (simplified structure for navigation use)
export interface EdgeAction {
  id: string;
  command: string;
  params: {
    // Common parameters for all actions
    delay?: number; // Wait time after execution (in seconds)
    
    // Remote action parameters
    key?: string; // For press_key commands (UP, DOWN, LEFT, RIGHT, etc.)
    text?: string; // For input_text commands
    package?: string; // For launch_app/close_app commands
    x?: number; // For coordinate tap commands
    y?: number; // For coordinate tap commands
    element_identifier?: string; // For click_element commands
    input?: string; // Generic input field for requiresInput actions
    
    // Legacy compatibility
    [key: string]: any;
  };
  description?: string;
  
  // Execution results (populated after execution)
  success?: boolean;
  message?: string;
  error?: string;
  executedAt?: string;
  resultType?: 'SUCCESS' | 'FAIL' | 'ERROR';
  executionTime?: number;
}

// Remove the old import and use our new definition
// export type { EdgeAction } from '../controller/Action_Types'; 