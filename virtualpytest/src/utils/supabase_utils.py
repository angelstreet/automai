import os
from supabase import create_client, Client
from typing import Dict, List, Optional
from datetime import datetime
from uuid import uuid4
import json

# Initialize Supabase client using the simple pattern
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def save_test_case(test_case: Dict, team_id: str, creator_id: str = None) -> None:
    """Save test case to Supabase test_cases table."""
    test_case['test_id'] = test_case.get('test_id', str(uuid4()))
    
    try:
        supabase.table('test_cases').insert({
            'test_id': test_case['test_id'],
            'name': test_case['name'],
            'test_type': test_case['test_type'],
            'start_node': test_case['start_node'],
            'steps': json.dumps(test_case.get('steps', [])),
            'team_id': team_id,
            'creator_id': creator_id
        }).execute()
    except Exception:
        # Update existing test case
        supabase.table('test_cases').update({
            'name': test_case['name'],
            'test_type': test_case['test_type'],
            'start_node': test_case['start_node'],
            'steps': json.dumps(test_case.get('steps', [])),
            'updated_at': datetime.now().isoformat()
        }).eq('test_id', test_case['test_id']).eq('team_id', team_id).execute()

def save_tree(tree: Dict, team_id: str, creator_id: str = None) -> None:
    """Save navigation tree to Supabase navigation_trees table."""
    tree['tree_id'] = tree.get('tree_id', str(uuid4()))
    
    try:
        supabase.table('navigation_trees').insert({
            'tree_id': tree['tree_id'],
            'name': tree['name'],
            'description': tree.get('description', ''),
            'nodes': json.dumps(tree.get('nodes', [])),
            'team_id': team_id,
            'creator_id': creator_id
        }).execute()
    except Exception:
        # Update existing tree
        supabase.table('navigation_trees').update({
            'name': tree['name'],
            'description': tree.get('description', ''),
            'nodes': json.dumps(tree.get('nodes', [])),
            'updated_at': datetime.now().isoformat()
        }).eq('tree_id', tree['tree_id']).eq('team_id', team_id).execute()

def save_campaign(campaign: Dict, team_id: str, creator_id: str = None) -> None:
    """Save campaign to Supabase campaigns table."""
    campaign['campaign_id'] = campaign.get('campaign_id', str(uuid4()))
    
    try:
        supabase.table('campaigns').insert({
            'campaign_id': campaign['campaign_id'],
            'name': campaign['name'],
            'description': campaign.get('description', ''),
            'test_case_ids': campaign.get('test_case_ids', []),
            'navigation_tree_id': campaign.get('tree_id'),
            'prioritization_enabled': campaign.get('prioritization_enabled', False),
            'team_id': team_id,
            'creator_id': creator_id
        }).execute()
    except Exception:
        # Update existing campaign
        supabase.table('campaigns').update({
            'name': campaign['name'],
            'description': campaign.get('description', ''),
            'test_case_ids': campaign.get('test_case_ids', []),
            'navigation_tree_id': campaign.get('tree_id'),
            'prioritization_enabled': campaign.get('prioritization_enabled', False),
            'updated_at': datetime.now().isoformat()
        }).eq('campaign_id', campaign['campaign_id']).eq('team_id', team_id).execute()

def save_result(test_id: str, name: str, test_type: str, node: str, outcome: str, 
               duration: float, steps: List[Dict], team_id: str) -> None:
    """Save test result to Supabase test_executions table."""
    supabase.table('test_executions').insert({
        'test_id': test_id,
        'name': name,
        'test_type': test_type,
        'node': node,
        'outcome': outcome,
        'duration': duration,
        'steps': json.dumps(steps),
        'team_id': team_id
    }).execute()

