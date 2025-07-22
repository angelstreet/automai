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

def get_all_alerts(
    host_name: Optional[str] = None,
    device_id: Optional[str] = None,
    incident_type: Optional[str] = None,
    limit: int = 200
) -> Dict:
    """Get all alerts (both active and resolved) with optional filtering.
    
    Uses DISTINCT ON to ensure only the most recent alert per host/device/incident_type combination.
    """
    try:
        print(f"[@db:alerts:get_all_alerts] Getting all alerts:")
        print(f"  - host_name: {host_name}")
        print(f"  - device_id: {device_id}")
        print(f"  - incident_type: {incident_type}")
        print(f"  - limit: {limit}")
        
        supabase = get_supabase()
        
        # Build the query with DISTINCT ON to get most recent alert per combination
        # Note: Supabase client doesn't support DISTINCT ON directly, so we'll use a subquery approach
        base_query = supabase.table('alerts').select('*')
        
        # Add filters
        if host_name:
            base_query = base_query.eq('host_name', host_name)
            print(f"  - Applied host_name filter: {host_name}")
        if device_id:
            base_query = base_query.eq('device_id', device_id)
            print(f"  - Applied device_id filter: {device_id}")
        if incident_type:
            base_query = base_query.eq('incident_type', incident_type)
            print(f"  - Applied incident_type filter: {incident_type}")
        
        # Execute query with ordering and limit
        # Order by start_time desc to get most recent first
        result = base_query.order('start_time', desc=True).limit(limit).execute()
        
        # Post-process to remove duplicates (keep most recent per host/device/incident_type)
        alerts = result.data
        unique_alerts = {}
        
        for alert in alerts:
            key = f"{alert['host_name']}-{alert['device_id']}-{alert['incident_type']}-{alert['status']}"
            
            if key not in unique_alerts:
                unique_alerts[key] = alert
            else:
                # Keep the one with the most recent start_time
                existing_time = unique_alerts[key]['start_time']
                current_time = alert['start_time']
                
                if current_time > existing_time:
                    unique_alerts[key] = alert
                    print(f"  - Replaced duplicate alert for {key} with more recent one")
        
        # Convert back to list and sort by start_time desc
        final_alerts = list(unique_alerts.values())
        final_alerts.sort(key=lambda x: x['start_time'], reverse=True)
        
        if host_name or device_id or incident_type:
            print(f"[@db:alerts:get_all_alerts] Found {len(final_alerts)} unique filtered alerts (removed {len(alerts) - len(final_alerts)} duplicates)")
        else:
            print(f"[@db:alerts:get_all_alerts] Found {len(final_alerts)} unique total alerts (removed {len(alerts) - len(final_alerts)} duplicates)")
            
        return {
            'success': True,
            'alerts': final_alerts,
            'count': len(final_alerts)
        }
        
    except Exception as e:
        print(f"[@db:alerts:get_all_alerts] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'alerts': [],
            'count': 0
        }

def get_active_alerts(
    host_name: Optional[str] = None,
    device_id: Optional[str] = None,
    incident_type: Optional[str] = None,
    limit: int = 100
) -> Dict:
    """Get active alerts with filtering and deduplication.
    
    Ensures only the most recent active alert per host/device/incident_type combination.
    """
    try:
        print(f"[@db:alerts:get_active_alerts] Getting active alerts:")
        print(f"  - host_name: {host_name}")
        print(f"  - device_id: {device_id}")
        print(f"  - incident_type: {incident_type}")
        print(f"  - limit: {limit}")
        
        supabase = get_supabase()
        query = supabase.table('alerts').select('*').eq('status', 'active')
        
        # Add filters
        if host_name:
            query = query.eq('host_name', host_name)
            print(f"  - Applied host_name filter: {host_name}")
        if device_id:
            query = query.eq('device_id', device_id)
            print(f"  - Applied device_id filter: {device_id}")
        if incident_type:
            query = query.eq('incident_type', incident_type)
            print(f"  - Applied incident_type filter: {incident_type}")
        
        # Execute query with ordering and limit
        result = query.order('start_time', desc=True).limit(limit).execute()
        
        # Post-process to remove duplicates (keep most recent per host/device/incident_type)
        alerts = result.data
        unique_alerts = {}
        
        for alert in alerts:
            key = f"{alert['host_name']}-{alert['device_id']}-{alert['incident_type']}"
            
            if key not in unique_alerts:
                unique_alerts[key] = alert
            else:
                # Keep the one with the most recent start_time
                existing_time = unique_alerts[key]['start_time']
                current_time = alert['start_time']
                
                if current_time > existing_time:
                    unique_alerts[key] = alert
                    print(f"  - Replaced duplicate active alert for {key} with more recent one")
        
        # Convert back to list and sort by start_time desc
        final_alerts = list(unique_alerts.values())
        final_alerts.sort(key=lambda x: x['start_time'], reverse=True)
        
        print(f"[@db:alerts:get_active_alerts] Found {len(final_alerts)} unique active alerts (removed {len(alerts) - len(final_alerts)} duplicates)")
        
        return {
            'success': True,
            'alerts': final_alerts,
            'count': len(final_alerts)
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
    host_name: Optional[str] = None,
    device_id: Optional[str] = None,
    incident_type: Optional[str] = None,
    limit: int = 100
) -> Dict:
    """Get closed/resolved alerts with filtering."""
    try:
        print(f"[@db:alerts:get_closed_alerts] Getting closed alerts:")
        print(f"  - host_name: {host_name}")
        print(f"  - device_id: {device_id}")
        print(f"  - incident_type: {incident_type}")
        print(f"  - limit: {limit}")
        
        supabase = get_supabase()
        query = supabase.table('alerts').select('*').eq('status', 'resolved')
        
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

