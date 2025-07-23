#!/usr/bin/env python3
"""
Alert Manager for HDMI Capture Monitoring
Manages alert state and triggers database alerts based on consecutive detections
"""

import os
import json
import sys
from datetime import datetime, timezone
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

def find_closest_image_for_audio(audio_analysis_path: str) -> Optional[str]:
    """Find the closest available image for an audio incident within a 10-second window."""
    try:
        import glob
        import re
        from datetime import datetime, timedelta
        
        # Audio analysis path is a directory like: /var/www/html/stream/capture2
        # Images are in: /var/www/html/stream/capture2/captures/
        captures_dir = os.path.join(audio_analysis_path, 'captures')
        
        if not os.path.exists(captures_dir):
            print(f"[@alert_manager:find_closest_image_for_audio] Captures directory not found: {captures_dir}")
            return None
        
        # Get current time for the search window (within last 10 seconds)
        current_time = datetime.now()
        search_window = timedelta(seconds=10)
        
        # Find all capture images
        image_pattern = os.path.join(captures_dir, 'capture_*.jpg')
        image_files = glob.glob(image_pattern)
        
        # Filter out thumbnails - only look at original images
        original_images = [f for f in image_files if '_thumbnail' not in f]
        
        if not original_images:
            print(f"[@alert_manager:find_closest_image_for_audio] No original images found in {captures_dir}")
            return None
        
        # Find the most recent image within the time window
        valid_images = []
        for image_path in original_images:
            # Extract timestamp from filename (e.g., capture_20250722105341.jpg)
            filename = os.path.basename(image_path)
            timestamp_match = re.search(r'capture_(\d{14})\.jpg', filename)
            
            if timestamp_match:
                timestamp_str = timestamp_match.group(1)
                try:
                    # Parse timestamp: YYYYMMDDHHMMSS
                    image_time = datetime.strptime(timestamp_str, '%Y%m%d%H%M%S')
                    
                    # Check if image is within the search window
                    time_diff = current_time - image_time
                    if time_diff <= search_window and time_diff >= timedelta(0):
                        valid_images.append((image_path, image_time))
                        
                except ValueError:
                    continue
        
        if not valid_images:
            # If no images within 10 seconds, get the most recent available image
            print(f"[@alert_manager:find_closest_image_for_audio] No images within 10s window, using most recent")
            most_recent = max(original_images, key=os.path.getmtime)
            return most_recent
        
        # Sort by time and get the most recent within the window
        valid_images.sort(key=lambda x: x[1], reverse=True)
        closest_image_path = valid_images[0][0]
        
        print(f"[@alert_manager:find_closest_image_for_audio] Found {len(valid_images)} valid images, using: {os.path.basename(closest_image_path)}")
        return closest_image_path
        
    except Exception as e:
        print(f"[@alert_manager:find_closest_image_for_audio] Error finding closest image: {e}")
        return None

