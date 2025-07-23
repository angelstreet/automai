# Alert System Unification Migration Plan

## Overview

This plan outlines the complete migration from separate audio/video analysis to a unified analysis system. This is a **breaking change** with **no backward compatibility**.

## ⚠️ CRITICAL WARNINGS

- **Zero Downtime**: This migration cannot be done with zero downtime
- **Data Loss**: Existing separate JSON files will become inaccessible
- **Service Interruption**: Monitoring and alerts will be interrupted during migration
- **Full System Impact**: Frontend, backend, and database systems all affected

## 🎯 Migration Goals

1. **Unified Analysis**: Single script that analyzes both video and audio
2. **Aligned Timing**: Both analyses run every 3 seconds (synchronized)
3. **Single JSON Output**: One file per capture with both `analysis` and `audio_analysis` fields
4. **Simplified Queue**: Single queue type instead of separate audio/frame queues
5. **Reduced Complexity**: Eliminate duplicate code and logic

## 📁 Files Requiring Modification

### Phase 1: Core Analysis Scripts (CRITICAL)

| File                                       | Action              | Description                                       |
| ------------------------------------------ | ------------------- | ------------------------------------------------- |
| `virtualpytest/scripts/analyze_frame.py`   | **RENAME + MODIFY** | → `analyze_capture.py` - Add audio analysis logic |
| `virtualpytest/scripts/analyze_audio.py`   | **DELETE**          | Logic moved to unified script                     |
| `virtualpytest/scripts/capture_monitor.py` | **MAJOR MODIFY**    | Remove audio worker, update timing to 3s          |

### Phase 2: Queue & Alert System (CRITICAL)

| File                                       | Action           | Description                                            |
| ------------------------------------------ | ---------------- | ------------------------------------------------------ |
| `virtualpytest/scripts/queue_utils.py`     | **MODIFY**       | Remove `analysis_type` parameter, single queue format  |
| `virtualpytest/scripts/alert_manager.py`   | **MAJOR MODIFY** | Unified processing, remove audio/frame differentiation |
| `virtualpytest/scripts/alert_processor.py` | **MODIFY**       | Handle unified format only                             |
| `virtualpytest/scripts/cleanup_alerts.py`  | **MINOR MODIFY** | Update for unified format (if needed)                  |

### Phase 3: Frontend Systems (HIGH IMPACT)

| File                                                      | Action           | Description                                          |
| --------------------------------------------------------- | ---------------- | ---------------------------------------------------- |
| `virtualpytest/src/web/hooks/monitoring/useMonitoring.ts` | **MAJOR MODIFY** | Remove separate audio loading, expect unified format |
| `virtualpytest/src/web/routes/host_heatmap_routes.py`     | **MODIFY**       | Remove `has_audio_analysis` flag, unified detection  |
| `virtualpytest/src/lib/supabase/heatmap_db.py`            | **MAJOR MODIFY** | Remove separate audio JSON processing                |
| `virtualpytest/src/utils/heatmap_utils.py`                | **MODIFY**       | Update analysis data parsing                         |

### Phase 4: Supporting Systems (MEDIUM IMPACT)

| File                                                      | Action           | Description                         |
| --------------------------------------------------------- | ---------------- | ----------------------------------- |
| `virtualpytest/src/controllers/verification/video.py`     | **MINOR MODIFY** | Update comments/references (if any) |
| `virtualpytest/src/web/routes/host_verification_video.py` | **MINOR MODIFY** | Update comments/references (if any) |

## 🔧 Detailed Implementation Steps

### Step 1: Create Unified Analysis Script

**File**: `virtualpytest/scripts/analyze_capture.py` (rename from `analyze_frame.py`)

**Changes Required**:

```python
def analyze_capture_unified(image_path, host_name):
    """Unified analysis combining video and audio"""

    # Extract device info
    device_id = extract_device_id_from_path(image_path)
    capture_dir = get_capture_directory(image_path)

    # Video Analysis (existing logic)
    video_analysis = {
        'blackscreen': analyze_blackscreen(image_path),
        'freeze': analyze_freeze(image_path),
        'freeze_details': get_freeze_details() if frozen else None
    }

    # Audio Analysis (from analyze_audio.py)
    audio_analysis = {
        'has_audio': analyze_audio_in_directory(capture_dir),
        'volume_percentage': get_volume_percentage(),
        'mean_volume_db': get_mean_volume_db(),
        'analyzed_segment': get_latest_segment()
    }

    # Unified Result
    unified_result = {
        'timestamp': datetime.now().isoformat(),
        'filename': os.path.basename(image_path),
        'analysis': video_analysis,           # Video data
        'audio_analysis': audio_analysis,     # Audio data
        'processing_info': {
            'analyzed_at': datetime.now().isoformat(),
            'analysis_mode': 'unified_capture'
        }
    }

    # Single JSON output (NO separate _audio.json)
    save_unified_json(unified_result)

    # Single queue entry
    queue_unified_alert(unified_result, host_name, image_path)
```

