"""
Test Case Database Operations

This module provides functions for managing test cases in the database.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def save_test_case(test_case: Dict, team_id: str, creator_id: str = None) -> None:
    """Save test case to Supabase test_cases table."""
    test_case['test_id'] = test_case.get('test_id', str(uuid4()))
    
    supabase = get_supabase()
    try:
        supabase.table('test_cases').insert({
            'test_id': test_case['test_id'],
            'name': test_case['name'],
            'test_type': test_case['test_type'],
            'start_node': test_case['start_node'],
            'steps': json.dumps(test_case.get('steps', [])),
            'team_id': team_id,
            'creator_id': creator_id,
            # New Phase 2 fields
            'device_id': test_case.get('device_id'),
            'environment_profile_id': test_case.get('environment_profile_id'),
            'verification_conditions': json.dumps(test_case.get('verification_conditions', [])),
            'expected_results': json.dumps(test_case.get('expected_results', {})),
            'execution_config': json.dumps(test_case.get('execution_config', {})),
            'tags': test_case.get('tags', []),
            'priority': test_case.get('priority', 1),
            'estimated_duration': test_case.get('estimated_duration', 60)
        }).execute()
    except Exception:
        # Update existing test case
        supabase.table('test_cases').update({
            'name': test_case['name'],
            'test_type': test_case['test_type'],
            'start_node': test_case['start_node'],
            'steps': json.dumps(test_case.get('steps', [])),
            'updated_at': datetime.now().isoformat(),
            # New Phase 2 fields
            'device_id': test_case.get('device_id'),
            'environment_profile_id': test_case.get('environment_profile_id'),
            'verification_conditions': json.dumps(test_case.get('verification_conditions', [])),
            'expected_results': json.dumps(test_case.get('expected_results', {})),
            'execution_config': json.dumps(test_case.get('execution_config', {})),
            'tags': test_case.get('tags', []),
            'priority': test_case.get('priority', 1),
            'estimated_duration': test_case.get('estimated_duration', 60)
        }).eq('test_id', test_case['test_id']).eq('team_id', team_id).execute()

def get_test_case(test_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve test case by test_id from Supabase."""
    supabase = get_supabase()
    result = supabase.table('test_cases').select(
        'test_id', 'name', 'test_type', 'start_node', 'steps', 'created_at', 'updated_at',
        'device_id', 'environment_profile_id', 'verification_conditions', 'expected_results',
        'execution_config', 'tags', 'priority', 'estimated_duration'
    ).eq('test_id', test_id).eq('team_id', team_id).execute()
    
    if result.data:
        test_case = dict(result.data[0])
        test_case['steps'] = json.loads(test_case['steps']) if test_case['steps'] else []
        test_case['verification_conditions'] = json.loads(test_case['verification_conditions']) if test_case['verification_conditions'] else []
        test_case['expected_results'] = json.loads(test_case['expected_results']) if test_case['expected_results'] else {}
        test_case['execution_config'] = json.loads(test_case['execution_config']) if test_case['execution_config'] else {}
        return test_case
    return None

def get_all_test_cases(team_id: str) -> List[Dict]:
    """Retrieve all test cases for a team from Supabase."""
    supabase = get_supabase()
    result = supabase.table('test_cases').select(
        'test_id', 'name', 'test_type', 'start_node', 'steps', 'created_at', 'updated_at',
        'device_id', 'environment_profile_id', 'verification_conditions', 'expected_results',
        'execution_config', 'tags', 'priority', 'estimated_duration'
    ).eq('team_id', team_id).execute()
    
    test_cases = []
    for test_case in result.data:
        test_case = dict(test_case)
        test_case['steps'] = json.loads(test_case['steps']) if test_case['steps'] else []
        test_case['verification_conditions'] = json.loads(test_case['verification_conditions']) if test_case['verification_conditions'] else []
        test_case['expected_results'] = json.loads(test_case['expected_results']) if test_case['expected_results'] else {}
        test_case['execution_config'] = json.loads(test_case['execution_config']) if test_case['execution_config'] else {}
        test_cases.append(test_case)
    return test_cases

def delete_test_case(test_id: str, team_id: str) -> bool:
    """Delete test case from Supabase."""
    supabase = get_supabase()
    result = supabase.table('test_cases').delete().eq('test_id', test_id).eq('team_id', team_id).execute()
    return len(result.data) > 0

def save_result(test_id: str, name: str, test_type: str, node: str, outcome: str, 
               duration: float, steps: List[Dict], team_id: str) -> None:
    """Save test result to Supabase test_executions table."""
    supabase = get_supabase()
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

def get_failure_rates(team_id: str) -> Dict:
    """Get failure rates and statistics from test results."""
    supabase = get_supabase()
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