"""
Heatmap Database Operations

This module provides functions for fetching heatmap incidents from the database.
Only handles database operations - host communication is handled by route layer.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def get_heatmap_incidents(
    team_id: str,
    timeframe_minutes: int = 1
) -> List[Dict]:
    """Get recent incidents from database only - no host communication"""
    try:
        print(f"[@db:heatmap:get_heatmap_incidents] Getting incidents for team: {team_id}, timeframe: {timeframe_minutes}min")
        
        supabase = get_supabase()
        
        # Calculate time range for incidents
        end_time = datetime.now()
        start_time = end_time - timedelta(minutes=timeframe_minutes)
        
        # Query alerts without team_id since alerts table doesn't have that column
        incidents_result = supabase.table('alerts').select('*').gte('start_time', start_time.isoformat()).execute()
        
        incidents = []
        for incident in incidents_result.data:
            incidents.append({
                'id': incident.get('id', ''),
                'host_name': incident.get('host_name', ''),
                'device_id': incident.get('device_id', ''),
                'incident_type': incident.get('incident_type', ''),
                'start_time': incident.get('start_time', ''),
                'end_time': incident.get('end_time'),
                'status': incident.get('status', 'active')
            })
        
        print(f"[@db:heatmap:get_heatmap_incidents] Found {len(incidents)} incidents")
        return incidents
                
    except Exception as e:
        print(f"[@db:heatmap:get_heatmap_incidents] Error: {str(e)}")
        return []

def save_heatmap_to_db(
    team_id: str,
    timestamp: str,
    job_id: str,
    mosaic_r2_path: str,
    mosaic_r2_url: str,
    metadata_r2_path: str,
    metadata_r2_url: str,
    html_r2_path: str,
    html_r2_url: str,
    hosts_included: int = 0,
    hosts_total: int = 0,
    incidents_count: int = 0
) -> Optional[str]:
    """Save heatmap record to database."""
    try:
        heatmap_id = str(uuid4())
        
        heatmap_data = {
            'id': heatmap_id,
            'team_id': team_id,
            'timestamp': timestamp,
            'job_id': job_id,
            'mosaic_r2_path': mosaic_r2_path,
            'mosaic_r2_url': mosaic_r2_url,
            'metadata_r2_path': metadata_r2_path,
            'metadata_r2_url': metadata_r2_url,
            'html_r2_path': html_r2_path,
            'html_r2_url': html_r2_url,
            'hosts_included': hosts_included,
            'hosts_total': hosts_total,
            'incidents_count': incidents_count,
            'generated_at': datetime.now().isoformat()
        }
        
        print(f"[@db:heatmap:save_heatmap_to_db] Saving heatmap: {heatmap_id}")
        
        supabase = get_supabase()
        result = supabase.table('heatmaps').insert(heatmap_data).execute()
        
        if result.data:
            print(f"[@db:heatmap:save_heatmap_to_db] Success: {heatmap_id}")
            return heatmap_id
        else:
            print(f"[@db:heatmap:save_heatmap_to_db] Failed")
            return None
            
    except Exception as e:
        print(f"[@db:heatmap:save_heatmap_to_db] Error: {str(e)}")
        return None

def get_recent_heatmaps(team_id: str, limit: int = 10) -> List[Dict]:
    """Get recent heatmaps for team."""
    try:
        print(f"[@db:heatmap:get_recent_heatmaps] Getting {limit} recent heatmaps for team: {team_id}")
        
        supabase = get_supabase()
        result = supabase.table('heatmaps').select('*').eq('team_id', team_id).order('generated_at', desc=True).limit(limit).execute()
        
        heatmaps = []
        for heatmap in result.data:
            heatmaps.append({
                'id': heatmap.get('id'),
                'timestamp': heatmap.get('timestamp'),
                'html_r2_url': heatmap.get('html_r2_url'),
                'mosaic_r2_url': heatmap.get('mosaic_r2_url'),
                'hosts_included': heatmap.get('hosts_included', 0),
                'hosts_total': heatmap.get('hosts_total', 0),
                'incidents_count': heatmap.get('incidents_count', 0),
                'generated_at': heatmap.get('generated_at')
            })
        
        print(f"[@db:heatmap:get_recent_heatmaps] Found {len(heatmaps)} heatmaps")
        return heatmaps
        
    except Exception as e:
        print(f"[@db:heatmap:get_recent_heatmaps] Error: {str(e)}")
        return [] 