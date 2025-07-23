# Simplified Alert System Plan - SINGLE FILE APPROACH

## Current Problems (My Mistakes)

- **3 separate files** for only 160 lines of code
- **queue_utils.py**: 199 lines
- **alert_processor.py**: 230 lines
- **alert_manager.py**: 300+ lines
- **Over-engineered** for simple functionality

## Target: ONE FILE - 160 lines MAX

### Single File: `alert_system.py` → 160 lines MAX

```python
#!/usr/bin/env python3
"""
Unified Alert System - Handles queue, processing, and incident management
Usage: python alert_system.py
"""
import os, json, time, glob
from datetime import datetime

QUEUE_DIR = "/tmp/alert_queue"

# ==================== QUEUE FUNCTIONS ====================
def write_to_alert_queue(analysis_result, host_name, analysis_path):
    """Write alert to queue - SIMPLE"""
    os.makedirs(QUEUE_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    filename = f"alert_{timestamp}.json"

    queue_data = {
        "host_name": host_name,
        "analysis_path": analysis_path,
        "analysis_result": analysis_result,
        "timestamp": datetime.now().isoformat()
    }

    with open(os.path.join(QUEUE_DIR, filename), 'w') as f:
        json.dump(queue_data, f)
    return True

def get_queue_files():
    """Get pending queue files - SIMPLE"""
    return sorted(glob.glob(os.path.join(QUEUE_DIR, "alert_*.json")), key=os.path.getmtime)

# ==================== PROCESSING FUNCTIONS ====================
def process_queue():
    """Process all pending alerts - SIMPLE"""
    for file_path in get_queue_files():
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            # Process the alert
            process_alert(
                data['analysis_result'],
                data['host_name'],
                data['analysis_path']
            )

            # Delete processed file
            os.remove(file_path)

        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            os.remove(file_path)  # Delete bad files

# ==================== ALERT MANAGEMENT FUNCTIONS ====================
def process_alert(analysis_result, host_name, analysis_path):
    """Process single alert - SIMPLE"""
    video = analysis_result.get('video_analysis', {})
    audio = analysis_result.get('audio_analysis', {})

    # Check for incidents
    incidents = []
    if video.get('blackscreen'): incidents.append('blackscreen')
    if video.get('freeze'): incidents.append('freeze')
    if not audio.get('has_audio', True): incidents.append('audio_loss')

    device_id = extract_device_id(analysis_path)

    for incident_type in incidents:
        handle_incident(incident_type, host_name, device_id, analysis_result)

    # Resolve incidents not currently detected
    resolve_missing_incidents(host_name, device_id, incidents)

def handle_incident(incident_type, host_name, device_id, analysis_result):
    """Handle single incident - SIMPLE"""
    existing = get_active_incident(host_name, device_id, incident_type)

    if existing:
        update_incident(existing['id'], analysis_result)
    else:
        create_incident(incident_type, host_name, device_id, analysis_result)

def resolve_missing_incidents(host_name, device_id, current_incidents):
    """Resolve incidents that are no longer detected - SIMPLE"""
    active_incidents = get_active_incidents(host_name, device_id)

    for incident in active_incidents:
        if incident['incident_type'] not in current_incidents:
            resolve_incident(incident['id'])

# ==================== DATABASE FUNCTIONS ====================
def get_active_incident(host_name, device_id, incident_type):
    """Get existing active incident"""
    # Database call here
    pass

def create_incident(incident_type, host_name, device_id, analysis_result):
    """Create new incident"""
    # Database call here
    pass

def update_incident(incident_id, analysis_result):
    """Update existing incident"""
    # Database call here
    pass

def resolve_incident(incident_id):
    """Resolve incident"""
    # Database call here
    pass

def get_active_incidents(host_name, device_id):
    """Get all active incidents for host/device"""
    # Database call here
    pass

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

# ==================== MAIN LOOP ====================
def main():
    """Main processing loop - SIMPLE"""
    print("Starting unified alert system...")

    while True:
        try:
            process_queue()
            time.sleep(2)
        except KeyboardInterrupt:
            print("Shutting down...")
            break
        except Exception as e:
            print(f"Error in main loop: {e}")
            time.sleep(2)

if __name__ == '__main__':
    main()

# THAT'S IT - ONE FILE, 160 LINES, ALL FUNCTIONALITY
```

## What Gets DELETED Completely

### Delete These Entire Files:

1. **`queue_utils.py`** ❌ (199 lines → 0 lines)
2. **`alert_processor.py`** ❌ (230 lines → 0 lines)
3. **`cleanup_alerts.py`** ❌ (entire file)

### Keep Only:

1. **`alert_system.py`** ✅ (160 lines total)
2. **`alert_manager.py`** → **MERGE INTO** `alert_system.py`

## Updated Implementation Steps

### Step 1: Create alert_system.py (160 lines)

- Merge all queue, processing, and alert logic
- Remove all complex features
- Single file with clear sections

### Step 2: Delete old files

- Delete `queue_utils.py`
- Delete `alert_processor.py`
- Delete `cleanup_alerts.py`

### Step 3: Update imports

- Update `analyze_audio_video.py` to import from `alert_system`
- Update `capture_monitor.py` to call `alert_system.py`

## File Structure After Simplification

```
scripts/
├── alert_system.py          # 160 lines - EVERYTHING
├── analyze_audio_video.py   # Existing - calls alert_system
├── capture_monitor.py       # Existing - calls alert_system
└── [other scripts]
```

## Benefits of Single File Approach

1. **No import complexity** - everything in one place
2. **Easy to understand** - linear flow from queue → process → database
3. **Easy to debug** - all logic in one file
4. **Easy to maintain** - no cross-file dependencies
5. **Truly simple** - 160 lines for complete alert system

## The Promise (Updated)

I will create ONE file with 160 lines that does everything:

- Queue management (30 lines)
- Alert processing (50 lines)
- Incident management (80 lines)

**No separate files. No over-engineering. Just one simple file.**

Do you approve this single-file approach?
