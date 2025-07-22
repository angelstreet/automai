#!/usr/bin/env python3
"""
Alert Manager for HDMI Capture Monitoring
Manages alert state and triggers database alerts based on consecutive detections
"""

import os
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

# Add the parent directory to sys.path to import from src
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Lazy import to reduce startup time
create_alert_safe = None
create_alert = None
resolve_alert = None
get_active_alerts = None

def _lazy_import_db():
    """Lazy import database functions only when needed."""
    global create_alert_safe, create_alert, resolve_alert, get_active_alerts
    if create_alert_safe is None:
        try:
            from src.lib.supabase.alerts_db import create_alert_safe as _create_alert_safe, create_alert as _create_alert, resolve_alert as _resolve_alert, get_active_alerts as _get_active_alerts
            create_alert_safe = _create_alert_safe
            create_alert = _create_alert
            resolve_alert = _resolve_alert
            get_active_alerts = _get_active_alerts
        except ImportError:
            print("Warning: Could not import alerts_db module. Database operations will be skipped.")
            create_alert_safe = False  # Mark as attempted
            create_alert = False
            resolve_alert = False
            get_active_alerts = False

# Alert configuration
ALERT_THRESHOLD = 3  # Number of consecutive detections needed to trigger alert
INCIDENT_TYPES = ['blackscreen', 'freeze', 'errors', 'audio_loss']

def get_state_file_path(analysis_path: str) -> str:
    """Get the path for the alert state file based on the analysis file/directory."""
    if os.path.isfile(analysis_path):
        # For frame analysis, use the directory containing the image
        base_dir = os.path.dirname(analysis_path)
    else:
        # For audio analysis, use the provided directory
        base_dir = analysis_path
    
    return os.path.join(base_dir, 'alert_state.json')

def load_alert_state(state_file_path: str) -> Dict:
    """Load alert state from JSON file."""
    if not os.path.exists(state_file_path):
        return {"active_incidents": {}}
    
    try:
        with open(state_file_path, 'r') as f:
            state = json.load(f)
        return state
    except (json.JSONDecodeError, IOError) as e:
        print(f"[@alert_manager:load_alert_state] Error loading state: {e}")
        return {"active_incidents": {}}

def save_alert_state(state_file_path: str, state: Dict) -> None:
    """Save alert state to JSON file."""
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(state_file_path), exist_ok=True)
        
        with open(state_file_path, 'w') as f:
            json.dump(state, f, indent=2)
    except IOError as e:
        print(f"[@alert_manager:save_alert_state] Error saving state: {e}")

def extract_device_id_from_path(analysis_path: str) -> str:
    """Extract device_id from capture folder path."""
    try:
        # Extract capture folder from path (e.g., capture1, capture2, etc.)
        if 'capture' in analysis_path:
            # Find the capture folder in the path
            path_parts = analysis_path.split('/')
            for part in path_parts:
                if part.startswith('capture') and part[7:].isdigit():
                    device_number = part[7:]  # Extract number after 'capture'
                    device_id = f"device{device_number}"  # e.g., "device1", "device2"
                    return device_id
        
        # Fallback if no capture folder found
        return "device-unknown"
    except Exception as e:
        print(f"[@alert_manager:extract_device_id] Error extracting device ID: {e}")
        return "device-unknown"

def trigger_alert(
    incident_type: str,
    host_name: str,
    analysis_path: str,
    consecutive_count: int,
    metadata: Optional[Dict] = None
) -> Optional[str]:
    """Trigger a new alert in the database using safe creation."""
    _lazy_import_db()
    if not create_alert_safe or create_alert_safe is False:
        print(f"[@alert_manager:trigger_alert] Database module not available, skipping alert creation")
        return None
    
    # Extract device ID from path
    device_id = extract_device_id_from_path(analysis_path)
    
    print(f"[@alert_manager:trigger_alert] Triggering {incident_type} alert after {consecutive_count} consecutive detections")
    print(f"  - Extracted device_id: {device_id}")
    
    result = create_alert_safe(
        host_name=host_name,
        device_id=device_id,
        incident_type=incident_type,
        consecutive_count=consecutive_count,
        metadata=metadata
    )
    
    if result['success']:
        alert_id = result.get('alert_id')
        print(f"[@alert_manager:trigger_alert] Successfully created alert: {alert_id}")
        return alert_id
    else:
        print(f"[@alert_manager:trigger_alert] Failed to create alert: {result.get('error')}")
        return None

