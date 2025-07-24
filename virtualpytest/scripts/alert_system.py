#!/usr/bin/env python3
"""
Alert System Utilities - Local state file management with optimized DB calls
Each device maintains its own incidents.json for fast state checking
"""
import os
import json
import logging
from datetime import datetime

# Setup logging to /tmp/alerts.log
log_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# File handler
file_handler = logging.FileHandler('/tmp/alerts.log')
file_handler.setFormatter(log_formatter)
logger.addHandler(file_handler)

# Console handler (for backward compatibility)
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
logger.addHandler(console_handler)

# ==================== DATABASE IMPORTS (EXACTLY AS BEFORE) ====================
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
            # Add the parent directory to sys.path to import from src
            import sys
            sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
            
            from src.lib.supabase.alerts_db import create_alert_safe as _create_alert_safe, create_alert as _create_alert, resolve_alert as _resolve_alert, get_active_alerts as _get_active_alerts
            create_alert_safe = _create_alert_safe
            create_alert = _create_alert
            resolve_alert = _resolve_alert
            get_active_alerts = _get_active_alerts
            logger.info("Database functions imported successfully")
        except ImportError as e:
            logger.warning(f"Could not import alerts_db module: {e}. Database operations will be skipped.")
            create_alert_safe = False  # Mark as attempted
            create_alert = False
            resolve_alert = False
            get_active_alerts = False

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
        logger.warning(f"Could not save state to {state_file_path}: {e}")

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
        
        # Determine current incidents (2 types only)
        video_issue = None
        audio_issue = False
        
        # Video issues are mutually exclusive (blackscreen takes priority over freeze)
        if blackscreen:
            video_issue = 'blackscreen'
        elif freeze:
            video_issue = 'freeze'
        
        # Audio issue is independent
        if not audio:
            audio_issue = True
        
        current_time = datetime.now().isoformat()
        state_changed = False
        
        logger.info(f"{device_id}: Video issue: {video_issue}, Audio issue: {audio_issue}, Active: {list(active_incidents.keys())}")
        
        # Process VIDEO ISSUE (mutually exclusive: blackscreen OR freeze)
        video_was_active = 'video_issue' in active_incidents
        
        if video_issue and not video_was_active:
            # NEW VIDEO INCIDENT - Create in DB
            logger.info(f"{device_id}: NEW video incident detected: {video_issue}")
            alert_id = create_incident_in_db('video_issue', host_name, device_id, analysis_result, video_issue)
            
            if alert_id:
                active_incidents['video_issue'] = {
                    "alert_id": alert_id,
                    "issue_type": video_issue,
                    "start_time": current_time,
                    "consecutive_count": 1,
                    "last_updated": current_time
                }
                state_changed = True
                
        elif video_issue and video_was_active:
            # ONGOING OR CHANGED VIDEO INCIDENT
            existing_issue_type = active_incidents['video_issue'].get('issue_type')
            
            if existing_issue_type != video_issue:
                # VIDEO ISSUE TYPE CHANGED (blackscreen <-> freeze)
                logger.info(f"{device_id}: Video issue changed from {existing_issue_type} to {video_issue}")
                
                # Resolve old incident
                old_alert_id = active_incidents['video_issue']['alert_id']
                resolve_incident_in_db(old_alert_id)
                
                # Create new incident
                alert_id = create_incident_in_db('video_issue', host_name, device_id, analysis_result, video_issue)
                
                if alert_id:
                    active_incidents['video_issue'] = {
                        "alert_id": alert_id,
                        "issue_type": video_issue,
                        "start_time": current_time,
                        "consecutive_count": 1,
                        "last_updated": current_time
                    }
                    state_changed = True
            else:
                # SAME VIDEO ISSUE CONTINUING - Just update local count
                incident_data = active_incidents['video_issue']
                incident_data["consecutive_count"] += 1
                incident_data["last_updated"] = current_time
                logger.info(f"{device_id}: {video_issue} ongoing (count: {incident_data['consecutive_count']})")
                state_changed = True
                
        elif not video_issue and video_was_active:
            # VIDEO ISSUE RESOLVED
            incident_data = active_incidents['video_issue']
            issue_type = incident_data.get('issue_type', 'unknown')
            logger.info(f"{device_id}: RESOLVED video incident: {issue_type} (duration: {incident_data['consecutive_count']} detections)")
            
            resolve_incident_in_db(incident_data["alert_id"])
            del active_incidents['video_issue']
            state_changed = True
        
        # Process AUDIO ISSUE (independent)
        audio_was_active = 'audio_loss' in active_incidents
        
        if audio_issue and not audio_was_active:
            # NEW AUDIO INCIDENT - Create in DB
            logger.info(f"{device_id}: NEW audio_loss incident detected")
            alert_id = create_incident_in_db('audio_loss', host_name, device_id, analysis_result)
            
            if alert_id:
                active_incidents['audio_loss'] = {
                    "alert_id": alert_id,
                    "start_time": current_time,
                    "consecutive_count": 1,
                    "last_updated": current_time
                }
                state_changed = True
                
        elif audio_issue and audio_was_active:
            # ONGOING AUDIO ISSUE - Just update local count
            incident_data = active_incidents['audio_loss']
            incident_data["consecutive_count"] += 1
            incident_data["last_updated"] = current_time
            logger.info(f"{device_id}: audio_loss ongoing (count: {incident_data['consecutive_count']})")
            state_changed = True
            
        elif not audio_issue and audio_was_active:
            # AUDIO ISSUE RESOLVED
            incident_data = active_incidents['audio_loss']
            logger.info(f"{device_id}: RESOLVED audio_loss incident (duration: {incident_data['consecutive_count']} detections)")
            
            resolve_incident_in_db(incident_data["alert_id"])
            del active_incidents['audio_loss']
            state_changed = True
        
        # Update state if changed
        if state_changed:
            state["active_incidents"] = active_incidents
            state["last_analysis"] = current_time
            save_device_state(state_file_path, state)
            logger.info(f"{device_id}: State updated - Active incidents: {list(active_incidents.keys())}")
        
    except Exception as e:
        logger.error(f"Error processing alert for {device_id}: {e}")