def upload_incident_images_to_r2(analysis_path: str, host_name: str, device_id: str, incident_type: str) -> Dict:
    """Upload incident images to R2 and return public URLs."""
    try:
        print(f"[@alert_manager:upload_incident_images_to_r2] Uploading incident images for {incident_type}")
        
        # For audio incidents, find the closest available image
        if incident_type == 'audio_loss':
            print(f"[@alert_manager:upload_incident_images_to_r2] Audio incident - finding closest image")
            closest_image_path = find_closest_image_for_audio(analysis_path)
            if closest_image_path:
                print(f"[@alert_manager:upload_incident_images_to_r2] Found closest image: {os.path.basename(closest_image_path)}")
                analysis_path = closest_image_path  # Use the found image path
            else:
                print(f"[@alert_manager:upload_incident_images_to_r2] No images found for audio incident")
                return {'success': False, 'error': 'No images found for audio incident', 'skip_upload': True}
        
        # Import R2 utilities
        from src.utils.cloudflare_utils import get_cloudflare_utils
        
        # Get the image directory and filename
        if os.path.isfile(analysis_path):
            image_dir = os.path.dirname(analysis_path)
            image_filename = os.path.basename(analysis_path)
        else:
            print(f"[@alert_manager:upload_incident_images_to_r2] Analysis path is not a file: {analysis_path}")
            return {'success': False, 'error': 'Invalid analysis path'}
        
        # Extract timestamp from filename (e.g., capture_20250722105341.jpg)
        timestamp_match = image_filename.replace('capture_', '').replace('.jpg', '')
        if not timestamp_match.isdigit() or len(timestamp_match) != 14:
            print(f"[@alert_manager:upload_incident_images_to_r2] Could not extract timestamp from: {image_filename}")
            return {'success': False, 'error': 'Invalid filename format'}
        
        # Build thumbnail filename
        thumbnail_filename = image_filename.replace('.jpg', '_thumbnail.jpg')
        thumbnail_path = os.path.join(image_dir, thumbnail_filename)
        
        # Check if files exist
        if not os.path.exists(analysis_path):
            print(f"[@alert_manager:upload_incident_images_to_r2] Original image not found: {analysis_path}")
            return {'success': False, 'error': 'Original image not found'}
        
        if not os.path.exists(thumbnail_path):
            print(f"[@alert_manager:upload_incident_images_to_r2] Thumbnail not found: {thumbnail_path}")
            return {'success': False, 'error': 'Thumbnail not found'}
        
        # Get R2 uploader
        uploader = get_cloudflare_utils()
        
        # Create R2 paths for alert images
        # Format: alerts/{host_name}/{device_id}/{incident_type}/{timestamp}/
        alert_folder = f"alerts/{host_name}/{device_id}/{incident_type}/{timestamp_match}"
        
        original_r2_path = f"{alert_folder}/original.jpg"
        thumbnail_r2_path = f"{alert_folder}/thumbnail.jpg"
        
        # Upload original image
        print(f"[@alert_manager:upload_incident_images_to_r2] Uploading original: {original_r2_path}")
        original_upload = uploader.upload_file(analysis_path, original_r2_path)
        
        if not original_upload.get('success'):
            print(f"[@alert_manager:upload_incident_images_to_r2] Failed to upload original: {original_upload.get('error')}")
            return {'success': False, 'error': f"Failed to upload original image: {original_upload.get('error')}"}
        
        # Upload thumbnail
        print(f"[@alert_manager:upload_incident_images_to_r2] Uploading thumbnail: {thumbnail_r2_path}")
        thumbnail_upload = uploader.upload_file(thumbnail_path, thumbnail_r2_path)
        
        if not thumbnail_upload.get('success'):
            print(f"[@alert_manager:upload_incident_images_to_r2] Failed to upload thumbnail: {thumbnail_upload.get('error')}")
            return {'success': False, 'error': f"Failed to upload thumbnail: {thumbnail_upload.get('error')}"}
        
        print(f"[@alert_manager:upload_incident_images_to_r2] Successfully uploaded both images to R2")
        
        return {
            'success': True,
            'original_url': original_upload.get('url'),
            'thumbnail_url': thumbnail_upload.get('url'),
            'original_r2_path': original_r2_path,
            'thumbnail_r2_path': thumbnail_r2_path,
            'timestamp': timestamp_match
        }
        
    except ImportError as e:
        print(f"[@alert_manager:upload_incident_images_to_r2] CloudflareUtils not available: {e}")
        return {'success': False, 'error': 'R2 upload not available'}
    except Exception as e:
        print(f"[@alert_manager:upload_incident_images_to_r2] Error uploading to R2: {e}")
        return {'success': False, 'error': str(e)}

# Alert configuration
ALERT_THRESHOLD = 3  # Number of consecutive detections needed to trigger alert
INCIDENT_TYPES = ['blackscreen', 'freeze', 'audio_loss']

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
    
    # Upload incident images to R2
    print(f"[@alert_manager:trigger_alert] Uploading incident images to R2...")
    r2_upload_result = upload_incident_images_to_r2(analysis_path, host_name, device_id, incident_type)
    
    # Enhance metadata with R2 URLs (if upload successful)
    enhanced_metadata = metadata.copy() if metadata else {}
    
    if r2_upload_result.get('success'):
        print(f"[@alert_manager:trigger_alert] Successfully uploaded images to R2")
        enhanced_metadata.update({
            'r2_images': {
                'original_url': r2_upload_result.get('original_url'),
                'thumbnail_url': r2_upload_result.get('thumbnail_url'),
                'original_r2_path': r2_upload_result.get('original_r2_path'),
                'thumbnail_r2_path': r2_upload_result.get('thumbnail_r2_path'),
                'timestamp': r2_upload_result.get('timestamp')
            }
        })
    else:
        # Only log error if it's not an expected skip for audio incidents
        if not r2_upload_result.get('skip_upload'):
            print(f"[@alert_manager:trigger_alert] Failed to upload images to R2: {r2_upload_result.get('error')}")
            enhanced_metadata.update({
                'r2_upload_error': r2_upload_result.get('error')
            })
        else:
            if r2_upload_result.get('skip_upload'):
                print(f"[@alert_manager:trigger_alert] Skipped R2 upload for audio incident (no images found)")
            else:
                print(f"[@alert_manager:trigger_alert] R2 upload failed: {r2_upload_result.get('error')}")
    
    result = create_alert_safe(
        host_name=host_name,
        device_id=device_id,
        incident_type=incident_type,
        consecutive_count=consecutive_count,
        metadata=enhanced_metadata
    )
    
    if result['success']:
        alert_id = result.get('alert_id')
        print(f"[@alert_manager:trigger_alert] Successfully created alert: {alert_id}")
        if r2_upload_result.get('success'):
            print(f"  - Original image URL: {enhanced_metadata['r2_images']['original_url']}")
            print(f"  - Thumbnail image URL: {enhanced_metadata['r2_images']['thumbnail_url']}")
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

