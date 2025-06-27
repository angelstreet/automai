"""
Execution Results Database Operations

This module provides functions for managing execution results in the database.
Execution results track verifications, actions, and navigation executions.
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def record_execution(execution: Dict, team_id: str) -> Optional[str]:
    """Record a single execution result to the database."""
    try:
        execution_id = str(uuid4())
        
        # Prepare execution data with required fields
        execution_data = {
            'id': execution_id,
            'team_id': team_id,
            'execution_category': execution['execution_category'],
            'execution_type': execution['execution_type'],
            'initiator_type': execution['initiator_type'],
            'initiator_id': execution.get('initiator_id'),
            'initiator_name': execution.get('initiator_name'),
            'tree_id': execution.get('tree_id'),
            'host_name': execution['host_name'],
            'device_model': execution.get('device_model'),
            'command': execution['command'],
            'parameters': execution.get('parameters'),
            'image_source_url': execution.get('image_source_url') or execution.get('source_filename'),  # Support both old and new field names
            'execution_order': execution.get('execution_order'),
            'success': execution['success'],
            'execution_time_ms': execution.get('execution_time_ms'),
            'message': execution.get('message'),
            'error_details': execution.get('error_details'),
            'confidence_score': execution.get('confidence_score'),
            'executed_by': execution.get('executed_by'),
            'executed_at': datetime.now().isoformat()
        }
        
        supabase = get_supabase()
        result = supabase.table('execution_results').insert(execution_data).execute()
        
        if result.data:
            print(f"[@db:execution_results:record_execution] Successfully recorded execution: {execution_id}")
            return execution_id
        else:
            print(f"[@db:execution_results:record_execution] Failed to record execution")
            return None
            
    except Exception as e:
        print(f"[@db:execution_results:record_execution] Error recording execution: {str(e)}")
        return None

def record_batch_executions(executions: List[Dict], team_id: str) -> List[str]:
    """Record multiple execution results in a batch."""
    try:
        execution_data = []
        execution_ids = []
        
        for execution in executions:
            execution_id = str(uuid4())
            execution_ids.append(execution_id)
            
            execution_data.append({
                'id': execution_id,
                'team_id': team_id,
                'execution_category': execution['execution_category'],
                'execution_type': execution['execution_type'],
                'initiator_type': execution['initiator_type'],
                'initiator_id': execution.get('initiator_id'),
                'initiator_name': execution.get('initiator_name'),
                'tree_id': execution.get('tree_id'),
                'host_name': execution['host_name'],
                'device_model': execution.get('device_model'),
                'command': execution['command'],
                'parameters': execution.get('parameters'),
                'image_source_url': execution.get('image_source_url') or execution.get('source_filename'),  # Support both old and new field names
                'execution_order': execution.get('execution_order'),
                'success': execution['success'],
                'execution_time_ms': execution.get('execution_time_ms'),
                'message': execution.get('message'),
                'error_details': execution.get('error_details'),
                'confidence_score': execution.get('confidence_score'),
                'executed_by': execution.get('executed_by'),
                'executed_at': datetime.now().isoformat()
            })
        
        supabase = get_supabase()
        result = supabase.table('execution_results').insert(execution_data).execute()
        
        if result.data:
            print(f"[@db:execution_results:record_batch_executions] Successfully recorded {len(execution_ids)} executions")
            return execution_ids
        else:
            print(f"[@db:execution_results:record_batch_executions] Failed to record batch executions")
            return []
            
    except Exception as e:
        print(f"[@db:execution_results:record_batch_executions] Error recording batch executions: {str(e)}")
        return []

def get_execution_confidence(
    team_id: str,
    execution_category: str,
    initiator_type: str,
    initiator_id: str,
    execution_type: Optional[str] = None,
    limit: int = 10
) -> Dict:
    """Get confidence score for a specific context."""
    try:
        supabase = get_supabase()
        
        # Build query
        query = supabase.table('execution_results').select('success').eq('team_id', team_id).eq(
            'execution_category', execution_category
        ).eq('initiator_type', initiator_type).eq('initiator_id', initiator_id)
        
        if execution_type:
            query = query.eq('execution_type', execution_type)
        
        result = query.order('executed_at', desc=True).limit(limit).execute()
        
        if not result.data:
            return {
                'total_executions': 0,
                'successful_executions': 0,
                'confidence_score': 0.5,
                'last_execution_at': None
            }
        
        executions = result.data
        total_executions = len(executions)
        successful_executions = sum(1 for ex in executions if ex['success'])
        confidence_score = successful_executions / total_executions if total_executions > 0 else 0.5
        
        # Get latest execution timestamp
        latest_result = supabase.table('execution_results').select('executed_at').eq('team_id', team_id).eq(
            'execution_category', execution_category
        ).eq('initiator_type', initiator_type).eq('initiator_id', initiator_id).order('executed_at', desc=True).limit(1).execute()
        
        last_execution_at = latest_result.data[0]['executed_at'] if latest_result.data else None
        
        return {
            'total_executions': total_executions,
            'successful_executions': successful_executions,
            'confidence_score': confidence_score,
            'last_execution_at': last_execution_at
        }
        
    except Exception as e:
        print(f"[@db:execution_results:get_execution_confidence] Error getting confidence: {str(e)}")
        return {
            'total_executions': 0,
            'successful_executions': 0,
            'confidence_score': 0.5,
            'last_execution_at': None
        }

def get_execution_history(
    team_id: str,
    execution_category: str,
    initiator_type: str,
    initiator_id: str,
    limit: int = 20
) -> List[Dict]:
    """Get recent execution history for a context."""
    try:
        supabase = get_supabase()
        
        result = supabase.table('execution_results').select(
            'id', 'execution_type', 'command', 'success', 'execution_time_ms', 'message', 'executed_at'
        ).eq('team_id', team_id).eq('execution_category', execution_category).eq(
            'initiator_type', initiator_type
        ).eq('initiator_id', initiator_id).order('executed_at', desc=True).limit(limit).execute()
        
        return [dict(execution) for execution in result.data]
        
    except Exception as e:
        print(f"[@db:execution_results:get_execution_history] Error getting history: {str(e)}")
        return []

def get_team_execution_stats(team_id: str, days: int = 7) -> List[Dict]:
    """Get team execution statistics for the last N days."""
    try:
        supabase = get_supabase()
        
        # Calculate date threshold
        from datetime import timedelta
        threshold_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        result = supabase.table('execution_results').select(
            'execution_category', 'initiator_type', 'success'
        ).eq('team_id', team_id).gte('executed_at', threshold_date).execute()
        
        if not result.data:
            return []
        
        # Group and calculate statistics
        stats = {}
        for execution in result.data:
            key = (execution['execution_category'], execution['initiator_type'])
            if key not in stats:
                stats[key] = {'total': 0, 'successful': 0}
            
            stats[key]['total'] += 1
            if execution['success']:
                stats[key]['successful'] += 1
        
        # Format results
        team_stats = []
        for (category, initiator), data in stats.items():
            success_rate = data['successful'] / data['total'] if data['total'] > 0 else 0
            team_stats.append({
                'execution_category': category,
                'initiator_type': initiator,
                'total_executions': data['total'],
                'successful_executions': data['successful'],
                'failed_executions': data['total'] - data['successful'],
                'success_rate': success_rate
            })
        
        return team_stats
        
    except Exception as e:
        print(f"[@db:execution_results:get_team_execution_stats] Error getting team stats: {str(e)}")
        return []

# Convenience functions for specific execution types
def record_verification(
    team_id: str,
    initiator_type: str,
    initiator_id: str,
    initiator_name: str,
    host_name: str,
    device_model: str,
    verification_type: str,
    command: str,
    parameters: Dict,
    image_source_url: str = None,  # New field name
    success: bool = True,
    execution_time_ms: int = 0,
    message: str = "",
    error_details: Optional[Dict] = None,
    confidence_score: Optional[float] = None,
    execution_order: Optional[int] = None,
    source_filename: str = None  # Backward compatibility
) -> Optional[str]:
    """Convenience function for recording verification executions."""
    # Support both old and new field names
    final_image_source_url = image_source_url or source_filename
    
    execution = {
        'execution_category': 'verification',
        'execution_type': verification_type,
        'initiator_type': initiator_type,
        'initiator_id': initiator_id,
        'initiator_name': initiator_name,
        'host_name': host_name,
        'device_model': device_model,
        'command': command,
        'parameters': parameters,
        'image_source_url': final_image_source_url,
        'source_filename': final_image_source_url,  # Backward compatibility
        'success': success,
        'execution_time_ms': execution_time_ms,
        'message': message,
        'error_details': error_details,
        'confidence_score': confidence_score,
        'execution_order': execution_order
    }
    return record_execution(execution, team_id)

def record_action(
    team_id: str,
    initiator_type: str,
    initiator_id: str,
    initiator_name: str,
    host_name: str,
    device_model: str,
    action_type: str,
    command: str,
    parameters: Dict,
    success: bool,
    execution_time_ms: int,
    message: str,
    error_details: Optional[Dict] = None,
    execution_order: Optional[int] = None
) -> Optional[str]:
    """Convenience function for recording action executions."""
    execution = {
        'execution_category': 'action',
        'execution_type': action_type,
        'initiator_type': initiator_type,
        'initiator_id': initiator_id,
        'initiator_name': initiator_name,
        'host_name': host_name,
        'device_model': device_model,
        'command': command,
        'parameters': parameters,
        'success': success,
        'execution_time_ms': execution_time_ms,
        'message': message,
        'error_details': error_details,
        'execution_order': execution_order
    }
    return record_execution(execution, team_id) 