def get_test_case(test_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve test case by test_id from Supabase."""
    result = supabase.table('test_cases').select(
        'test_id', 'name', 'test_type', 'start_node', 'steps', 'created_at', 'updated_at'
    ).eq('test_id', test_id).eq('team_id', team_id).execute()
    
    if result.data:
        test_case = dict(result.data[0])
        test_case['steps'] = json.loads(test_case['steps']) if test_case['steps'] else []
        return test_case
    return None

def get_tree(tree_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve navigation tree by tree_id from Supabase."""
    result = supabase.table('navigation_trees').select(
        'tree_id', 'name', 'description', 'nodes', 'created_at', 'updated_at'
    ).eq('tree_id', tree_id).eq('team_id', team_id).execute()
    
    if result.data:
        tree = dict(result.data[0])
        tree['nodes'] = json.loads(tree['nodes']) if tree['nodes'] else []
        return tree
    return None

def get_campaign(campaign_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve campaign by campaign_id from Supabase."""
    result = supabase.table('campaigns').select(
        'campaign_id', 'name', 'description', 'test_case_ids', 'navigation_tree_id', 
        'prioritization_enabled', 'created_at', 'updated_at'
    ).eq('campaign_id', campaign_id).eq('team_id', team_id).execute()
    
    if result.data:
        campaign = dict(result.data[0])
        campaign['tree_id'] = campaign.pop('navigation_tree_id', None)
        return campaign
    return None

def get_all_test_cases(team_id: str) -> List[Dict]:
    """Retrieve all test cases for a team from Supabase."""
    result = supabase.table('test_cases').select(
        'test_id', 'name', 'test_type', 'start_node', 'steps', 'created_at', 'updated_at'
    ).eq('team_id', team_id).execute()
    
    test_cases = []
    for test_case in result.data:
        test_case = dict(test_case)
        test_case['steps'] = json.loads(test_case['steps']) if test_case['steps'] else []
        test_cases.append(test_case)
    return test_cases

def get_all_trees(team_id: str) -> List[Dict]:
    """Retrieve all navigation trees for a team from Supabase."""
    result = supabase.table('navigation_trees').select(
        'tree_id', 'name', 'description', 'nodes', 'created_at', 'updated_at'
    ).eq('team_id', team_id).execute()
    
    trees = []
    for tree in result.data:
        tree = dict(tree)
        tree['nodes'] = json.loads(tree['nodes']) if tree['nodes'] else []
        trees.append(tree)
    return trees

def get_all_campaigns(team_id: str) -> List[Dict]:
    """Retrieve all campaigns for a team from Supabase."""
    result = supabase.table('campaigns').select(
        'campaign_id', 'name', 'description', 'test_case_ids', 'navigation_tree_id', 
        'prioritization_enabled', 'created_at', 'updated_at'
    ).eq('team_id', team_id).execute()
    
    campaigns = []
    for campaign in result.data:
        campaign = dict(campaign)
        campaign['tree_id'] = campaign.pop('navigation_tree_id', None)
        campaigns.append(campaign)
    return campaigns

def delete_test_case(test_id: str, team_id: str) -> bool:
    """Delete test case from Supabase."""
    result = supabase.table('test_cases').delete().eq('test_id', test_id).eq('team_id', team_id).execute()
    return len(result.data) > 0

def delete_tree(tree_id: str, team_id: str) -> bool:
    """Delete navigation tree from Supabase."""
    result = supabase.table('navigation_trees').delete().eq('tree_id', tree_id).eq('team_id', team_id).execute()
    return len(result.data) > 0

def delete_campaign(campaign_id: str, team_id: str) -> bool:
    """Delete campaign from Supabase."""
    result = supabase.table('campaigns').delete().eq('campaign_id', campaign_id).eq('team_id', team_id).execute()
    return len(result.data) > 0

def get_failure_rates(team_id: str) -> Dict:
    """Get failure rates and statistics from test results."""
    try:
        # Get total test results
        total_result = supabase.table('test_results').select('id', count='exact').eq('team_id', team_id).execute()
        total_tests = total_result.count or 0
        
        # Get failed test results
        failed_result = supabase.table('test_results').select('id', count='exact').eq('team_id', team_id).eq('status', 'failed').execute()
        failed_tests = failed_result.count or 0
        
        # Get passed test results
        passed_result = supabase.table('test_results').select('id', count='exact').eq('team_id', team_id).eq('status', 'passed').execute()
        passed_tests = passed_result.count or 0
        
        failure_rate = (failed_tests / total_tests * 100) if total_tests > 0 else 0
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'failure_rate': round(failure_rate, 2)
        }
    except Exception as e:
        print(f"Error getting failure rates: {e}")
        return {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'failure_rate': 0
        } 