def cleanup_local_state_files() -> None:
    """Clean up all local alert state files when database has no active alerts."""
    try:
        print("[@alert_manager:cleanup_local_state_files] Cleaning up all local alert state files...")
        
        # Common capture directories to clean
        capture_base_dirs = [
            "/var/www/html/stream/capture1",
            "/var/www/html/stream/capture2", 
            "/var/www/html/stream/capture3",
            "/var/www/html/stream/capture4"
        ]
        
        cleaned_count = 0
        
        for base_dir in capture_base_dirs:
            if os.path.exists(base_dir):
                # Check both main directory and captures subdirectory
                potential_state_files = [
                    os.path.join(base_dir, 'alert_state.json'),
                    os.path.join(base_dir, 'captures', 'alert_state.json')
                ]
                
                for state_file in potential_state_files:
                    if os.path.exists(state_file):
                        try:
                            os.remove(state_file)
                            print(f"[@alert_manager:cleanup_local_state_files] Removed: {state_file}")
                            cleaned_count += 1
                        except OSError as e:
                            print(f"[@alert_manager:cleanup_local_state_files] Failed to remove {state_file}: {e}")
        
        # Also clean any state files in /tmp/alert_queue
        queue_dir = "/tmp/alert_queue"
        if os.path.exists(queue_dir):
            try:
                import glob
                state_files = glob.glob(os.path.join(queue_dir, "**/alert_state.json"), recursive=True)
                for state_file in state_files:
                    try:
                        os.remove(state_file)
                        print(f"[@alert_manager:cleanup_local_state_files] Removed queue state: {state_file}")
                        cleaned_count += 1
                    except OSError as e:
                        print(f"[@alert_manager:cleanup_local_state_files] Failed to remove {state_file}: {e}")
            except Exception as e:
                print(f"[@alert_manager:cleanup_local_state_files] Error cleaning queue directory: {e}")
        
        print(f"[@alert_manager:cleanup_local_state_files] Cleaned {cleaned_count} state files")
        
    except Exception as e:
        print(f"[@alert_manager:cleanup_local_state_files] Error during cleanup: {e}")

