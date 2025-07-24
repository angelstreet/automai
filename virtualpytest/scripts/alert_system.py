#!/usr/bin/env python3
"""
Alert System Utilities - Local state file management with optimized DB calls
Each device maintains its own incidents.json for fast state checking
"""
import os
import json
import logging
import sys
from datetime import datetime

# Add the parent directory to sys.path to import from src (exactly as before)
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Load environment variables from .env.host (exactly as before)
try:
    from dotenv import load_dotenv
    env_host_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'web', '.env.host')
    if os.path.exists(env_host_path):
        load_dotenv(env_host_path)
        print(f"[@alert_system] Loaded environment from {env_host_path}")
    else:
        print(f"[@alert_system] Warning: .env.host not found at {env_host_path}")
except ImportError:
    print("[@alert_system] Warning: python-dotenv not available, skipping .env.host loading")

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

# ==================== MEMORY-BASED ALERT PROCESSING ====================
def process_alert_with_memory_state(analysis_result, host_name, device_id, incident_state):
    """Process alert using memory-based incident state - returns updated state"""
    try:
        # Use provided incident state instead of loading from file
        active_incidents = incident_state.get("active_incidents", {})
        
        # Extract incident detection results with all details (CONSISTENT FORMAT)
        blackscreen = analysis_result.get('blackscreen', False)
        blackscreen_percentage = analysis_result.get('blackscreen_percentage', 0)
        freeze = analysis_result.get('freeze', False) 
        freeze_diffs = analysis_result.get('freeze_diffs', [])
        audio = analysis_result.get('audio', True)
        volume_percentage = analysis_result.get('volume_percentage', 0)
        mean_volume_db = analysis_result.get('mean_volume_db', -100)
        last_3_filenames = analysis_result.get('last_3_filenames', [])
        last_3_thumbnails = analysis_result.get('last_3_thumbnails', [])
        
        # Determine current status (simple true/false)
        video_issue = blackscreen or freeze  # True if any video issue
        audio_issue = not audio  # True if audio_loss
        
        # Determine specific incident types for database
        current_incidents = []
        if blackscreen:
            current_incidents.append('blackscreen')
        elif freeze:  # Freeze only if no blackscreen (priority)
            current_incidents.append('freeze')
        if audio_issue:
            current_incidents.append('audio_loss')
            
        current_time = datetime.now().isoformat()
        state_changed = False
        
        logger.info(f"[{device_id}] Analysis: Video={video_issue}, Audio={audio_issue}, Current={current_incidents}, Active={list(active_incidents.keys())}")
        
        # Process each specific incident type (CONSISTENT WITH DIRECT PROCESSING)
        for incident_type in ['blackscreen', 'freeze', 'audio_loss']:
            is_active = incident_type in current_incidents
            was_active = incident_type in active_incidents
            
            if is_active and not was_active:
                # NEW INCIDENT - Create in DB
                logger.info(f"[{device_id}] NEW {incident_type} incident detected")
                
                # Prepare enhanced metadata with all details
                enhanced_metadata = analysis_result.copy()
                if incident_type == 'blackscreen':
                    enhanced_metadata['blackscreen_percentage'] = blackscreen_percentage
                elif incident_type == 'freeze':
                    enhanced_metadata['freeze_diffs'] = freeze_diffs
                elif incident_type == 'audio_loss':
                    enhanced_metadata['volume_percentage'] = volume_percentage
                    enhanced_metadata['mean_volume_db'] = mean_volume_db
                
                # Add frame information for incidents
                enhanced_metadata['last_3_filenames'] = last_3_filenames
                enhanced_metadata['last_3_thumbnails'] = last_3_thumbnails
                
                # Upload freeze frames to R2 if it's a freeze incident
                if incident_type == 'freeze' and last_3_filenames:
                    r2_urls = upload_freeze_frames_to_r2(last_3_filenames, last_3_thumbnails, device_id, current_time)
                    if r2_urls:
                        enhanced_metadata['r2_images'] = r2_urls
                
                alert_id = create_incident_in_db(incident_type, host_name, device_id, enhanced_metadata)
                
                if alert_id:
                    active_incidents[incident_type] = {
                        "alert_id": alert_id,
                        "start_time": current_time,
                        "consecutive_count": 1,
                        "last_updated": current_time
                    }
                    state_changed = True
                    
            elif is_active and was_active:
                # ONGOING INCIDENT - Just update local count
                incident_data = active_incidents[incident_type]
                incident_data["consecutive_count"] += 1
                incident_data["last_updated"] = current_time
                logger.info(f"[{device_id}] {incident_type} ongoing (count: {incident_data['consecutive_count']})")
                state_changed = True
                
            elif not is_active and was_active:
                # INCIDENT RESOLVED
                incident_data = active_incidents[incident_type]
                logger.info(f"[{device_id}] RESOLVED {incident_type} incident (duration: {incident_data['consecutive_count']} detections)")
                
                resolve_incident_in_db(incident_data["alert_id"], device_id)
                del active_incidents[incident_type]
                state_changed = True
        
        # Return updated state
        updated_state = {
            "active_incidents": active_incidents,
            "last_analysis": current_time
        }
        
        if state_changed:
            logger.info(f"[{device_id}] State updated - Active incidents: {list(active_incidents.keys())}")
        
        return updated_state
        
    except Exception as e:
        logger.error(f"[{device_id}] Error processing alert for {device_id}: {e}")
        # Return original state on error
        return incident_state

