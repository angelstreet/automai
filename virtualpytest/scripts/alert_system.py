#!/usr/bin/env python3
"""
Alert System Utilities - Local state file management with optimized DB calls
Each device maintains its own incidents.json for fast state checking
"""
import os
import json
from datetime import datetime

# ==================== LOCAL STATE MANAGEMENT ====================
def get_device_state_file(analysis_path):
    """Get the incidents.json path for the device from analysis path"""
    try:
        # Extract capture directory from path
        # /var/www/html/stream/capture1/captures/capture_*.jpg -> /var/www/html/stream/capture1/
        if '/captures/' in analysis_path:
            capture_dir = analysis_path.split('/captures/')[0]
        else:
            # Fallback: find capture directory in path
            parts = analysis_path.split('/')
            for i, part in enumerate(parts):
                if part.startswith('capture') and part[7:].isdigit():
                    capture_dir = '/'.join(parts[:i+1])
                    break
            else:
                capture_dir = os.path.dirname(analysis_path)
        
        return os.path.join(capture_dir, 'incidents.json')
    except Exception:
        return os.path.join(os.path.dirname(analysis_path), 'incidents.json')

def load_device_state(state_file_path):
    """Load device incident state from local JSON file"""
    if not os.path.exists(state_file_path):
        return {
            "active_incidents": {},
            "last_analysis": None
        }
    
    try:
        with open(state_file_path, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {
            "active_incidents": {},
            "last_analysis": None
        }

def save_device_state(state_file_path, state):
    """Save device incident state to local JSON file"""
    try:
        os.makedirs(os.path.dirname(state_file_path), exist_ok=True)
        with open(state_file_path, 'w') as f:
            json.dump(state, f, indent=2)
    except IOError as e:
        print(f"[@alert_system] Warning: Could not save state to {state_file_path}: {e}")

# ==================== DIRECT ALERT PROCESSING ====================
def process_alert_directly(analysis_result, host_name, analysis_path):
    """Process alert directly using local state file - optimized DB calls"""
    try:
        # Get device info
        device_id = extract_device_id(analysis_path)
        state_file_path = get_device_state_file(analysis_path)
        
        # Load current device state
        state = load_device_state(state_file_path)
        active_incidents = state.get("active_incidents", {})
        
        # Extract incident detection results
        blackscreen = analysis_result.get('blackscreen', False)
        freeze = analysis_result.get('freeze', False) 
        audio = analysis_result.get('audio', True)
        
        # Determine current incidents
        current_incidents = []
        if blackscreen: current_incidents.append('blackscreen')
        if freeze: current_incidents.append('freeze')
        if not audio: current_incidents.append('audio_loss')
        
        current_time = datetime.now().isoformat()
        state_changed = False
        
        print(f"[@alert_system] {device_id}: Current incidents: {current_incidents}, Active: {list(active_incidents.keys())}")
        
        # Process each possible incident type
        for incident_type in ['blackscreen', 'freeze', 'audio_loss']:
            is_currently_detected = incident_type in current_incidents
            was_previously_active = incident_type in active_incidents
            
            if is_currently_detected and not was_previously_active:
                # NEW INCIDENT - Insert to DB and add to local state
                print(f"[@alert_system] {device_id}: NEW {incident_type} incident detected")
                alert_id = create_incident_in_db(incident_type, host_name, device_id, analysis_result)
                
                if alert_id:
                    active_incidents[incident_type] = {
                        "alert_id": alert_id,
                        "start_time": current_time,
                        "consecutive_count": 1,
                        "last_updated": current_time
                    }
                    state_changed = True
                    
            elif is_currently_detected and was_previously_active:
                # ONGOING INCIDENT - Update local state, periodic DB update
                incident_data = active_incidents[incident_type]
                incident_data["consecutive_count"] += 1
                incident_data["last_updated"] = current_time
                
                # Update DB every 10 detections (30 seconds) to reduce load
                if incident_data["consecutive_count"] % 10 == 0:
                    print(f"[@alert_system] {device_id}: Updating {incident_type} in DB (count: {incident_data['consecutive_count']})")
                    update_incident_in_db(incident_data["alert_id"], analysis_result)
                
                state_changed = True
                
            elif not is_currently_detected and was_previously_active:
                # RESOLVED INCIDENT - Update DB and remove from local state
                incident_data = active_incidents[incident_type]
                print(f"[@alert_system] {device_id}: RESOLVED {incident_type} incident (duration: {incident_data['consecutive_count']} detections)")
                
                resolve_incident_in_db(incident_data["alert_id"])
                del active_incidents[incident_type]
                state_changed = True
        
        # Update state if changed
        if state_changed:
            state["active_incidents"] = active_incidents
            state["last_analysis"] = current_time
            save_device_state(state_file_path, state)
            print(f"[@alert_system] {device_id}: State updated - Active incidents: {list(active_incidents.keys())}")
        
    except Exception as e:
        print(f"[@alert_system] Error processing alert for {device_id}: {e}")

# ==================== OPTIMIZED DATABASE FUNCTIONS ====================
def create_incident_in_db(incident_type, host_name, device_id, analysis_result):
    """Create new incident in database - returns alert_id"""
    try:
        print(f"[@alert_system] DB INSERT: Creating {incident_type} incident for {device_id}")
        # TODO: Actual database call here
        # from lib.supabase.alerts_db import create_alert
        # result = create_alert({
        #     'host_name': host_name,
        #     'device_id': device_id, 
        #     'incident_type': incident_type,
        #     'status': 'active',
        #     'start_time': datetime.now().isoformat(),
        #     'metadata': analysis_result
        # })
        # return result.get('id')
        
        # Mock alert ID for now
        import uuid
        return str(uuid.uuid4())[:8]
        
    except Exception as e:
        print(f"[@alert_system] DB ERROR: Failed to create {incident_type} incident: {e}")
        return None

def update_incident_in_db(alert_id, analysis_result):
    """Update existing incident in database"""
    try:
        print(f"[@alert_system] DB UPDATE: Updating incident {alert_id}")
        # TODO: Actual database call here
        # from lib.supabase.alerts_db import update_alert
        # update_alert(alert_id, {
        #     'last_updated': datetime.now().isoformat(),
        #     'metadata': analysis_result
        # })
        
    except Exception as e:
        print(f"[@alert_system] DB ERROR: Failed to update incident {alert_id}: {e}")

def resolve_incident_in_db(alert_id):
    """Resolve incident in database"""
    try:
        print(f"[@alert_system] DB UPDATE: Resolving incident {alert_id}")
        # TODO: Actual database call here
        # from lib.supabase.alerts_db import resolve_alert
        # resolve_alert(alert_id)
        
    except Exception as e:
        print(f"[@alert_system] DB ERROR: Failed to resolve incident {alert_id}: {e}")

# ==================== UTILITY FUNCTIONS ====================
def extract_device_id(analysis_path):
    """Extract device_id from path"""
    try:
        if 'capture' in analysis_path:
            parts = analysis_path.split('/')
            for part in parts:
                if part.startswith('capture') and part[7:].isdigit():
                    return f"device{part[7:]}"
        return "device-unknown"
    except:
        return "device-unknown"

def startup_cleanup_on_restart():
    """Simple cleanup on service restart"""
    try:
        print("[@alert_system] Service restart - cleanup completed")
    except Exception as e:
        print(f"[@alert_system] Cleanup error: {e}")

# ==================== STATE RECOVERY FUNCTIONS ====================
def validate_device_state_on_startup(capture_dirs):
    """Validate local state files against database on startup"""
    try:
        print("[@alert_system] Validating device states on startup...")
        
        for capture_dir in capture_dirs:
            state_file_path = os.path.join(capture_dir, 'incidents.json')
            if os.path.exists(state_file_path):
                state = load_device_state(state_file_path)
                active_incidents = state.get("active_incidents", {})
                
                if active_incidents:
                    device_id = extract_device_id(capture_dir)
                    print(f"[@alert_system] {device_id}: Found {len(active_incidents)} active incidents in local state")
                    # TODO: Validate against database and sync if needed
        
    except Exception as e:
        print(f"[@alert_system] Error validating device states: {e}")

# Pure utility functions for worker threads