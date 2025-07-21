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

try:
    from src.lib.supabase.alerts_db import create_alert, resolve_alert, get_active_alerts
except ImportError:
    print("Warning: Could not import alerts_db module. Database operations will be skipped.")
    create_alert = None
    resolve_alert = None
    get_active_alerts = None

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

def extract_device_info_from_path(analysis_path: str) -> tuple[str, str]:
    """Extract device_name and device_model from capture folder path."""
    try:
        # Extract capture folder from path (e.g., capture1, capture2, etc.)
        if 'capture' in analysis_path:
            # Find the capture folder in the path
            path_parts = analysis_path.split('/')
            for part in path_parts:
                if part.startswith('capture') and part[7:].isdigit():
                    device_name = f"hdmi-{part}"  # e.g., "hdmi-capture1"
                    device_model = "hdmi-usb-capture"  # Generic model
                    return device_name, device_model
        
        # Fallback if no capture folder found
        return "hdmi-capture-unknown", "hdmi-usb-capture"
    except Exception as e:
        print(f"[@alert_manager:extract_device_info] Error extracting device info: {e}")
        return "hdmi-capture-unknown", "hdmi-usb-capture"

def trigger_alert(
    incident_type: str,
    host_name: str,
    analysis_path: str,
    consecutive_count: int,
    metadata: Optional[Dict] = None
) -> Optional[str]:
    """Trigger a new alert in the database."""
    if not create_alert:
        print(f"[@alert_manager:trigger_alert] Database module not available, skipping alert creation")
        return None
    
    # Extract device info from path
    device_name, device_model = extract_device_info_from_path(analysis_path)
    
    print(f"[@alert_manager:trigger_alert] Triggering {incident_type} alert after {consecutive_count} consecutive detections")
    print(f"  - Extracted device_name: {device_name}, device_model: {device_model}")
    
    alert_id = create_alert(
        host_name=host_name,
        device_name=device_name,
        device_model=device_model,
        incident_type=incident_type,
        consecutive_count=consecutive_count,
        metadata=metadata
    )
    
    return alert_id

def resolve_alert_by_id(alert_id: str) -> bool:
    """Resolve an alert by ID."""
    if not resolve_alert:
        print(f"[@alert_manager:resolve_alert_by_id] Database module not available, skipping alert resolution")
        return False
    
    print(f"[@alert_manager:resolve_alert_by_id] Resolving alert: {alert_id}")
    return resolve_alert(alert_id)

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
        device_name, device_model = extract_device_info_from_path(analysis_path)
        print(f"[@alert_manager:check_and_update_alerts] Processing alerts for {device_name}")
        
        # Get state file path
        state_file_path = get_state_file_path(analysis_path)
        
        # Load current state
        state = load_alert_state(state_file_path)
        active_incidents = state.get("active_incidents", {})
        
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
                    print(f"[@alert_manager] {incident_type}: count={active_incidents[incident_type]['consecutive_count']}")
                else:
                    # Start new incident tracking
                    active_incidents[incident_type] = {
                        'consecutive_count': 1,
                        'start_time': current_time,
                        'alert_id': None
                    }
                    print(f"[@alert_manager] {incident_type}: started tracking (count=1)")
                
                # Check if we should trigger an alert
                consecutive_count = active_incidents[incident_type]['consecutive_count']
                if consecutive_count == ALERT_THRESHOLD and not active_incidents[incident_type]['alert_id']:
                    # Trigger alert
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
                        print(f"[@alert_manager] {incident_type}: ALERT TRIGGERED (id={alert_id})")
                
                state_changed = True
                
            else:
                # Incident not detected
                if incident_type in active_incidents:
                    # Resolve incident
                    alert_id = active_incidents[incident_type].get('alert_id')
                    if alert_id:
                        # Resolve alert in database
                        if resolve_alert_by_id(alert_id):
                            print(f"[@alert_manager] {incident_type}: ALERT RESOLVED (id={alert_id})")
                        else:
                            print(f"[@alert_manager] {incident_type}: Failed to resolve alert (id={alert_id})")
                    else:
                        print(f"[@alert_manager] {incident_type}: incident cleared (no alert was triggered)")
                    
                    # Remove from active incidents
                    del active_incidents[incident_type]
                    state_changed = True
        
        # Save updated state if changed
        if state_changed:
            state['active_incidents'] = active_incidents
            save_alert_state(state_file_path, state)
            print(f"[@alert_manager] State updated and saved to {state_file_path}")
        
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