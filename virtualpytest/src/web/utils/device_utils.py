"""
Device Database Utilities

This module provides functions for managing devices in the database.
"""

import json
import uuid
from typing import Dict, List, Optional

from utils.supabase_utils import get_supabase_client

def get_all_devices(team_id: str) -> List[Dict]:
    """Retrieve all devices for a team from Supabase."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('device').select(
            'id', 'name', 'description', 'model', 'controller_configs', 'created_at', 'updated_at'
        ).eq('team_id', team_id).order('created_at', desc=False).execute()
        
        devices = []
        for device in result.data:
            devices.append({
                'id': device['id'],
                'name': device['name'],
                'description': device['description'] or '',
                'model': device['model'] or '',
                'controller_configs': device['controller_configs'] or {},
                'created_at': device['created_at'],
                'updated_at': device['updated_at']
            })
        
        return devices
    except Exception as e:
        print(f"❌ Error retrieving devices: {e}")
        return []

def get_device(device_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve a specific device by ID."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('device').select(
            'id', 'name', 'description', 'model', 'controller_configs', 'created_at', 'updated_at'
        ).eq('id', device_id).eq('team_id', team_id).single().execute()
        
        if result.data:
            device = result.data
            return {
                'id': device['id'],
                'name': device['name'],
                'description': device['description'] or '',
                'model': device['model'] or '',
                'controller_configs': device['controller_configs'] or {},
                'created_at': device['created_at'],
                'updated_at': device['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error retrieving device {device_id}: {e}")
        return None

def create_device(device_data: Dict, team_id: str) -> Optional[Dict]:
    """Create a new device."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for insertion - let Supabase auto-generate id, created_at, updated_at
        insert_data = {
            'name': device_data['name'],
            'description': device_data.get('description', ''),
            'model': device_data.get('model', ''),
            'controller_configs': device_data.get('controllerConfigs', {}),  # Handle controller configurations
            'team_id': team_id
        }
        
        print(f"🔍 About to insert device with data: {insert_data}")
        
        result = supabase.table('device').insert(insert_data).execute()
        
        print(f"🔍 Supabase insert result: {result}")
        print(f"🔍 Result data: {result.data}")
        print(f"🔍 Result count: {result.count if hasattr(result, 'count') else 'N/A'}")
        
        if result.data and len(result.data) > 0:
            device = result.data[0]
            print(f"✅ Successfully created device with ID: {device.get('id', 'NO_ID')}")
            return {
                'id': device['id'],
                'name': device['name'],
                'description': device['description'] or '',
                'model': device['model'] or '',
                'controller_configs': device['controller_configs'] or {},
                'created_at': device['created_at'],
                'updated_at': device['updated_at']
            }
        else:
            print(f"❌ No data returned from insert operation")
        return None
    except Exception as e:
        print(f"❌ Error creating device: {e}")
        print(f"❌ Exception type: {type(e)}")
        if hasattr(e, 'details'):
            print(f"❌ Exception details: {e.details}")
        return None

def update_device(device_id: str, device_data: Dict, team_id: str) -> Optional[Dict]:
    """Update an existing device."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for update - let Supabase auto-update updated_at
        update_data = {
            'name': device_data['name'],
            'description': device_data.get('description', ''),
            'model': device_data.get('model', ''),
            'controller_configs': device_data.get('controllerConfigs', {})  # Include controller configurations
        }
        
        result = supabase.table('device').update(update_data).eq('id', device_id).eq('team_id', team_id).execute()
        
        if result.data and len(result.data) > 0:
            device = result.data[0]
            return {
                'id': device['id'],
                'name': device['name'],
                'description': device['description'] or '',
                'model': device['model'] or '',
                'controller_configs': device['controller_configs'] or {},
                'created_at': device['created_at'],
                'updated_at': device['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error updating device {device_id}: {e}")
        return None

def delete_device(device_id: str, team_id: str) -> bool:
    """Delete a device."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('device').delete().eq('id', device_id).eq('team_id', team_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting device {device_id}: {e}")
        return False

def check_device_name_exists(name: str, team_id: str, exclude_id: str = None) -> bool:
    """Check if a device name already exists in the team."""
    supabase = get_supabase_client()
    
    try:
        query = supabase.table('device').select('id').eq('name', name).eq('team_id', team_id)
        
        if exclude_id:
            query = query.neq('id', exclude_id)
        
        result = query.execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"❌ Error checking device name: {e}")
        return False 