def check_database_has_active_alerts() -> bool:
    """Check if database has any active alerts across all hosts/devices."""
    try:
        _lazy_import_db()
        if not get_active_alerts or get_active_alerts is False:
            print("[@alert_manager:check_database_has_active_alerts] Database module not available")
            return False
        
        # Get all active alerts without any filters
        result = get_active_alerts(limit=1)  # Just need to know if any exist
        
        if result['success']:
            has_active = len(result['alerts']) > 0
            print(f"[@alert_manager:check_database_has_active_alerts] Database has {len(result['alerts'])} active alerts")
            return has_active
        else:
            print(f"[@alert_manager:check_database_has_active_alerts] Failed to check database: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"[@alert_manager:check_database_has_active_alerts] Error checking database: {e}")
        return False

def validate_and_cleanup_state(state: Dict, host_name: str, analysis_path: str) -> Dict:
    """Validate alert state and cleanup any inconsistencies with database."""
    try:
        device_id = extract_device_id_from_path(analysis_path)
        active_incidents = state.get("active_incidents", {})
        
        # If no local active incidents, check if database is completely clean
        if not active_incidents:
            if not check_database_has_active_alerts():
                print("[@alert_manager:validate_state] No local incidents and database is clean - state is valid")
                return state
            else:
                print("[@alert_manager:validate_state] No local incidents but database has active alerts - will sync on next detection")
                return state
        
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
        
        # If all incidents were removed and database has no active alerts, clean up all state files
        if not active_incidents and not check_database_has_active_alerts():
            print("[@alert_manager:validate_state] All incidents cleared and database is clean - performing global cleanup")
            cleanup_local_state_files()
        
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
                                analysis_data.get('freeze', False))
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
                'freeze': analysis_data.get('freeze', False)
            }
        elif 'audio_analysis' in analysis_result:
            # Audio analysis format
            audio_data = analysis_result['audio_analysis']
            # Audio loss = no audio detected
            detections = {
                'audio_loss': not audio_data.get('has_audio', True)
            }
        
        current_time = datetime.now(timezone.utc).isoformat()
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
                        # Double-check database before creating alert to prevent race conditions
                        _lazy_import_db()
                        if get_active_alerts and get_active_alerts is not False:
                            try:
                                from src.lib.supabase.alerts_db import get_active_alert_for_incident
                                db_check_result = get_active_alert_for_incident(host_name, device_id, incident_type)
                                
                                if db_check_result['success'] and db_check_result['alert']:
                                    # Alert already exists in database, update our local state
                                    existing_alert_id = db_check_result['alert']['id']
                                    active_incidents[incident_type]['alert_id'] = existing_alert_id
                                    print(f"[@alert_manager] {incident_type}: Found existing alert {existing_alert_id} in database - updating local state")
                                    state_changed = True
                                    continue
                            except ImportError:
                                pass  # Skip database check if not available
                        
                        # Trigger alert - THIS IS THE ONLY DB INSERT
                        metadata = {
                            'analysis_path': analysis_path,
                            'first_detection': active_incidents[incident_type]['start_time'],
                            'analysis_result': analysis_result
                        }
                        
                        # Add freeze detection details to metadata if it's a freeze incident
                        if incident_type == 'freeze' and 'analysis' in analysis_result:
                            freeze_details = analysis_result['analysis'].get('freeze_details')
                            if freeze_details:
                                metadata['freeze_details'] = freeze_details
                        
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
    if len(sys.argv) < 2:
        print("Usage:")
        print("  alert_manager.py <analysis_result_json> <host_name> <analysis_path>")
        print("  alert_manager.py --cleanup    # Clean local state if database is empty")
        print("  alert_manager.py --force-cleanup    # Force clean all local state files")
        sys.exit(1)
    
    # Handle cleanup commands
    if sys.argv[1] == "--cleanup":
        print("[@alert_manager] Manual cleanup requested")
        startup_cleanup_if_database_empty()
        return
    elif sys.argv[1] == "--force-cleanup":
        print("[@alert_manager] Force cleanup requested - removing all local state files")
        cleanup_local_state_files()
        cleanup_alert_queue()
        print("[@alert_manager] Force cleanup completed")
        return
    
    # Normal processing
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

def startup_cleanup_if_database_empty() -> None:
    """Perform startup cleanup if database has no active alerts."""
    try:
        print("[@alert_manager:startup_cleanup] Checking if startup cleanup is needed...")
        
        if not check_database_has_active_alerts():
            print("[@alert_manager:startup_cleanup] Database has no active alerts - performing startup cleanup")
            cleanup_local_state_files()
            
            # Also clean any pending alert queue files
            cleanup_alert_queue()
            
            print("[@alert_manager:startup_cleanup] Startup cleanup completed - fresh start")
        else:
            print("[@alert_manager:startup_cleanup] Database has active alerts - keeping local state files")
            
    except Exception as e:
        print(f"[@alert_manager:startup_cleanup] Error during startup cleanup: {e}")

def startup_cleanup_on_restart() -> None:
    """Perform aggressive cleanup on service restart to prevent phantom alerts."""
    try:
        print("[@alert_manager:startup_cleanup_on_restart] Service restart detected - performing full cleanup")
        
        # Always clean local state files (regardless of database state)
        print("[@alert_manager:startup_cleanup_on_restart] Cleaning all local state files...")
        cleanup_local_state_files()
        
        # Always clean alert queue (remove stale/pending items)
        print("[@alert_manager:startup_cleanup_on_restart] Cleaning alert queue...")
        cleanup_alert_queue()
        
        # Validate monitoring capabilities against database alerts
        validate_monitoring_capabilities()
        
        print("[@alert_manager:startup_cleanup_on_restart] Aggressive cleanup completed - preventing phantom alerts")
        
    except Exception as e:
        print(f"[@alert_manager:startup_cleanup_on_restart] Error during aggressive cleanup: {e}")