### Step 2: Update Capture Monitor

**File**: `virtualpytest/scripts/capture_monitor.py`

**Changes Required**:

```python
# REMOVE: AUDIO_ANALYSIS_INTERVAL = 5
# CHANGE: FRAME_ANALYSIS_INTERVAL = 1 → UNIFIED_ANALYSIS_INTERVAL = 3

UNIFIED_ANALYSIS_INTERVAL = 3  # seconds - aligned timing

class CaptureMonitor:
    # REMOVE: audio_worker() method
    # REMOVE: start_audio_workers() method
    # MODIFY: frame_worker() → unified_worker()

    def unified_worker(self, capture_dir):
        """Unified analysis worker - replaces both frame and audio workers"""
        while self.running:
            # Find recent unanalyzed frames
            unanalyzed_frames = self.find_recent_unanalyzed_frames(capture_dir, max_frames=1)

            for frame_path in unanalyzed_frames:
                # Call unified analysis script
                cmd = [
                    "bash", "-c",
                    f"source {VENV_PATH} && python {SCRIPTS_DIR}/analyze_capture.py '{frame_path}' '{HOST_NAME}'"
                ]
                # Execute...

            # Wait 3 seconds
            for _ in range(UNIFIED_ANALYSIS_INTERVAL):
                if not self.running:
                    break
                time.sleep(1)

    def run(self):
        # REMOVE: self.start_audio_workers()
        # CHANGE: self.start_frame_workers() → self.start_unified_workers()
        self.start_unified_workers(capture_dirs)
```

### Step 3: Update Queue System

**File**: `virtualpytest/scripts/queue_utils.py`

**Changes Required**:

```python
# REMOVE: analysis_type parameter
def write_to_alert_queue(
    analysis_result: Dict[Any, Any],
    host_name: str,
    analysis_path: str
    # REMOVED: analysis_type: str = "frame"
) -> bool:

    # CHANGE: filename format
    # OLD: f"alert_{analysis_type}_{timestamp}.json"
    # NEW: f"alert_unified_{timestamp}.json"
    filename = f"alert_unified_{timestamp}.json"

    queue_data = {
        "timestamp": datetime.now().isoformat(),
        "analysis_type": "unified",  # Always unified
        "host_name": host_name,
        "analysis_path": analysis_path,
        "analysis_result": analysis_result,
        "queued_at": time.time()
    }
```

### Step 4: Update Alert Manager

**File**: `virtualpytest/scripts/alert_manager.py`

**Changes Required**:

```python
def check_and_update_alerts(analysis_result: Dict, host_name: str, analysis_path: str):
    """Unified alert processing - handles both video and audio in single result"""

    # REMOVE: Separate processing paths
    # OLD: if 'analysis' in analysis_result: ... elif 'audio_analysis' in analysis_result:

    # NEW: Unified processing
    video_analysis = analysis_result.get('analysis', {})
    audio_analysis = analysis_result.get('audio_analysis', {})

    # Extract all incident types from unified result
    detections = {
        'blackscreen': video_analysis.get('blackscreen', False),
        'freeze': video_analysis.get('freeze', False),
        'audio_loss': not audio_analysis.get('has_audio', True)
    }

    # Process all incidents in single pass
    for incident_type, is_detected in detections.items():
        # Unified processing logic...
```

### Step 5: Update Frontend Monitoring

**File**: `virtualpytest/src/web/hooks/monitoring/useMonitoring.ts`

**Changes Required**:

```typescript
// REMOVE: Separate audio file loading
// OLD: const audioUrl = selectedFrame.jsonUrl.replace('.json', '_audio.json');

// NEW: Expect unified format
const response = await fetch(selectedFrame.jsonUrl);
const unifiedData = await response.json();

if (unifiedData.analysis && unifiedData.audio_analysis) {
  analysis = {
    // Video data
    blackscreen: unifiedData.analysis.blackscreen,
    freeze: unifiedData.analysis.freeze,
    errors: unifiedData.analysis.errors,

    // Audio data
    audio: {
      has_audio: unifiedData.audio_analysis.has_audio,
      volume_percentage: unifiedData.audio_analysis.volume_percentage,
    },
  };
}
```

