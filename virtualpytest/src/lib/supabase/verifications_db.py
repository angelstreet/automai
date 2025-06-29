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

def find_existing_verification(team_id: str, device_model: str, verification_type: str, command: str, params: Dict = None) -> Dict:
    """
    Find existing verification with the same parameters to avoid duplicates.
    
    Args:
        team_id: Team ID for RLS
        device_model: Device model (e.g., 'android_mobile')
        verification_type: Verification type ('adb', 'image', 'text', etc.)
        command: The verification command
        params: Parameters to match (includes timeout if applicable)
        
    Returns:
        Dict: {'success': bool, 'verification': Dict | None, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:verifications:find_existing_verification] Looking for existing verification: {verification_type}/{command}")
        
        # Query for verifications with matching basic criteria
        result = supabase.table('verifications').select('*').eq('team_id', team_id).eq('device_model', device_model).eq('verification_type', verification_type).eq('command', command).execute()
        
        if result.data:
            # Check for exact parameter match (timeout is included in parameters)
            for verification in result.data:
                existing_params = verification.get('params', {})
                
                # Compare parameters (which includes timeout)
                if existing_params == (params or {}):
                    print(f"[@db:verifications:find_existing_verification] Found matching verification: {verification['id']}")
                    return {
                        'success': True,
                        'verification': verification
                    }
        
        print(f"[@db:verifications:find_existing_verification] No matching verification found")
        return {
            'success': True,
            'verification': None
        }
        
    except Exception as e:
        print(f"[@db:verifications:find_existing_verification] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'verification': None
        }

def save_verification(name: str, device_model: str, verification_type: str, command: str, team_id: str, params: Dict = None) -> Dict:
    """
    Save verification definition to database.
    
    Args:
        name: Verification name/identifier
        device_model: Device model (e.g., 'android_mobile')
        verification_type: Verification type ('adb', 'image', 'text', etc.)
        command: The verification command/search term
        team_id: Team ID for RLS
        params: JSONB parameters including timeout, references, etc. (optional)
        
    Returns:
        Dict: {'success': bool, 'verification_id': str, 'verification': Dict, 'reused': bool, 'error': str}
    """
    try:
        # First, check if a verification with the same parameters already exists
        existing_result = find_existing_verification(
            team_id=team_id,
            device_model=device_model,
            verification_type=verification_type,
            command=command,
            params=params
        )
        
        if not existing_result['success']:
            return existing_result
        
        if existing_result['verification']:
            # Reuse existing verification
            existing_verification = existing_result['verification']
            print(f"[@db:verifications:save_verification] Reusing existing verification: {existing_verification['id']}")
            return {
                'success': True,
                'verification_id': existing_verification['id'],
                'verification': existing_verification,
                'reused': True
            }
        
        # No existing verification found, create a new one
        supabase = get_supabase()
        
        # Prepare verification data - only store essential fields
        verification_data = {
            'name': name,
            'device_model': device_model,
            'verification_type': verification_type,
            'command': command,
            'team_id': team_id,
            'params': params or {},  # Store as JSONB directly (includes timeout, references, etc.)
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"[@db:verifications:save_verification] Creating new verification: {name} ({verification_type}) for model: {device_model}")
        
        # Use insert since we checked for duplicates already
        result = supabase.table('verifications').insert(verification_data).execute()
        
        if result.data:
            saved_verification = result.data[0]
            print(f"[@db:verifications:save_verification] Successfully created verification: {saved_verification['id']}")
            return {
                'success': True,
                'verification_id': saved_verification['id'],
                'verification': saved_verification,
                'reused': False
            }
        else:
            print(f"[@db:verifications:save_verification] No data returned from insert")
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