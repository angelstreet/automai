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

def get_active_alerts(
    team_id: str,
    host_name: Optional[str] = None,
    device_id: Optional[str] = None,
    incident_type: Optional[str] = None,
    limit: int = 100
) -> Dict:
    """Get active alerts with filtering."""
    try:
        print(f"[@db:alerts:get_active_alerts] Getting active alerts:")
        print(f"  - team_id: {team_id}")
        print(f"  - host_name: {host_name}")
        print(f"  - device_id: {device_id}")
        print(f"  - incident_type: {incident_type}")
        print(f"  - limit: {limit}")
        
        supabase = get_supabase()
        query = supabase.table('alerts').select('*').eq('team_id', team_id).eq('status', 'active')
        
        # Add filters
        if host_name:
            query = query.eq('host_name', host_name)
        if device_id:
            query = query.eq('device_id', device_id)
        if incident_type:
            query = query.eq('incident_type', incident_type)
        
        # Execute query with ordering and limit
        result = query.order('start_time', desc=True).limit(limit).execute()
        
        print(f"[@db:alerts:get_active_alerts] Found {len(result.data)} active alerts")
        return {
            'success': True,
            'alerts': result.data,
            'count': len(result.data)
        }
        
    except Exception as e:
        print(f"[@db:alerts:get_active_alerts] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'alerts': [],
            'count': 0
        }

def get_closed_alerts(
    team_id: str,
    host_name: Optional[str] = None,
    device_id: Optional[str] = None,
    incident_type: Optional[str] = None,
    limit: int = 100
) -> Dict:
    """Get closed/resolved alerts with filtering."""
    try:
        print(f"[@db:alerts:get_closed_alerts] Getting closed alerts:")
        print(f"  - team_id: {team_id}")
        print(f"  - host_name: {host_name}")
        print(f"  - device_id: {device_id}")
        print(f"  - incident_type: {incident_type}")
        print(f"  - limit: {limit}")
        
        supabase = get_supabase()
        query = supabase.table('alerts').select('*').eq('team_id', team_id).eq('status', 'resolved')
        
        # Add filters
        if host_name:
            query = query.eq('host_name', host_name)
        if device_id:
            query = query.eq('device_id', device_id)
        if incident_type:
            query = query.eq('incident_type', incident_type)
        
        # Execute query with ordering and limit
        result = query.order('end_time', desc=True).limit(limit).execute()
        
        print(f"[@db:alerts:get_closed_alerts] Found {len(result.data)} closed alerts")
        return {
            'success': True,
            'alerts': result.data,
            'count': len(result.data)
        }
        
    except Exception as e:
        print(f"[@db:alerts:get_closed_alerts] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'alerts': [],
            'count': 0
        }

def create_alert(
    team_id: str,
    host_name: str,
    device_id: str,
    incident_type: str,
    consecutive_count: int = 3,
    metadata: Optional[Dict] = None
) -> Dict:
    """Create a new alert in the database."""
    try:
        alert_id = str(uuid4())
        
        alert_data = {
            'id': alert_id,
            'team_id': team_id,
            'host_name': host_name,
            'device_id': device_id,
            'incident_type': incident_type,
            'status': 'active',
            'consecutive_count': consecutive_count,
            'start_time': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        print(f"[@db:alerts:create_alert] Creating alert:")
        print(f"  - alert_id: {alert_id}")
        print(f"  - team_id: {team_id}")
        print(f"  - host_name: {host_name}")
        print(f"  - device_id: {device_id}")
        print(f"  - incident_type: {incident_type}")
        print(f"  - consecutive_count: {consecutive_count}")
        
        supabase = get_supabase()
        result = supabase.table('alerts').insert(alert_data).execute()
        
        if result.data:
            print(f"[@db:alerts:create_alert] Success: {alert_id}")
            return {
                'success': True,
                'alert_id': alert_id,
                'alert': result.data[0]
            }
        else:
            print(f"[@db:alerts:create_alert] Failed")
            return {
                'success': False,
                'error': 'No data returned from database'
            }
            
    except Exception as e:
        print(f"[@db:alerts:create_alert] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def resolve_alert(alert_id: str) -> Dict:
    """Resolve an alert by setting status to resolved and end_time."""
    try:
        print(f"[@db:alerts:resolve_alert] Resolving alert: {alert_id}")
        
        supabase = get_supabase()
        result = supabase.table('alerts').update({
            'status': 'resolved',
            'end_time': datetime.now().isoformat()
        }).eq('id', alert_id).execute()
        
        if result.data:
            print(f"[@db:alerts:resolve_alert] Success: {alert_id}")
            return {
                'success': True,
                'alert': result.data[0]
            }
        else:
            print(f"[@db:alerts:resolve_alert] Failed: {alert_id}")
            return {
                'success': False,
                'error': 'Alert not found or already resolved'
            }
            
    except Exception as e:
        print(f"[@db:alerts:resolve_alert] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        } 