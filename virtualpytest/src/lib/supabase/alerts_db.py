"""
Alerts Database Operations

This module provides functions for managing alerts in the database.
Alerts track monitoring incidents with start/end times and device information.
"""

import os
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def create_alert(
    host_name: str,
    device_name: str,
    device_model: str,
    incident_type: str,
    consecutive_count: int = 3,
    metadata: Optional[Dict] = None
) -> Optional[str]:
    """Create a new alert in the database."""
    try:
        alert_id = str(uuid4())
        
        alert_data = {
            'id': alert_id,
            'host_name': host_name,
            'device_name': device_name,
            'device_model': device_model,
            'incident_type': incident_type,
            'status': 'active',
            'consecutive_count': consecutive_count,
            'start_time': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        print(f"[@db:alerts:create_alert] Creating alert:")
        print(f"  - alert_id: {alert_id}")
        print(f"  - host_name: {host_name}")
        print(f"  - device_name: {device_name}")
        print(f"  - incident_type: {incident_type}")
        print(f"  - consecutive_count: {consecutive_count}")
        
        supabase = get_supabase()
        result = supabase.table('alerts').insert(alert_data).execute()
        
        if result.data:
            print(f"[@db:alerts:create_alert] Success: {alert_id}")
            return alert_id
        else:
            print(f"[@db:alerts:create_alert] Failed")
            return None
            
    except Exception as e:
        print(f"[@db:alerts:create_alert] Error: {str(e)}")
        return None

def resolve_alert(alert_id: str) -> bool:
    """Resolve an active alert by setting end_time and status."""
    try:
        print(f"[@db:alerts:resolve_alert] Resolving alert: {alert_id}")
        
        supabase = get_supabase()
        result = supabase.table('alerts').update({
            'status': 'resolved',
            'end_time': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }).eq('id', alert_id).execute()
        
        if result.data:
            print(f"[@db:alerts:resolve_alert] Success: {alert_id}")
            return True
        else:
            print(f"[@db:alerts:resolve_alert] Failed: {alert_id}")
            return False
            
    except Exception as e:
        print(f"[@db:alerts:resolve_alert] Error: {str(e)}")
        return False

def get_active_alerts(
    host_name: Optional[str] = None,
    device_name: Optional[str] = None,
    incident_type: Optional[str] = None
) -> List[Dict]:
    """Get active alerts with optional filtering."""
    try:
        print(f"[@db:alerts:get_active_alerts] Getting active alerts")
        
        supabase = get_supabase()
        query = supabase.table('alerts').select('*').eq('status', 'active')
        
        if host_name:
            query = query.eq('host_name', host_name)
        if device_name:
            query = query.eq('device_name', device_name)
        if incident_type:
            query = query.eq('incident_type', incident_type)
        
        result = query.order('start_time', desc=True).execute()
        
        print(f"[@db:alerts:get_active_alerts] Found {len(result.data)} active alerts")
        return result.data
        
    except Exception as e:
        print(f"[@db:alerts:get_active_alerts] Error: {str(e)}")
        return []

def get_alert_by_id(alert_id: str) -> Optional[Dict]:
    """Get a specific alert by ID."""
    try:
        supabase = get_supabase()
        result = supabase.table('alerts').select('*').eq('id', alert_id).single().execute()
        
        if result.data:
            return result.data
        else:
            return None
            
    except Exception as e:
        print(f"[@db:alerts:get_alert_by_id] Error: {str(e)}")
        return None

def get_alerts_history(
    limit: int = 100,
    incident_type: Optional[str] = None,
    host_name: Optional[str] = None
) -> List[Dict]:
    """Get alert history with optional filtering."""
    try:
        supabase = get_supabase()
        query = supabase.table('alerts').select('*')
        
        if incident_type:
            query = query.eq('incident_type', incident_type)
        if host_name:
            query = query.eq('host_name', host_name)
        
        result = query.order('start_time', desc=True).limit(limit).execute()
        
        return result.data
        
    except Exception as e:
        print(f"[@db:alerts:get_alerts_history] Error: {str(e)}")
        return [] 