def resolve_alert_by_id(alert_id: str) -> bool:
    """Resolve an alert by ID."""
    _lazy_import_db()
    if not resolve_alert or resolve_alert is False:
        print(f"[@alert_manager:resolve_alert_by_id] Database module not available, skipping alert resolution")
        return False
    
    print(f"[@alert_manager:resolve_alert_by_id] Resolving alert: {alert_id}")
    result = resolve_alert(alert_id)
    
    if result['success']:
        print(f"[@alert_manager:resolve_alert_by_id] Successfully resolved alert: {alert_id}")
        return True
    else:
        print(f"[@alert_manager:resolve_alert_by_id] Failed to resolve alert: {result.get('error')}")
        return False

def validate_and_cleanup_state(state: Dict, host_name: str, analysis_path: str) -> Dict:
    """Validate alert state and cleanup any inconsistencies with database."""
    try:
        device_id = extract_device_id_from_path(analysis_path)
        active_incidents = state.get("active_incidents", {})
        
        # Check each active incident against database
        incidents_to_remove = []
        
        for incident_type, incident_data in active_incidents.items():
            alert_id = incident_data.get('alert_id')
            
            if alert_id:
                # Verify this alert still exists and is active in database
                _lazy_import_db()
                if get_active_alerts and get_active_alerts is not False:
                    try:
                        from src.lib.supabase.alerts_db import get_active_alert_for_incident
                        db_result = get_active_alert_for_incident(host_name, device_id, incident_type)
                        
                        if db_result['success'] and not db_result['alert']:
                            # Alert doesn't exist in DB anymore, remove from state
                            print(f"[@alert_manager:validate_state] Removing stale incident {incident_type} (alert {alert_id} not found in DB)")
                            incidents_to_remove.append(incident_type)
                        elif db_result['success'] and db_result['alert']:
                            db_alert = db_result['alert']
                            if db_alert['id'] != alert_id:
                                # Different alert ID in DB, update our state
                                print(f"[@alert_manager:validate_state] Updating incident {incident_type} alert ID from {alert_id} to {db_alert['id']}")
                                incident_data['alert_id'] = db_alert['id']
                                
                    except ImportError:
                        pass  # Skip validation if DB functions not available
        
        # Remove stale incidents
        for incident_type in incidents_to_remove:
            del active_incidents[incident_type]
        
        state['active_incidents'] = active_incidents
        return state
        
    except Exception as e:
        print(f"[@alert_manager:validate_state] Error validating state: {e}")
        return state