def validate_monitoring_capabilities() -> None:
    """Validate that we can actually monitor the alerts in the database."""
    try:
        print("[@alert_manager:validate_monitoring] Validating monitoring capabilities...")
        
        _lazy_import_db()
        if not get_active_alerts or get_active_alerts is False:
            print("[@alert_manager:validate_monitoring] Database not available, skipping validation")
            return
        
        # Get all active alerts from database
        result = get_active_alerts(limit=100)
        if not result['success']:
            print(f"[@alert_manager:validate_monitoring] Failed to get active alerts: {result.get('error')}")
            return
        
        active_alerts = result['alerts']
        if not active_alerts:
            print("[@alert_manager:validate_monitoring] No active alerts to validate")
            return
        
        print(f"[@alert_manager:validate_monitoring] Found {len(active_alerts)} active alerts to validate")
        
        # Check each alert for monitoring capability
        stale_alerts = []
        for alert in active_alerts:
            alert_id = alert['id']
            incident_type = alert['incident_type']
            device_id = alert['device_id']
            start_time = alert['start_time']
            
            # Check if we can actually monitor this alert
            if not can_monitor_alert(alert):
                print(f"[@alert_manager:validate_monitoring] Alert {alert_id} cannot be monitored - marking as stale")
                stale_alerts.append(alert_id)
            else:
                print(f"[@alert_manager:validate_monitoring] Alert {alert_id} ({incident_type} on {device_id}) can be monitored")
        
        # Resolve stale alerts that cannot be monitored
        if stale_alerts:
            print(f"[@alert_manager:validate_monitoring] Resolving {len(stale_alerts)} stale alerts...")
            for alert_id in stale_alerts:
                try:
                    resolve_result = resolve_alert(alert_id)
                    if resolve_result['success']:
                        print(f"[@alert_manager:validate_monitoring] Resolved stale alert: {alert_id}")
                    else:
                        print(f"[@alert_manager:validate_monitoring] Failed to resolve stale alert {alert_id}: {resolve_result.get('error')}")
                except Exception as e:
                    print(f"[@alert_manager:validate_monitoring] Error resolving alert {alert_id}: {e}")
        else:
            print("[@alert_manager:validate_monitoring] All active alerts can be monitored")
            
    except Exception as e:
        print(f"[@alert_manager:validate_monitoring] Error during validation: {e}")

def can_monitor_alert(alert: Dict) -> bool:
    """Check if we can actually monitor this alert based on current system state."""
    try:
        incident_type = alert['incident_type']
        device_id = alert['device_id']
        start_time = alert['start_time']
        
        # Parse start time
        from datetime import datetime, timedelta
        try:
            if start_time.endswith('Z'):
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            else:
                start_dt = datetime.fromisoformat(start_time)
        except ValueError:
            print(f"[@alert_manager:can_monitor_alert] Invalid start_time format: {start_time}")
            return False
        
        # Check if alert is too old (more than 1 hour old alerts are likely stale)
        current_time = datetime.now(start_dt.tzinfo) if start_dt.tzinfo else datetime.now()
        age = current_time - start_dt
        max_age = timedelta(hours=1)
        
        if age > max_age:
            print(f"[@alert_manager:can_monitor_alert] Alert is too old ({age.total_seconds():.0f}s > {max_age.total_seconds():.0f}s)")
            return False
        
        # Check if monitoring infrastructure exists for this device
        if incident_type == 'audio_loss':
            # For audio incidents, check if audio monitoring is working
            return can_monitor_audio_for_device(device_id)
        else:
            # For visual incidents, check if frame monitoring is working  
            return can_monitor_frames_for_device(device_id)
        
    except Exception as e:
        print(f"[@alert_manager:can_monitor_alert] Error checking monitoring capability: {e}")
        return False