# ==================== OPTIMIZED DATABASE FUNCTIONS ====================
def create_incident_in_db(incident_type, host_name, device_id, analysis_result, issue_type=None):
    """Create new incident in database - returns alert_id"""
    try:
        logger.info(f"DB INSERT: Creating {incident_type} incident for {device_id}" + (f" ({issue_type})" if issue_type else ""))
        
        # Use lazy import exactly as before
        _lazy_import_db()
        if not create_alert_safe or create_alert_safe is False:
            logger.warning("Database module not available, skipping alert creation")
            return None
        
        # Enhance metadata with issue_type for video incidents
        enhanced_metadata = analysis_result.copy()
        if issue_type:
            enhanced_metadata['issue_type'] = issue_type
        
        # Call database exactly as before
        result = create_alert_safe(
            host_name=host_name,
            device_id=device_id,
            incident_type=incident_type,
            consecutive_count=1,  # Always start with 1
            metadata=enhanced_metadata
        )
        
        if result.get('success'):
            alert_id = result.get('alert_id')
            logger.info(f"DB INSERT SUCCESS: Created alert {alert_id}")
            return alert_id
        else:
            logger.error(f"DB INSERT FAILED: {result.get('error')}")
            return None
        
    except Exception as e:
        logger.error(f"DB ERROR: Failed to create {incident_type} incident: {e}")
        return None

# REMOVED: update_incident_in_db - No periodic updates needed

def resolve_incident_in_db(alert_id):
    """Resolve incident in database"""
    try:
        logger.info(f"DB UPDATE: Resolving incident {alert_id}")
        
        # Use lazy import exactly as before
        _lazy_import_db()
        if not resolve_alert or resolve_alert is False:
            logger.warning("Database module not available, skipping alert resolution")
            return False
        
        # Call database exactly as before
        result = resolve_alert(alert_id)
        
        if result.get('success'):
            logger.info(f"DB UPDATE SUCCESS: Resolved alert {alert_id}")
            return True
        else:
            logger.error(f"DB UPDATE FAILED: {result.get('error')}")
            return False
        
    except Exception as e:
        logger.error(f"DB ERROR: Failed to resolve incident {alert_id}: {e}")
        return False

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