def check_and_update_alerts(
    analysis_result: Dict,
    host_name: str,
    analysis_path: str
) -> None:
    """
    Main function to check analysis results and update alerts accordingly.
    
    Args:
        analysis_result: The result from analyze_frame.py or analyze_audio.py
        host_name: Host name
        analysis_path: Path to the analyzed file/directory
    """
    try:
        device_id = extract_device_id_from_path(analysis_path)
        
        # Get state file path
        state_file_path = get_state_file_path(analysis_path)
        
        # Load current state
        state = load_alert_state(state_file_path)
        
        # Validate and cleanup state against database
        state = validate_and_cleanup_state(state, host_name, analysis_path)
        
        active_incidents = state.get("active_incidents", {})
        
        # Quick check: if no active incidents and no current issues, skip processing
        has_current_issues = False
        if 'analysis' in analysis_result:
            analysis_data = analysis_result['analysis']
            has_current_issues = (analysis_data.get('blackscreen', False) or 
                                analysis_data.get('freeze', False) or 
                                analysis_data.get('errors', False))
        elif 'audio_analysis' in analysis_result:
            audio_data = analysis_result['audio_analysis']
            has_current_issues = not audio_data.get('has_audio', True)
        
        if not active_incidents and not has_current_issues:
            print(f"[@alert_manager:check_and_update_alerts] No active incidents or current issues for {device_id}, skipping")
            return
            
        print(f"[@alert_manager:check_and_update_alerts] Processing alerts for {device_id}")
        
        # Extract detection results
        detections = {}
        if 'analysis' in analysis_result:
            # Frame analysis format
            analysis_data = analysis_result['analysis']
            detections = {
                'blackscreen': analysis_data.get('blackscreen', False),
                'freeze': analysis_data.get('freeze', False),
                'errors': analysis_data.get('errors', False)
            }
        elif 'audio_analysis' in analysis_result:
            # Audio analysis format
            audio_data = analysis_result['audio_analysis']
            # Audio loss = no audio detected
            detections = {
                'audio_loss': not audio_data.get('has_audio', True)
            }
        
        current_time = datetime.now().isoformat()
        state_changed = False
        db_operation_performed = False
        
        # Process each incident type
        for incident_type in INCIDENT_TYPES:
            if incident_type not in detections:
                continue
                
            is_detected = detections[incident_type]
            incident_state = active_incidents.get(incident_type, {})
            
            if is_detected:
                # Incident detected
                if incident_type in active_incidents:
                    # Increment consecutive count
                    active_incidents[incident_type]['consecutive_count'] += 1
                    consecutive_count = active_incidents[incident_type]['consecutive_count']
                    print(f"[@alert_manager] {incident_type}: count={consecutive_count}")
                    
                    # Check if we should trigger an alert (ONLY DB OPERATION for new alerts)
                    if consecutive_count == ALERT_THRESHOLD and not active_incidents[incident_type]['alert_id']:
                        # Trigger alert - THIS IS THE ONLY DB INSERT
                        metadata = {
                            'analysis_path': analysis_path,
                            'first_detection': active_incidents[incident_type]['start_time'],
                            'analysis_result': analysis_result
                        }
                        
                        alert_id = trigger_alert(
                            incident_type=incident_type,
                            host_name=host_name,
                            analysis_path=analysis_path,
                            consecutive_count=consecutive_count,
                            metadata=metadata
                        )
                        
                        if alert_id:
                            active_incidents[incident_type]['alert_id'] = alert_id
                            print(f"[@alert_manager] {incident_type}: ALERT TRIGGERED (id={alert_id}) - DB INSERT")
                            db_operation_performed = True
                        
                        state_changed = True
                    elif consecutive_count < ALERT_THRESHOLD:
                        # Just counting up - no DB operation needed
                        state_changed = True
                    # If consecutive_count > ALERT_THRESHOLD, alert already exists, no DB operation
                else:
                    # Start new incident tracking
                    active_incidents[incident_type] = {
                        'consecutive_count': 1,
                        'start_time': current_time,
                        'alert_id': None
                    }
                    print(f"[@alert_manager] {incident_type}: started tracking (count=1)")
                    state_changed = True
                
            else:
                # Incident not detected
                if incident_type in active_incidents:
                    # Resolve incident
                    alert_id = active_incidents[incident_type].get('alert_id')
                    if alert_id:
                        # Resolve alert in database - THIS IS THE ONLY DB UPDATE
                        if resolve_alert_by_id(alert_id):
                            print(f"[@alert_manager] {incident_type}: ALERT RESOLVED (id={alert_id}) - DB UPDATE")
                            db_operation_performed = True
                        else:
                            print(f"[@alert_manager] {incident_type}: Failed to resolve alert (id={alert_id})")
                    else:
                        print(f"[@alert_manager] {incident_type}: incident cleared (no alert was triggered)")
                    
                    # Remove from active incidents
                    del active_incidents[incident_type]
                    state_changed = True
        
        # Log database operation summary
        if db_operation_performed:
            print(f"[@alert_manager] Database operation performed")
        else:
            print(f"[@alert_manager] No database operations needed")
        
        # Save updated state only if changed
        if state_changed:
            state['active_incidents'] = active_incidents
            save_alert_state(state_file_path, state)
            print(f"[@alert_manager] State updated and saved to {state_file_path}")
        else:
            print(f"[@alert_manager] No state changes, skipping file update")
        
    except Exception as e:
        print(f"[@alert_manager:check_and_update_alerts] Error: {str(e)}")

def main():
    """Test function for alert manager."""
    if len(sys.argv) < 4:
        print("Usage: alert_manager.py <analysis_result_json> <host_name> <analysis_path>")
        sys.exit(1)
    
    analysis_result_json = sys.argv[1]
    host_name = sys.argv[2]
    analysis_path = sys.argv[3]
    
    try:
        analysis_result = json.loads(analysis_result_json)
        check_and_update_alerts(
            analysis_result=analysis_result,
            host_name=host_name,
            analysis_path=analysis_path
        )
    except json.JSONDecodeError as e:
        print(f"Error parsing analysis result JSON: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 