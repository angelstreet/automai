export interface TestCase {
  test_id: string;
  name: string;
  test_type: 'functional' | 'performance' | 'endurance' | 'robustness';
  start_node: string;
  steps: {
    target_node: string;
    verify: {
      type: 'single' | 'compound';
      operator?: 'AND' | 'OR';
      conditions: { type: string; condition: string; timeout: number }[];
    };
  }[];
  // New fields for Phase 2 device integration
  device_name?: string;
  environment_profile_id?: string;
  verification_conditions?: VerificationCondition[];
  expected_results?: { [key: string]: any };
  execution_config?: { [key: string]: any };
  tags?: string[];
  priority?: number; // 1-5 scale
  estimated_duration?: number; // in seconds
}

export interface Campaign {
  campaign_id: string;
  campaign_name: string;
  navigation_tree_id: string;
  remote_controller: string;
  audio_video_acquisition: string;
  test_case_ids: string[];
  auto_tests?: { mode: string; nodes?: string[] };
  prioritize: boolean;
}

export interface Tree {
  tree_id: string;
  device: string;
  version: string;
  nodes: {
    [key: string]: {
      id: string;
      actions: {
        to: string;
        action: string;
        params: { [key: string]: any };
        verification: {
          type: 'single' | 'compound';
          operator?: 'AND' | 'OR';
          conditions: { type: string; condition: string; timeout: number }[];
        };
      }[];
    };
  };
}

// New interface for verification conditions
export interface VerificationCondition {
  id: string;
  type:
    | 'image_appears'
    | 'text_appears'
    | 'element_exists'
    | 'audio_playing'
    | 'video_playing'
    | 'color_present'
    | 'screen_state'
    | 'performance_metric';
  description: string;
  parameters: { [key: string]: any };
  timeout: number;
  critical: boolean; // If true, test fails if this condition fails
}