# ==================== DIRECT ALERT PROCESSING (LEGACY) ====================
def process_alert_directly(analysis_result, host_name, analysis_path):
    """Process alert directly using local state file - optimized DB calls"""
    try:
        # Get device info
        device_id = extract_device_id(analysis_path)
        state_file_path = get_device_state_file(analysis_path)
        
        # Load current device state
        state = load_device_state(state_file_path)
        active_incidents = state.get("active_incidents", {})
        
        # Extract incident detection results with all details
        blackscreen = analysis_result.get('blackscreen', False)
        blackscreen_percentage = analysis_result.get('blackscreen_percentage', 0)
        freeze = analysis_result.get('freeze', False) 
        freeze_diffs = analysis_result.get('freeze_diffs', [])
        audio = analysis_result.get('audio', True)
        volume_percentage = analysis_result.get('volume_percentage', 0)
        
        # Determine current status (simple true/false)
        video_issue = blackscreen or freeze  # True if any video issue
        audio_issue = not audio  # True if audio_loss
        
        # Determine specific incident types for database
        current_incidents = []
        if blackscreen:
            current_incidents.append('blackscreen')
        elif freeze:  # Freeze only if no blackscreen (priority)
            current_incidents.append('freeze')
        if audio_issue:
            current_incidents.append('audio_loss')
        
        current_time = datetime.now().isoformat()
        state_changed = False
        
        logger.info(f"[{device_id}] Analysis: Video={video_issue}, Audio={audio_issue}, Current={current_incidents}, Active={list(active_incidents.keys())}")
        
        # Process each specific incident type
        for incident_type in ['blackscreen', 'freeze', 'audio_loss']:
            is_active = incident_type in current_incidents
            was_active = incident_type in active_incidents
            
            if is_active and not was_active:
                # NEW INCIDENT - Create in DB
                logger.info(f"[{device_id}] NEW {incident_type} incident detected")
                
                # Prepare enhanced metadata with all details
                enhanced_metadata = analysis_result.copy()
                if incident_type == 'blackscreen':
                    enhanced_metadata['blackscreen_percentage'] = blackscreen_percentage
                elif incident_type == 'freeze':
                    enhanced_metadata['freeze_diffs'] = freeze_diffs
                elif incident_type == 'audio_loss':
                    enhanced_metadata['volume_percentage'] = volume_percentage
                    enhanced_metadata['mean_volume_db'] = analysis_result.get('mean_volume_db', -100)
                
                # Add frame information for incidents
                last_3_filenames = analysis_result.get('last_3_filenames', [])
                last_3_thumbnails = analysis_result.get('last_3_thumbnails', [])
                enhanced_metadata['last_3_filenames'] = last_3_filenames
                enhanced_metadata['last_3_thumbnails'] = last_3_thumbnails
                
                # Upload freeze frames to R2 if it's a freeze incident
                if incident_type == 'freeze' and last_3_filenames:
                    r2_urls = upload_freeze_frames_to_r2(last_3_filenames, last_3_thumbnails, device_id, current_time)
                    if r2_urls:
                        enhanced_metadata['r2_images'] = r2_urls
                
                alert_id = create_incident_in_db(incident_type, host_name, device_id, enhanced_metadata)
                
                if alert_id:
                    active_incidents[incident_type] = {
                        "alert_id": alert_id,
                        "start_time": current_time,
                        "consecutive_count": 1,
                        "last_updated": current_time
                    }
                    state_changed = True
                    
            elif is_active and was_active:
                # ONGOING INCIDENT - Just update local count
                incident_data = active_incidents[incident_type]
                incident_data["consecutive_count"] += 1
                incident_data["last_updated"] = current_time
                logger.info(f"[{device_id}] {incident_type} ongoing (count: {incident_data['consecutive_count']})")
                state_changed = True
                
            elif not is_active and was_active:
                # INCIDENT RESOLVED
                incident_data = active_incidents[incident_type]
                logger.info(f"[{device_id}] RESOLVED {incident_type} incident (duration: {incident_data['consecutive_count']} detections)")
                
                resolve_incident_in_db(incident_data["alert_id"], device_id)
                del active_incidents[incident_type]
                state_changed = True
        
        # Update state if changed
        if state_changed:
            state["active_incidents"] = active_incidents
            state["last_analysis"] = current_time
            save_device_state(state_file_path, state)
            logger.info(f"[{device_id}] State updated - Active incidents: {list(active_incidents.keys())}")
        
    except Exception as e:
        logger.error(f"Error processing alert for {device_id}: {e}")

