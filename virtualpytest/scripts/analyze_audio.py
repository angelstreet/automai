#!/usr/bin/env python3
"""
Simple Audio Analysis Script for HDMI Capture
Analyzes latest HLS segment for audio presence and volume
Usage: analyze_audio.py /path/to/capture_dir
"""

import sys
import os
import json
import subprocess
import glob
import re
from datetime import datetime

def find_latest_segment(capture_dir):
    """Find the most recent HLS segment file (only if recent)"""
    try:
        pattern = os.path.join(capture_dir, "segment_*.ts")
        segments = glob.glob(pattern)
        if not segments:
            print("No HLS segments found in directory", file=sys.stderr)
            return None
        
        # Sort by modification time, get newest
        latest = max(segments, key=os.path.getmtime)
        
        # Check if the latest segment is recent (within last 5 minutes)
        import time
        from datetime import datetime, timedelta
        
        latest_mtime = os.path.getmtime(latest)
        current_time = time.time()
        age_seconds = current_time - latest_mtime
        
        # Only process segments that are less than 5 minutes old
        max_age_seconds = 300  # 5 minutes
        
        if age_seconds > max_age_seconds:
            segment_time = datetime.fromtimestamp(latest_mtime)
            print(f"Latest segment is too old: {os.path.basename(latest)} (age: {age_seconds:.1f}s, modified: {segment_time})", file=sys.stderr)
            print(f"Skipping audio analysis - no recent segments (threshold: {max_age_seconds}s)", file=sys.stderr)
            return None
        
        print(f"Found recent segment: {os.path.basename(latest)} (age: {age_seconds:.1f}s)")
        return latest
        
    except Exception as e:
        print(f"Error finding latest segment: {e}", file=sys.stderr)
        return None

def analyze_audio_volume(segment_path):
    """Analyze audio volume using FFmpeg volumedetect"""
    try:
        cmd = [
            '/usr/bin/ffmpeg',
            '-i', segment_path,
            '-af', 'volumedetect',
            '-vn', '-f', 'null', '/dev/null'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        # Parse mean_volume from stderr
        mean_volume = -100.0  # Default very quiet
        for line in result.stderr.split('\n'):
            if 'mean_volume:' in line:
                match = re.search(r'mean_volume:\s*([-\d.]+)\s*dB', line)
                if match:
                    mean_volume = float(match.group(1))
                    break
        
        # Convert dB to 0-100% scale
        # -60dB = 0%, 0dB = 100%
        volume_percentage = max(0, min(100, (mean_volume + 60) * 100 / 60))
        has_audio = volume_percentage > 5  # 5% threshold for audio presence
        
        return has_audio, int(volume_percentage), mean_volume
        
    except Exception as e:
        print(f"Audio analysis error: {e}", file=sys.stderr)
        return False, 0, -100.0

def main():
    if len(sys.argv) < 2:
        print("Usage: analyze_audio.py /path/to/capture_dir [host_name]", file=sys.stderr)
        sys.exit(1)
    
    capture_dir = sys.argv[1]
    host_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(capture_dir):
        print(f"Error: Directory not found: {capture_dir}", file=sys.stderr)
        sys.exit(1)
    
    # Find latest segment
    segment_path = find_latest_segment(capture_dir)
    if not segment_path:
        print("No HLS segments found, skipping audio analysis", file=sys.stderr)
        sys.exit(0)
    
    # Analyze audio
    has_audio, volume_percentage, mean_volume_db = analyze_audio_volume(segment_path)
    
    # Generate timestamp for filename
    now = datetime.now()
    timestamp = now.strftime("%Y%m%d%H%M%S")
    
    # Create JSON output
    audio_result = {
        'timestamp': now.isoformat(),
        'audio_analysis': {
            'has_audio': has_audio,
            'volume_percentage': volume_percentage,
            'mean_volume_db': round(mean_volume_db, 1),
            'analyzed_segment': os.path.basename(segment_path)
        }
    }
    
    # Save JSON file in captures subfolder (same as frame analysis)
    captures_dir = os.path.join(capture_dir, "captures")
    if not os.path.exists(captures_dir):
        captures_dir = capture_dir  # Fallback to main dir if captures doesn't exist
    
    json_filename = f"capture_{timestamp}_audio.json"
    json_path = os.path.join(captures_dir, json_filename)
    
    # Debug: Check directory permissions and path
    print(f"Attempting to save to: {json_path}")
    print(f"Captures directory exists: {os.path.exists(captures_dir)}")
    print(f"Captures directory writable: {os.access(captures_dir, os.W_OK)}")
    
    try:
        with open(json_path, 'w') as f:
            json.dump(audio_result, f, indent=2)
        print(f"Successfully created: {json_filename}")
    except Exception as e:
        print(f"Failed to create JSON file: {e}")
        # Try creating in /tmp as fallback for debugging
        fallback_path = f"/tmp/{json_filename}"
        try:
            with open(fallback_path, 'w') as f:
                json.dump(audio_result, f, indent=2)
            print(f"Created fallback file: {fallback_path}")
        except Exception as e2:
            print(f"Fallback also failed: {e2}")
    
    print(f"Audio analysis: {volume_percentage}% volume, audio={'Yes' if has_audio else 'No'}")
    
    # Queue alert processing if host_name is provided (non-blocking)
    if host_name:
        try:
            sys.path.append(os.path.dirname(__file__))
            from queue_utils import write_to_alert_queue
            
            # Write to queue for background processing - this is very fast
            queued = write_to_alert_queue(
                analysis_result=audio_result,
                host_name=host_name,
                analysis_path=capture_dir,
                analysis_type="audio"
            )
            
            if queued:
                print(f"Alert queued for background processing (host: {host_name})")
            else:
                print(f"Warning: Failed to queue alert for processing")
                
        except ImportError as e:
            print(f"Warning: Could not import queue_utils: {e}")
        except Exception as e:
            print(f"Warning: Alert queueing failed: {e}")
    else:
        print("Note: Host name not provided, skipping alert processing")

if __name__ == '__main__':
    main() 