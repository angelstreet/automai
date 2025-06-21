"""
Verifications Database Operations - Clean and Simple

This module provides functions for managing verification definitions in the database.
"""

from datetime import datetime
from typing import Dict, List, Optional

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def save_verification(name: str, device_model: str, verification_type: str, command: str, team_id: str, parameters: Dict = None, timeout: int = None, r2_path: str = None, r2_url: str = None, area: Dict = None) -> Dict:
    """
    Save verification definition to database.
    
    Args:
        name: Verification name/identifier
        device_model: Device model (e.g., 'android_mobile')
        verification_type: Verification type ('adb', 'image', 'text', etc.)
        command: The verification command/search term
        team_id: Team ID for RLS
        parameters: Additional parameters (optional)
        timeout: Timeout in milliseconds (optional)
        r2_path: Path in R2 storage (for image verifications)
        r2_url: Complete R2 URL (for image verifications)
        area: Area coordinates (for image verifications)
        
    Returns:
        Dict: {'success': bool, 'verification_id': str, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        # Prepare verification data
        verification_data = {
            'name': name,
            'device_model': device_model,
            'verification_type': verification_type,
            'command': command,
            'team_id': team_id,
            'parameters': parameters,  # Store as JSONB directly
            'timeout': timeout,
            'r2_path': r2_path,
            'r2_url': r2_url,
            'area': area,  # Store as JSONB directly
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"[@db:verifications:save_verification] Saving verification: {name} ({verification_type}) for model: {device_model}")
        
        # Use upsert to handle duplicates (INSERT or UPDATE)
        result = supabase.table('verifications').upsert(
            verification_data,
            on_conflict='team_id,name,device_model,verification_type'
        ).execute()
        
        if result.data:
            saved_verification = result.data[0]
            print(f"[@db:verifications:save_verification] Successfully saved verification: {saved_verification['id']}")
            return {
                'success': True,
                'verification_id': saved_verification['id'],
                'verification': saved_verification
            }
        else:
            print(f"[@db:verifications:save_verification] No data returned from upsert")
            return {
                'success': False,
                'error': 'No data returned from database'
            }
            
    except Exception as e:
        print(f"[@db:verifications:save_verification] Error saving verification: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def get_verifications(team_id: str, verification_type: str = None, device_model: str = None, name: str = None) -> Dict:
    """
    Get verifications with optional filtering.
    
    Args:
        team_id: Team ID for RLS
        verification_type: Filter by type ('adb', 'image', 'text', etc.)
        device_model: Filter by device model
        name: Filter by name (partial match)
        
    Returns:
        Dict: {'success': bool, 'verifications': List[Dict], 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:verifications:get_verifications] Getting verifications with filters: type={verification_type}, model={device_model}, name={name}")
        
        # Start with base query
        query = supabase.table('verifications').select('*').eq('team_id', team_id)
        
        # Add filters
        if verification_type:
            query = query.eq('verification_type', verification_type)
        if device_model:
            query = query.eq('device_model', device_model)
        if name:
            query = query.ilike('name', f'%{name}%')
        
        # Execute query with ordering
        result = query.order('created_at', desc=True).execute()
        
        print(f"[@db:verifications:get_verifications] Found {len(result.data)} verifications")
        return {
            'success': True,
            'verifications': result.data
        }
        
    except Exception as e:
        print(f"[@db:verifications:get_verifications] Error getting verifications: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'verifications': []
        }

def get_all_verifications(team_id: str) -> Dict:
    """
    Get all verifications for a team.
    
    Args:
        team_id: Team ID for RLS
        
    Returns:
        Dict: {'success': bool, 'verifications': List[Dict], 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:verifications:get_all_verifications] Getting all verifications for team: {team_id}")
        
        result = supabase.table('verifications').select('*').eq('team_id', team_id).order('created_at', desc=True).execute()
        
        print(f"[@db:verifications:get_all_verifications] Found {len(result.data)} verifications")
        return {
            'success': True,
            'verifications': result.data
        }
        
    except Exception as e:
        print(f"[@db:verifications:get_all_verifications] Error getting verifications: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'verifications': []
        }

def delete_verification(team_id: str, verification_id: str = None, name: str = None, device_model: str = None, verification_type: str = None) -> Dict:
    """
    Delete verification by ID or by identifiers.
    
    Args:
        team_id: Team ID for RLS
        verification_id: Verification ID (if deleting by ID)
        name: Verification name (if deleting by identifiers)
        device_model: Device model (if deleting by identifiers)
        verification_type: Verification type (if deleting by identifiers)
        
    Returns:
        Dict: {'success': bool, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        if verification_id:
            print(f"[@db:verifications:delete_verification] Deleting verification by ID: {verification_id}")
            result = supabase.table('verifications').delete().eq('id', verification_id).eq('team_id', team_id).execute()
        elif name and device_model and verification_type:
            print(f"[@db:verifications:delete_verification] Deleting verification: {name} ({verification_type}) for model: {device_model}")
            result = supabase.table('verifications').delete().eq('name', name).eq('device_model', device_model).eq('verification_type', verification_type).eq('team_id', team_id).execute()
        else:
            return {
                'success': False,
                'error': 'Must provide either verification_id or name/device_model/verification_type'
            }
        
        success = len(result.data) > 0
        if success:
            print(f"[@db:verifications:delete_verification] Successfully deleted verification")
            return {'success': True}
        else:
            print(f"[@db:verifications:delete_verification] Verification not found or already deleted")
            return {
                'success': False,
                'error': 'Verification not found'
            }
        
    except Exception as e:
        print(f"[@db:verifications:delete_verification] Error deleting verification: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        } 