def get_active_alert_for_incident(
    host_name: str,
    device_id: str,
    incident_type: str
) -> Dict:
    """Get active alert for specific host/device/incident_type combination."""
    try:
        print(f"[@db:alerts:get_active_alert_for_incident] Checking for existing active alert:")
        print(f"  - host_name: {host_name}")
        print(f"  - device_id: {device_id}")
        print(f"  - incident_type: {incident_type}")
        
        supabase = get_supabase()
        result = supabase.table('alerts').select('*').eq('status', 'active').eq('host_name', host_name).eq('device_id', device_id).eq('incident_type', incident_type).execute()
        
        if result.data:
            print(f"[@db:alerts:get_active_alert_for_incident] Found existing active alert: {result.data[0]['id']}")
            return {
                'success': True,
                'alert': result.data[0]
            }
        else:
            print(f"[@db:alerts:get_active_alert_for_incident] No existing active alert found")
            return {
                'success': True,
                'alert': None
            }
        
    except Exception as e:
        print(f"[@db:alerts:get_active_alert_for_incident] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'alert': None
        }

def create_alert_safe(
    host_name: str,
    device_id: str,
    incident_type: str,
    consecutive_count: int = 3,
    metadata: Optional[Dict] = None
) -> Dict:
    """Create a new alert safely - resolves any existing active alert first."""
    try:
        print(f"[@db:alerts:create_alert_safe] Creating alert safely:")
        print(f"  - host_name: {host_name}")
        print(f"  - device_id: {device_id}")
        print(f"  - incident_type: {incident_type}")
        print(f"  - consecutive_count: {consecutive_count}")
        
        # Step 1: Check for existing active alert
        existing_result = get_active_alert_for_incident(host_name, device_id, incident_type)
        
        if not existing_result['success']:
            return {
                'success': False,
                'error': f"Failed to check existing alerts: {existing_result['error']}"
            }
        
        # Step 2: Resolve existing alert if found
        if existing_result['alert']:
            existing_alert = existing_result['alert']
            existing_alert_id = existing_alert['id']
            
            print(f"[@db:alerts:create_alert_safe] Found existing active alert {existing_alert_id}, resolving it first")
            
            resolve_result = resolve_alert(existing_alert_id)
            if not resolve_result['success']:
                print(f"[@db:alerts:create_alert_safe] Warning: Failed to resolve existing alert {existing_alert_id}: {resolve_result['error']}")
                # Continue anyway - we'll let the database constraint handle it
        
        # Step 3: Create new alert
        return create_alert(host_name, device_id, incident_type, consecutive_count, metadata)
        
    except Exception as e:
        print(f"[@db:alerts:create_alert_safe] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        } 

def add_unique_constraint_for_active_alerts() -> Dict:
    """Add unique constraint to prevent multiple active alerts for same host/device/incident_type.
    
    This should be called once during deployment to add the database constraint.
    """
    try:
        print("[@db:alerts:add_unique_constraint] Adding unique constraint for active alerts")
        
        supabase = get_supabase()
        
        # Create a unique partial index that only applies to active alerts
        # This allows multiple resolved alerts but only one active alert per host/device/incident_type
        constraint_sql = """
        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS unique_active_alerts 
        ON alerts (host_name, device_id, incident_type) 
        WHERE status = 'active';
        """
        
        # Note: Supabase/PostgreSQL doesn't support direct SQL execution through the client
        # This would need to be executed manually in the database or through a migration
        print("[@db:alerts:add_unique_constraint] Constraint SQL generated:")
        print(constraint_sql)
        print("[@db:alerts:add_unique_constraint] This constraint should be applied manually to the database")
        
        return {
            'success': True,
            'constraint_sql': constraint_sql,
            'message': 'Constraint SQL generated - apply manually to database'
        }
        
    except Exception as e:
        print(f"[@db:alerts:add_unique_constraint] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        } 