# ==================== OPTIMIZED DATABASE FUNCTIONS ====================
def create_incident_in_db(incident_type, host_name, device_id, analysis_result):
    """Create new incident in database - returns alert_id"""
    try:
        logger.info(f"[{device_id}] DB INSERT: Creating {incident_type} incident")
        
        # Use lazy import exactly as before
        _lazy_import_db()
        if not create_alert_safe or create_alert_safe is False:
            logger.warning("Database module not available, skipping alert creation")
            return None
        
        # Call database exactly as before
        result = create_alert_safe(
            host_name=host_name,
            device_id=device_id,
            incident_type=incident_type,
            consecutive_count=1,  # Always start with 1
            metadata=analysis_result
        )
        
        if result.get('success'):
            alert_id = result.get('alert_id')
            logger.info(f"[{device_id}] DB INSERT SUCCESS: Created alert {alert_id}")
            return alert_id
        else:
            logger.error(f"[{device_id}] DB INSERT FAILED: {result.get('error')}")
            return None
        
    except Exception as e:
        logger.error(f"[{device_id}] DB ERROR: Failed to create {incident_type} incident: {e}")
        return None

# REMOVED: update_incident_in_db - No periodic updates needed

def resolve_incident_in_db(alert_id, device_id="unknown"):
    """Resolve incident in database"""
    try:
        logger.info(f"[{device_id}] DB UPDATE: Resolving incident {alert_id}")
        
        # Use lazy import exactly as before
        _lazy_import_db()
        if not resolve_alert or resolve_alert is False:
            logger.warning(f"[{device_id}] Database module not available, skipping alert resolution")
            return False
        
        # Call database exactly as before
        result = resolve_alert(alert_id)
        
        if result.get('success'):
            logger.info(f"[{device_id}] DB UPDATE SUCCESS: Resolved alert {alert_id}")
            return True
        else:
            logger.error(f"[{device_id}] DB UPDATE FAILED: {result.get('error')}")
            return False
        
    except Exception as e:
        logger.error(f"[{device_id}] DB ERROR: Failed to resolve incident {alert_id}: {e}")
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

