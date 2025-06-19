"""
Images Database Operations - Clean and Simple

This module provides functions for managing images (screenshots and reference images) in the database.
"""

from datetime import datetime
from typing import Dict, List, Optional

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def save_image(name: str, device_model: str, type: str, r2_path: str, r2_url: str, team_id: str, area: Dict = None) -> Dict:
    """
    Save image to database.
    
    Args:
        name: Image name/identifier
        device_model: Device model (e.g., 'android_mobile')
        type: Image type ('screenshot' or 'reference_image')
        r2_path: Path in R2 storage
        r2_url: Complete R2 URL
        team_id: Team ID for RLS
        area: Area coordinates (optional)
        
    Returns:
        Dict: {'success': bool, 'image_id': str, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        # Prepare image data
        image_data = {
            'name': name,
            'device_model': device_model,
            'type': type,
            'r2_path': r2_path,
            'r2_url': r2_url,
            'team_id': team_id,
            'area': area,  # Store as JSONB directly
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"[@db:images:save_image] Saving image: {name} ({type}) for model: {device_model}")
        
        # Use upsert to handle duplicates (INSERT or UPDATE)
        result = supabase.table('images').upsert(
            image_data,
            on_conflict='team_id,name,device_model,type'
        ).execute()
        
        if result.data:
            saved_image = result.data[0]
            print(f"[@db:images:save_image] Successfully saved image: {saved_image['id']}")
            return {
                'success': True,
                'image_id': saved_image['id'],
                'image': saved_image
            }
        else:
            print(f"[@db:images:save_image] No data returned from upsert")
            return {
                'success': False,
                'error': 'No data returned from database'
            }
            
    except Exception as e:
        print(f"[@db:images:save_image] Error saving image: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def get_images(team_id: str, image_type: str = None, device_model: str = None, name: str = None) -> Dict:
    """
    Get images with optional filtering.
    
    Args:
        team_id: Team ID for RLS
        image_type: Filter by type ('screenshot' or 'reference_image')
        device_model: Filter by device model
        name: Filter by name (partial match)
        
    Returns:
        Dict: {'success': bool, 'images': List[Dict], 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:images:get_images] Getting images with filters: type={image_type}, model={device_model}, name={name}")
        
        # Start with base query
        query = supabase.table('images').select('*').eq('team_id', team_id)
        
        # Add filters
        if image_type:
            query = query.eq('type', image_type)
        if device_model:
            query = query.eq('device_model', device_model)
        if name:
            query = query.ilike('name', f'%{name}%')
        
        # Execute query with ordering
        result = query.order('created_at', desc=True).execute()
        
        print(f"[@db:images:get_images] Found {len(result.data)} images")
        return {
            'success': True,
            'images': result.data
        }
        
    except Exception as e:
        print(f"[@db:images:get_images] Error getting images: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'images': []
        }

def get_all_images(team_id: str) -> Dict:
    """
    Get all images for a team.
    
    Args:
        team_id: Team ID for RLS
        
    Returns:
        Dict: {'success': bool, 'images': List[Dict], 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:images:get_all_images] Getting all images for team: {team_id}")
        
        result = supabase.table('images').select('*').eq('team_id', team_id).order('created_at', desc=True).execute()
        
        print(f"[@db:images:get_all_images] Found {len(result.data)} images")
        return {
            'success': True,
            'images': result.data
        }
        
    except Exception as e:
        print(f"[@db:images:get_all_images] Error getting images: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'images': []
        }

def delete_image(team_id: str, image_id: str = None, name: str = None, device_model: str = None, image_type: str = None) -> Dict:
    """
    Delete image by ID or by identifiers.
    
    Args:
        team_id: Team ID for RLS
        image_id: Image ID (if deleting by ID)
        name: Image name (if deleting by identifiers)
        device_model: Device model (if deleting by identifiers)
        image_type: Image type (if deleting by identifiers)
        
    Returns:
        Dict: {'success': bool, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        if image_id:
            print(f"[@db:images:delete_image] Deleting image by ID: {image_id}")
            result = supabase.table('images').delete().eq('id', image_id).eq('team_id', team_id).execute()
        elif name and device_model and image_type:
            print(f"[@db:images:delete_image] Deleting image: {name} ({image_type}) for model: {device_model}")
            result = supabase.table('images').delete().eq('name', name).eq('device_model', device_model).eq('type', image_type).eq('team_id', team_id).execute()
        else:
            return {
                'success': False,
                'error': 'Must provide either image_id or name/device_model/image_type'
            }
        
        success = len(result.data) > 0
        if success:
            print(f"[@db:images:delete_image] Successfully deleted image")
            return {'success': True}
        else:
            print(f"[@db:images:delete_image] Image not found or already deleted")
            return {
                'success': False,
                'error': 'Image not found'
            }
        
    except Exception as e:
        print(f"[@db:images:delete_image] Error deleting image: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        } 