### Step 6: Update Heatmap System

**File**: `virtualpytest/src/web/routes/host_heatmap_routes.py`

**Changes Required**:

```python
# REMOVE: Separate audio JSON check
# OLD: audio_json_exists = os.path.exists(os.path.join(capture_folder, f"{base_name}_audio.json"))

# NEW: Check for unified analysis
frame_json_exists = os.path.exists(os.path.join(capture_folder, f"{base_name}.json"))

files.append({
    'filename': filename,
    'timestamp': timestamp,
    'has_frame_analysis': frame_json_exists,
    # REMOVE: 'has_audio_analysis': audio_json_exists,
    'has_unified_analysis': frame_json_exists,  # Single analysis file
    'file_mtime': int(os.path.getmtime(filepath) * 1000)
})
```

**File**: `virtualpytest/src/lib/supabase/heatmap_db.py`

**Changes Required**:

```python
# REMOVE: Separate audio JSON processing
# OLD: audio_json_url = item.get('audio_json_url')

# NEW: Expect unified format in single JSON
frame_json_url = item.get('frame_json_url')
if frame_json_url:
    response = requests.get(frame_json_url, timeout=3)
    if response.status_code == 200:
        unified_data = response.json()

        # Extract both video and audio from single file
        if unified_data.get('analysis'):
            analysis_json.update({
                'blackscreen': unified_data['analysis'].get('blackscreen', False),
                'freeze': unified_data['analysis'].get('freeze', False)
            })

        if unified_data.get('audio_analysis'):
            has_audio = unified_data['audio_analysis'].get('has_audio', True)
            analysis_json['audio_loss'] = not has_audio
```

## 🧪 Testing & Verification Plan

### Pre-Migration Verification

1. **Backup Current System**

   ```bash
   # Backup existing analysis files
   tar -czf analysis_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
     /var/www/html/stream/*/captures/*.json
   ```

2. **Test Unified Script in Isolation**

   ```bash
   # Test new analyze_capture.py with existing image
   python analyze_capture.py /var/www/html/stream/capture1/captures/capture_20250101120000.jpg test-host

   # Verify output contains both analysis and audio_analysis
   cat /var/www/html/stream/capture1/captures/capture_20250101120000.json | jq '.analysis, .audio_analysis'
   ```

### Migration Verification Steps

#### Step 1: Core Analysis Verification

```bash
# 1. Verify unified script runs without errors
python scripts/analyze_capture.py /path/to/test/image.jpg test-host

# 2. Verify JSON structure
cat output.json | jq '{
  analysis: .analysis,
  audio_analysis: .audio_analysis,
  timestamp: .timestamp
}'

# 3. Verify no separate _audio.json files are created
ls -la /var/www/html/stream/capture*/captures/ | grep _audio.json
# Should return empty
```

#### Step 2: Capture Monitor Verification

```bash
# 1. Start capture monitor
python scripts/capture_monitor.py

# 2. Verify unified worker is running (check logs)
tail -f /tmp/capture_monitor.log | grep "unified_worker"

# 3. Verify 3-second interval
# Check timestamps in JSON files - should be ~3 seconds apart
```

#### Step 3: Queue System Verification

```bash
# 1. Verify queue files use unified format
ls -la /tmp/alert_queue/ | grep alert_unified_

# 2. Verify queue processor handles unified format
python scripts/alert_processor.py
# Check logs for successful processing
```

#### Step 4: Alert Processing Verification

```bash
# 1. Trigger test incidents
# Create blackscreen condition and verify alert creation

# 2. Check database for alerts
# Verify alerts are created with unified metadata

# 3. Verify alert resolution works
# Remove incident condition and verify alert resolution
```

#### Step 5: Frontend Verification

```bash
# 1. Open monitoring dashboard
# Verify both video and audio data display correctly

# 2. Open heatmap dashboard
# Verify heatmap shows both video and audio incidents

# 3. Check browser console for errors
# Should be no 404 errors for _audio.json files
```

### Post-Migration Health Checks

#### Automated Health Check Script