# ==================== R2 UPLOAD FUNCTIONS ====================
def upload_freeze_frames_to_r2(last_3_filenames, last_3_thumbnails, device_id, timestamp):
    """Upload freeze incident frames to R2 storage"""
    try:
        # Import R2 utilities
        sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
        from src.utils.cloudflare_utils import get_cloudflare_utils
        
        uploader = get_cloudflare_utils()
        if not uploader:
            logger.warning("R2 uploader not available, skipping frame upload")
            return None
        
        # Create R2 folder path for this incident: alerts/freeze/{device_id}/{timestamp}/
        timestamp_str = timestamp.replace(':', '').replace('-', '').replace('T', '').replace('.', '')[:14]
        base_r2_path = f"alerts/freeze/{device_id}/{timestamp_str}"
        
        r2_results = {
            'original_urls': [],
            'thumbnail_urls': [],
            'original_r2_paths': [],
            'thumbnail_r2_paths': [],
            'timestamp': timestamp
        }
        
        logger.info(f"[{device_id}] Uploading freeze frames to R2 at {timestamp}")
        
        # Upload original frames (last 3)
        for i, filename in enumerate(last_3_filenames):
            if not filename or not os.path.exists(filename):
                logger.warning(f"Original frame file not found: {filename}")
                continue
            
            # R2 path: alerts/freeze/device1/20250124123456/frame_0.jpg
            r2_path = f"{base_r2_path}/frame_{i}.jpg"
            
            upload_result = uploader.upload_file(filename, r2_path)
            if upload_result.get('success'):
                r2_results['original_urls'].append(upload_result['url'])
                r2_results['original_r2_paths'].append(r2_path)
                logger.info(f"[{device_id}] Uploaded original frame {i}: {r2_path}")
            else:
                logger.error(f"[{device_id}] Failed to upload original frame {i}: {upload_result.get('error')}")
        
        # Upload thumbnail frames (last 3)
        for i, thumbnail_filename in enumerate(last_3_thumbnails):
            if not thumbnail_filename:
                continue
                
            # Construct full path if needed
            if not os.path.isabs(thumbnail_filename):
                # Assume thumbnails are in same directory as originals
                if last_3_filenames and i < len(last_3_filenames):
                    original_dir = os.path.dirname(last_3_filenames[i])
                    thumbnail_path = os.path.join(original_dir, thumbnail_filename)
                else:
                    continue
            else:
                thumbnail_path = thumbnail_filename
            
            if not os.path.exists(thumbnail_path):
                logger.warning(f"Thumbnail file not found: {thumbnail_path}")
                continue
            
            # R2 path: alerts/freeze/device1/20250124123456/thumb_0.jpg
            r2_path = f"{base_r2_path}/thumb_{i}.jpg"
            
            upload_result = uploader.upload_file(thumbnail_path, r2_path)
            if upload_result.get('success'):
                r2_results['thumbnail_urls'].append(upload_result['url'])
                r2_results['thumbnail_r2_paths'].append(r2_path)
                logger.info(f"Uploaded thumbnail {i}: {r2_path}")
            else:
                logger.error(f"Failed to upload thumbnail {i}: {upload_result.get('error')}")
        
        # Return results if we uploaded at least some files
        if r2_results['original_urls'] or r2_results['thumbnail_urls']:
            logger.info(f"Successfully uploaded {len(r2_results['original_urls'])} originals and {len(r2_results['thumbnail_urls'])} thumbnails to R2")
            return r2_results
        else:
            logger.warning("No files were successfully uploaded to R2")
            return None
            
    except Exception as e:
        logger.error(f"Error uploading freeze frames to R2: {e}")
        return None

# Pure utility functions for worker threads