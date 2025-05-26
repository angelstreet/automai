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