```bash
#!/bin/bash
# health_check.sh

echo "=== Alert System Health Check ==="

# 1. Check for unified analysis files
echo "Checking for unified analysis files..."
find /var/www/html/stream/*/captures/ -name "*.json" -not -name "*_audio.json" -mmin -5 | wc -l

# 2. Check for orphaned audio files (should be 0)
echo "Checking for orphaned audio files..."
find /var/www/html/stream/*/captures/ -name "*_audio.json" -mmin -5 | wc -l

# 3. Check queue processing
echo "Checking queue processing..."
ls /tmp/alert_queue/alert_unified_*.json | wc -l

# 4. Check active alerts
echo "Checking active alerts..."
curl -s http://localhost:5000/server/alerts/getActiveAlerts | jq '.count'

# 5. Check capture monitor process
echo "Checking capture monitor..."
pgrep -f capture_monitor.py

echo "Health check complete."
```

#### Performance Verification

```bash
# Monitor system resources during migration
htop
iostat 1
netstat -i

# Check analysis timing
tail -f /var/log/analysis.log | grep "Analysis complete" | while read line; do
  echo "$(date): $line"
done
```

## 🚨 Rollback Plan

### Immediate Rollback (if migration fails)

```bash
#!/bin/bash
# rollback.sh

echo "=== EMERGENCY ROLLBACK ==="

# 1. Stop new system
pkill -f capture_monitor.py
pkill -f alert_processor.py

# 2. Restore backup files
tar -xzf analysis_backup_*.tar.gz -C /

# 3. Restart old system with old scripts
# (Requires keeping old scripts in backup location)

# 4. Clear failed queue entries
rm -f /tmp/alert_queue/alert_unified_*.json

echo "Rollback complete. Verify system functionality."
```

### Data Recovery

```bash
# If unified files exist but need to extract separate audio data
for file in /var/www/html/stream/*/captures/*.json; do
  if jq -e '.audio_analysis' "$file" > /dev/null; then
    # Extract audio data to separate file
    jq '.audio_analysis' "$file" > "${file%%.json}_audio.json"
  fi
done
```

## 📋 Migration Checklist

### Pre-Migration (Day -1)

- [ ] **Backup all analysis JSON files**
- [ ] **Test unified script on sample data**
- [ ] **Verify all team members are available**
- [ ] **Prepare rollback scripts**
- [ ] **Schedule maintenance window**

### Migration Day (Day 0)

- [ ] **Stop capture monitor service**
- [ ] **Stop alert processor service**
- [ ] **Deploy unified analysis script**
- [ ] **Update capture monitor**
- [ ] **Update queue system**
- [ ] **Update alert manager**
- [ ] **Deploy frontend changes**
- [ ] **Start services**
- [ ] **Run health checks**

### Post-Migration (Day +1)

- [ ] **Monitor system for 24 hours**
- [ ] **Verify alert generation/resolution**
- [ ] **Check frontend dashboards**
- [ ] **Run performance tests**
- [ ] **Clean up old files (after verification)**

## ⏱️ Estimated Timeline

| Phase            | Duration  | Dependencies          |
| ---------------- | --------- | --------------------- |
| **Development**  | 2-3 days  | All code changes      |
| **Testing**      | 1 day     | Development complete  |
| **Migration**    | 4-6 hours | Maintenance window    |
| **Verification** | 1 day     | Migration complete    |
| **Cleanup**      | 1 day     | Verification complete |

**Total: 5-6 days**

## 🎯 Success Criteria

### Technical Success

- [ ] No separate `_audio.json` files generated
- [ ] All analysis runs every 3 seconds (aligned)
- [ ] Single JSON contains both `analysis` and `audio_analysis`
- [ ] Alerts trigger correctly for all incident types
- [ ] Frontend displays both video and audio data
- [ ] No 404 errors in browser console
- [ ] Queue processing works with unified format

### Business Success

- [ ] No data loss during migration
- [ ] Alert response time maintained or improved
- [ ] Monitoring dashboard fully functional
- [ ] Heatmap system shows complete data
- [ ] System performance maintained or improved

## 🚨 Abort Criteria

**Abort migration if:**

- Alert generation stops working
- Frontend dashboards show errors
- System performance degrades significantly
- Data corruption detected
- More than 2 critical issues discovered

**Migration is considered FAILED if rollback is required.**

---

**⚠️ This is a high-risk, high-impact migration. Proceed only with full team coordination and adequate testing.**
