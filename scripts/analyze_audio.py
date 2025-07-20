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
    """Find the most recent HLS segment file"""
    try:
        pattern = os.path.join(capture_dir, "segment_*.ts")
        segments = glob.glob(pattern)
        if not segments:
            return None
        
        # Sort by modification time, get newest
        latest = max(segments, key=os.path.getmtime)
        return latest
    except Exception:
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
    if len(sys.argv) != 2:
        print("Usage: analyze_audio.py /path/to/capture_dir", file=sys.stderr)
        sys.exit(1)
    
    capture_dir = sys.argv[1]
    
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
    
    # Save JSON file
    json_filename = f"audio_{timestamp}.json"
    json_path = os.path.join(capture_dir, json_filename)
    
    with open(json_path, 'w') as f:
        json.dump(audio_result, f, indent=2)
    
    print(f"Audio analysis: {volume_percentage}% volume, audio={'Yes' if has_audio else 'No'}")

if __name__ == '__main__':
    main() 