def can_monitor_audio_for_device(device_id: str) -> bool:
    """Check if audio monitoring is working for a specific device."""
    try:
        # Extract device number from device_id (e.g., "device2" -> "2")
        if not device_id.startswith('device'):
            return False
        
        device_number = device_id.replace('device', '')
        if not device_number.isdigit():
            return False
        
        # Check if capture directory exists
        capture_dir = f"/var/www/html/stream/capture{device_number}"
        if not os.path.exists(capture_dir):
            print(f"[@alert_manager:can_monitor_audio] Capture directory not found: {capture_dir}")
            return False
        
        # Check if recent HLS segments exist (within last 10 seconds)
        import glob
        from datetime import datetime, timedelta
        
        segment_pattern = os.path.join(capture_dir, "segment_*.ts")
        segments = glob.glob(segment_pattern)
        
        if not segments:
            print(f"[@alert_manager:can_monitor_audio] No HLS segments found in {capture_dir}")
            return False
        
        # Check if any segment is recent
        current_time = datetime.now()
        recent_threshold = timedelta(seconds=30)  # Allow 30 seconds for segment creation
        
        for segment in segments:
            try:
                segment_time = datetime.fromtimestamp(os.path.getmtime(segment))
                if current_time - segment_time < recent_threshold:
                    print(f"[@alert_manager:can_monitor_audio] Found recent HLS segment for {device_id}")
                    return True
            except OSError:
                continue
        
        print(f"[@alert_manager:can_monitor_audio] No recent HLS segments for {device_id}")
        return False
        
    except Exception as e:
        print(f"[@alert_manager:can_monitor_audio] Error checking audio monitoring for {device_id}: {e}")
        return False

def can_monitor_frames_for_device(device_id: str) -> bool:
    """Check if frame monitoring is working for a specific device."""
    try:
        # Extract device number from device_id (e.g., "device1" -> "1")
        if not device_id.startswith('device'):
            return False
        
        device_number = device_id.replace('device', '')
        if not device_number.isdigit():
            return False
        
        # Check if captures directory exists
        captures_dir = f"/var/www/html/stream/capture{device_number}/captures"
        if not os.path.exists(captures_dir):
            print(f"[@alert_manager:can_monitor_frames] Captures directory not found: {captures_dir}")
            return False
        
        # Check if recent capture images exist (within last 10 seconds)
        import glob
        from datetime import datetime, timedelta
        
        image_pattern = os.path.join(captures_dir, "capture_*.jpg")
        images = glob.glob(image_pattern)
        
        # Filter out thumbnails
        original_images = [img for img in images if '_thumbnail' not in img]
        
        if not original_images:
            print(f"[@alert_manager:can_monitor_frames] No capture images found in {captures_dir}")
            return False
        
        # Check if any image is recent
        current_time = datetime.now()
        recent_threshold = timedelta(seconds=10)  # Images should be created every second
        
        for image in original_images:
            try:
                image_time = datetime.fromtimestamp(os.path.getmtime(image))
                if current_time - image_time < recent_threshold:
                    print(f"[@alert_manager:can_monitor_frames] Found recent capture image for {device_id}")
                    return True
            except OSError:
                continue
        
        print(f"[@alert_manager:can_monitor_frames] No recent capture images for {device_id}")
        return False
        
    except Exception as e:
        print(f"[@alert_manager:can_monitor_frames] Error checking frame monitoring for {device_id}: {e}")
        return False

def cleanup_alert_queue() -> None:
    """Clean up pending alert queue files."""
    try:
        queue_dir = "/tmp/alert_queue"
        if not os.path.exists(queue_dir):
            return
        
        import glob
        
        # Clean pending alert files
        pending_files = glob.glob(os.path.join(queue_dir, "alert_*.json"))
        for file_path in pending_files:
            try:
                os.remove(file_path)
                print(f"[@alert_manager:cleanup_alert_queue] Removed pending alert: {os.path.basename(file_path)}")
            except OSError as e:
                print(f"[@alert_manager:cleanup_alert_queue] Failed to remove {file_path}: {e}")
        
        # Clean processed files older than 1 hour
        processed_dir = os.path.join(queue_dir, "processed")
        if os.path.exists(processed_dir):
            import time
            cutoff_time = time.time() - 3600  # 1 hour ago
            
            processed_files = glob.glob(os.path.join(processed_dir, "*"))
            for file_path in processed_files:
                try:
                    if os.path.getmtime(file_path) < cutoff_time:
                        os.remove(file_path)
                        print(f"[@alert_manager:cleanup_alert_queue] Removed old processed: {os.path.basename(file_path)}")
                except OSError:
                    pass
        
        print("[@alert_manager:cleanup_alert_queue] Alert queue cleanup completed")
        
    except Exception as e:
        print(f"[@alert_manager:cleanup_alert_queue] Error cleaning alert queue: {e}") 