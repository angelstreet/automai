"""
Script Results Database Operations

This module provides functions for managing script execution results in the database.
Script results track validation and test script executions with reports and metrics.
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def record_script_execution_start(
    team_id: str,
    script_name: str,
    script_type: str,
    host_name: str,
    device_name: str,
    userinterface_name: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> Optional[str]:
    """Record script execution start in database."""
    try:
        script_result_id = str(uuid4())
        
        script_data = {
            'id': script_result_id,
            'team_id': team_id,
            'script_name': script_name,
            'script_type': script_type,
            'userinterface_name': userinterface_name,
            'host_name': host_name,
            'device_name': device_name,
            'success': False,  # Will be updated on completion
            'started_at': datetime.now().isoformat(),
            'completed_at': datetime.now().isoformat(),  # Temporary, will be updated
            'metadata': metadata
        }
        
        print(f"[@db:script_results:record_script_execution_start] Starting script execution:")
        print(f"  - script_result_id: {script_result_id}")
        print(f"  - team_id: {team_id}")
        print(f"  - script_name: {script_name}")
        print(f"  - script_type: {script_type}")
        print(f"  - host_name: {host_name}")
        print(f"  - device_name: {device_name}")
        print(f"  - userinterface_name: {userinterface_name}")
        
        supabase = get_supabase()
        result = supabase.table('script_results').insert(script_data).execute()
        
        if result.data:
            print(f"[@db:script_results:record_script_execution_start] Success: {script_result_id}")
            return script_result_id
        else:
            print(f"[@db:script_results:record_script_execution_start] Failed")
            return None
            
    except Exception as e:
        print(f"[@db:script_results:record_script_execution_start] Error: {str(e)}")
        return None

def update_script_execution_result(
    script_result_id: str,
    success: bool,
    execution_time_ms: Optional[int] = None,
    html_report_r2_path: Optional[str] = None,
    html_report_r2_url: Optional[str] = None,
    error_msg: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> bool:
    """Update script execution with final results."""
    try:
        update_data = {
            'success': success,
            'completed_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        if execution_time_ms is not None:
            update_data['execution_time_ms'] = execution_time_ms
        if html_report_r2_path:
            update_data['html_report_r2_path'] = html_report_r2_path
        if html_report_r2_url:
            update_data['html_report_r2_url'] = html_report_r2_url
        if error_msg:
            update_data['error_msg'] = error_msg
        if metadata:
            update_data['metadata'] = metadata
        
        print(f"[@db:script_results:update_script_execution_result] Updating script execution:")
        print(f"  - script_result_id: {script_result_id}")
        print(f"  - success: {success}")
        print(f"  - execution_time_ms: {execution_time_ms}")
        print(f"  - html_report_r2_url: {html_report_r2_url}")
        print(f"  - error_msg: {error_msg}")
        
        supabase = get_supabase()
        result = supabase.table('script_results').update(update_data).eq('id', script_result_id).execute()
        
        if result.data:
            print(f"[@db:script_results:update_script_execution_result] Success")
            return True
        else:
            print(f"[@db:script_results:update_script_execution_result] Failed")
            return False
            
    except Exception as e:
        print(f"[@db:script_results:update_script_execution_result] Error: {str(e)}")
        return False

def get_script_results(
    team_id: str,
    script_name: Optional[str] = None,
    script_type: Optional[str] = None,
    userinterface_name: Optional[str] = None,
    include_discarded: bool = False,
    limit: int = 50
) -> Dict:
    """Get script results with filtering."""
    try:
        print(f"[@db:script_results:get_script_results] Getting script results:")
        print(f"  - team_id: {team_id}")
        print(f"  - script_name: {script_name}")
        print(f"  - script_type: {script_type}")
        print(f"  - userinterface_name: {userinterface_name}")
        print(f"  - include_discarded: {include_discarded}")
        print(f"  - limit: {limit}")
        
        supabase = get_supabase()
        query = supabase.table('script_results').select('*').eq('team_id', team_id)
        
        # Add filters
        if script_name:
            query = query.eq('script_name', script_name)
        if script_type:
            query = query.eq('script_type', script_type)
        if userinterface_name:
            query = query.eq('userinterface_name', userinterface_name)
        if not include_discarded:
            query = query.eq('discard', False)
        
        # Execute query with ordering and limit
        result = query.order('created_at', desc=True).limit(limit).execute()
        
        print(f"[@db:script_results:get_script_results] Found {len(result.data)} script results")
        return {
            'success': True,
            'script_results': result.data,
            'count': len(result.data)
        }
        
    except Exception as e:
        print(f"[@db:script_results:get_script_results] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'script_results': [],
            'count': 0
        }

def get_script_history(team_id: str, script_name: str, script_type: str, limit: int = 20) -> Dict:
    """Get execution history for a specific script."""
    try:
        print(f"[@db:script_results:get_script_history] Getting history for {script_name} ({script_type})")
        
        supabase = get_supabase()
        result = supabase.table('script_results').select('*').eq('team_id', team_id).eq('script_name', script_name).eq('script_type', script_type).eq('discard', False).order('created_at', desc=True).limit(limit).execute()
        
        print(f"[@db:script_results:get_script_history] Found {len(result.data)} history entries")
        return {
            'success': True,
            'history': result.data,
            'count': len(result.data)
        }
        
    except Exception as e:
        print(f"[@db:script_results:get_script_history] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'history': [],
            'count': 0
        }

def mark_script_discarded(team_id: str, script_result_id: str, discard: bool = True) -> bool:
    """Mark script result as discarded (false positive)."""
    try:
        print(f"[@db:script_results:mark_script_discarded] Marking script {script_result_id} as discarded: {discard}")
        
        supabase = get_supabase()
        result = supabase.table('script_results').update({
            'discard': discard,
            'updated_at': datetime.now().isoformat()
        }).eq('id', script_result_id).eq('team_id', team_id).execute()
        
        if result.data:
            print(f"[@db:script_results:mark_script_discarded] Success")
            return True
        else:
            print(f"[@db:script_results:mark_script_discarded] Failed - script not found")
            return False
            
    except Exception as e:
        print(f"[@db:script_results:mark_script_discarded] Error: {str(e)}")
        return False

def delete_script_result(team_id: str, script_result_id: str) -> bool:
    """Delete script result from database."""
    try:
        print(f"[@db:script_results:delete_script_result] Deleting script result: {script_result_id}")
        
        supabase = get_supabase()
        result = supabase.table('script_results').delete().eq('id', script_result_id).eq('team_id', team_id).execute()
        
        if result.data:
            print(f"[@db:script_results:delete_script_result] Success")
            return True
        else:
            print(f"[@db:script_results:delete_script_result] Failed - script not found")
            return False
            
    except Exception as e:
        print(f"[@db:script_results:delete_script_result] Error: {str(e)}")
        return False 