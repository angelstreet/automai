"""
Execution Results Database Operations

This module provides functions for managing execution results in the database.
Execution results track edge actions and node verifications with metrics.
"""

from datetime import datetime
from typing import Dict, Optional
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def record_edge_execution(
    team_id: str,
    tree_id: str,
    edge_id: str,
    host_name: str,
    device_model: str,
    success: bool,
    execution_time_ms: int,
    message: str = "",
    error_details: Optional[Dict] = None
) -> Optional[str]:
    """Record edge action execution directly to database."""
    try:
        execution_id = str(uuid4())
        
        execution_data = {
            'id': execution_id,
            'team_id': team_id,
            'tree_id': tree_id,
            'edge_id': edge_id,
            'execution_type': 'action',
            'host_name': host_name,
            'device_model': device_model,
            'success': success,
            'execution_time_ms': execution_time_ms,
            'message': message,
            'error_details': error_details,
            'executed_at': datetime.now().isoformat()
        }
        
        supabase = get_supabase()
        result = supabase.table('execution_results').insert(execution_data).execute()
        
        if result.data:
            print(f"[@db:execution_results:record_edge_execution] Success: {execution_id}")
            return execution_id
        else:
            print(f"[@db:execution_results:record_edge_execution] Failed")
            return None
            
    except Exception as e:
        print(f"[@db:execution_results:record_edge_execution] Error: {str(e)}")
        return None

def record_node_execution(
    team_id: str,
    tree_id: str,
    node_id: str,
    host_name: str,
    device_model: str,
    success: bool,
    execution_time_ms: int,
    message: str = "",
    error_details: Optional[Dict] = None
) -> Optional[str]:
    """Record node verification execution directly to database."""
    try:
        execution_id = str(uuid4())
        
        execution_data = {
            'id': execution_id,
            'team_id': team_id,
            'tree_id': tree_id,
            'node_id': node_id,
            'execution_type': 'verification',
            'host_name': host_name,
            'device_model': device_model,
            'success': success,
            'execution_time_ms': execution_time_ms,
            'message': message,
            'error_details': error_details,
            'executed_at': datetime.now().isoformat()
        }
        
        # Log the actual values being used in the request
        print(f"[@db:execution_results:record_node_execution] ACTUAL REQUEST DATA:")
        print(f"  - team_id: {team_id}")
        print(f"  - tree_id: {tree_id}")
        print(f"  - node_id: {node_id}")
        print(f"  - execution_type: verification")
        print(f"  - host_name: {host_name}")
        print(f"  - device_model: {device_model}")
        print(f"  - success: {success}")
        print(f"  - execution_time_ms: {execution_time_ms}")
        print(f"  - message: {message}")
        print(f"  - error_details: {error_details}")
        
        supabase = get_supabase()
        result = supabase.table('execution_results').insert(execution_data).execute()
        
        if result.data:
            print(f"[@db:execution_results:record_node_execution] Success: {execution_id}")
            return execution_id
        else:
            print(f"[@db:execution_results:record_node_execution] Failed")
            return None
            
    except Exception as e:
        print(f"[@db:execution_results:record_node_execution] Error: {str(e)}")
        return None

def get_edge_metrics(team_id: str, edge_id: str) -> Dict:
    """Get metrics for a specific edge."""
    try:
        supabase = get_supabase()
        
        result = supabase.table('execution_results').select(
            'success', 'execution_time_ms', 'executed_at'
        ).eq('team_id', team_id).eq('edge_id', edge_id).eq(
            'execution_type', 'action'
        ).order('executed_at', desc=True).limit(50).execute()
        
        if not result.data:
            return {'volume': 0, 'success_rate': 0.0, 'avg_execution_time': 0}
        
        executions = result.data
        volume = len(executions)
        successful = sum(1 for ex in executions if ex['success'])
        success_rate = successful / volume if volume > 0 else 0.0
        
        valid_times = [ex['execution_time_ms'] for ex in executions if ex['execution_time_ms']]
        avg_execution_time = sum(valid_times) / len(valid_times) if valid_times else 0
        
        return {
            'volume': volume,
            'success_rate': success_rate,
            'avg_execution_time': int(avg_execution_time)
        }
        
    except Exception as e:
        print(f"[@db:execution_results:get_edge_metrics] Error: {str(e)}")
        return {'volume': 0, 'success_rate': 0.0, 'avg_execution_time': 0}

def get_node_metrics(team_id: str, node_id: str) -> Dict:
    """Get metrics for a specific node."""
    try:
        supabase = get_supabase()
        
        result = supabase.table('execution_results').select(
            'success', 'execution_time_ms', 'executed_at'
        ).eq('team_id', team_id).eq('node_id', node_id).eq(
            'execution_type', 'verification'
        ).order('executed_at', desc=True).limit(50).execute()
        
        if not result.data:
            return {'volume': 0, 'success_rate': 0.0, 'avg_execution_time': 0}
        
        executions = result.data
        volume = len(executions)
        successful = sum(1 for ex in executions if ex['success'])
        success_rate = successful / volume if volume > 0 else 0.0
        
        valid_times = [ex['execution_time_ms'] for ex in executions if ex['execution_time_ms']]
        avg_execution_time = sum(valid_times) / len(valid_times) if valid_times else 0
        
        return {
            'volume': volume,
            'success_rate': success_rate,
            'avg_execution_time': int(avg_execution_time)
        }
        
    except Exception as e:
        print(f"[@db:execution_results:get_node_metrics] Error: {str(e)}")
        return {'volume': 0, 'success_rate': 0.0, 'avg_execution_time': 0} 