"""
Database layer for verifications_references table.
Handles reference assets (reference_image and reference_text) separately from verification actions.
"""

from datetime import datetime
from typing import Dict, List, Optional

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def save_reference(name: str, device_model: str, reference_type: str, team_id: str, r2_path: str = None, r2_url: str = None, area: Dict = None) -> Dict:
    """
    Save reference asset to verifications_references table.
    
    Args:
        name: Reference name/identifier
        device_model: Device model (e.g., 'android_mobile')
        reference_type: Reference type ('reference_image' or 'reference_text')
        team_id: Team ID for RLS
        r2_path: Path in R2 storage
        r2_url: Complete R2 URL
        area: Area coordinates and additional data
        
    Returns:
        Dict: {'success': bool, 'reference_id': str, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        # Validate reference_type
        if reference_type not in ['reference_image', 'reference_text']:
            return {
                'success': False,
                'error': 'reference_type must be "reference_image" or "reference_text"'
            }
        
        # Prepare reference data
        reference_data = {
            'name': name,
            'device_model': device_model,
            'reference_type': reference_type,
            'team_id': team_id,
            'r2_path': r2_path,
            'r2_url': r2_url,
            'area': area,  # Store as JSONB directly
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"[@db:verifications_references:save_reference] Saving reference: {name} ({reference_type}) for model: {device_model}")
        
        # Use upsert to handle duplicates (INSERT or UPDATE)
        result = supabase.table('verifications_references').upsert(
            reference_data,
            on_conflict='team_id,name,device_model,reference_type'
        ).execute()
        
        if result.data:
            saved_reference = result.data[0]
            print(f"[@db:verifications_references:save_reference] Successfully saved reference: {saved_reference['id']}")
            return {
                'success': True,
                'reference_id': saved_reference['id'],
                'reference': saved_reference
            }
        else:
            print(f"[@db:verifications_references:save_reference] No data returned from upsert")
            return {
                'success': False,
                'error': 'No data returned from database'
            }
            
    except Exception as e:
        print(f"[@db:verifications_references:save_reference] Error saving reference: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def get_references(team_id: str, reference_type: str = None, device_model: str = None, name: str = None) -> Dict:
    """
    Get references with optional filtering.
    
    Args:
        team_id: Team ID for RLS
        reference_type: Filter by type ('reference_image' or 'reference_text')
        device_model: Filter by device model
        name: Filter by name (partial match)
        
    Returns:
        Dict: {'success': bool, 'references': List[Dict], 'count': int, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:verifications_references:get_references] Getting references with filters: type={reference_type}, model={device_model}, name={name}")
        print(f"[@db:verifications_references:get_references] Using team_id: {team_id}")
        
        # Start with base query
        query = supabase.table('verifications_references').select('*').eq('team_id', team_id)
        
        # Add filters
        if reference_type:
            query = query.eq('reference_type', reference_type)
        if device_model:
            query = query.eq('device_model', device_model)
        if name:
            query = query.ilike('name', f'%{name}%')
        
        # Execute query with ordering
        result = query.order('created_at', desc=True).execute()
        
        print(f"[@db:verifications_references:get_references] Found {len(result.data)} references")
        return {
            'success': True,
            'references': result.data,
            'count': len(result.data)
        }
        
    except Exception as e:
        print(f"[@db:verifications_references:get_references] Error getting references: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'references': [],
            'count': 0
        }

def get_all_references(team_id: str) -> Dict:
    """
    Get all references for a team.
    
    Args:
        team_id: Team ID for RLS
        
    Returns:
        Dict: {'success': bool, 'references': List[Dict], 'count': int, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:verifications_references:get_all_references] Getting all references for team: {team_id}")
        
        result = supabase.table('verifications_references').select('*').eq('team_id', team_id).order('created_at', desc=True).execute()
        
        print(f"[@db:verifications_references:get_all_references] Found {len(result.data)} references")
        return {
            'success': True,
            'references': result.data,
            'count': len(result.data)
        }
        
    except Exception as e:
        print(f"[@db:verifications_references:get_all_references] Error getting references: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'references': [],
            'count': 0
        }

def delete_reference(team_id: str, reference_id: str = None, name: str = None, device_model: str = None, reference_type: str = None) -> Dict:
    """
    Delete reference by ID or by identifiers.
    
    Args:
        team_id: Team ID for RLS
        reference_id: Reference ID (if deleting by ID)
        name: Reference name (if deleting by identifiers)
        device_model: Device model (if deleting by identifiers)
        reference_type: Reference type (if deleting by identifiers)
        
    Returns:
        Dict: {'success': bool, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        if reference_id:
            print(f"[@db:verifications_references:delete_reference] Deleting reference by ID: {reference_id}")
            result = supabase.table('verifications_references').delete().eq('id', reference_id).eq('team_id', team_id).execute()
        elif name and device_model and reference_type:
            print(f"[@db:verifications_references:delete_reference] Deleting reference: {name} ({reference_type}) for model: {device_model}")
            result = supabase.table('verifications_references').delete().eq('name', name).eq('device_model', device_model).eq('reference_type', reference_type).eq('team_id', team_id).execute()
        else:
            return {
                'success': False,
                'error': 'Must provide either reference_id or name/device_model/reference_type'
            }
        
        success = len(result.data) > 0
        if success:
            print(f"[@db:verifications_references:delete_reference] Successfully deleted reference")
            return {'success': True}
        else:
            print(f"[@db:verifications_references:delete_reference] Reference not found or already deleted")
            return {
                'success': False,
                'error': 'Reference not found'
            }
        
    except Exception as e:
        print(f"[@db:verifications_references:delete_reference] Error deleting reference: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
