#!/usr/bin/env python3
"""
Unified Capture Analysis Script for HDMI Capture Monitoring
Analyzes both video frames and audio segments in a single pass
Usage: analyze_capture.py /path/to/capture_YYYYMMDDHHMMSS.jpg [host_name]
"""

import os
import sys
import json
import cv2
import numpy as np
import re
import subprocess
import glob
import time
import hashlib
import pickle
import fcntl
import logging
from datetime import datetime

# Setup logging to /tmp/analysis.log
log_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# File handler
file_handler = logging.FileHandler('/tmp/analysis.log')
file_handler.setFormatter(log_formatter)
logger.addHandler(file_handler)

# Console handler (for backward compatibility)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(log_formatter)
logger.addHandler(console_handler)

# Optional import for text extraction
try:
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# Simplified sampling patterns for performance optimization
SAMPLING_PATTERNS = {
    "freeze_sample_rate": 10,     # Every 10th pixel for freeze detection
    "blackscreen_samples": 1000,  # 1000 random pixels for blackscreen
    "error_grid_rate": 15,        # Every 15th pixel in grid for errors
    "subtitle_edge_threshold": 200  # Edge detection threshold
}

def get_capture_directory_from_image(image_path):
    """Get capture directory from image path"""
    # Image is in /var/www/html/stream/capture1/captures/capture_*.jpg
    # Audio segments are in /var/www/html/stream/capture1/segment_*.ts
    captures_dir = os.path.dirname(image_path)  # .../captures/
    return os.path.dirname(captures_dir)  # .../capture1/

def find_latest_audio_segment(capture_dir):
    """Find the most recent HLS segment file"""
    try:
        pattern = os.path.join(capture_dir, "segment_*.ts")
        segments = glob.glob(pattern)
        if not segments:
            return None
        
        # Sort by modification time, get newest
        latest = max(segments, key=os.path.getmtime)
        
        # Check if recent (within last 5 minutes)
        latest_mtime = os.path.getmtime(latest)
        current_time = time.time()
        age_seconds = current_time - latest_mtime
        max_age_seconds = 300  # 5 minutes
        
        if age_seconds > max_age_seconds:
            return None
        return latest
    except Exception:
        return None

def analyze_audio_volume(segment_path):
    """Analyze audio volume using FFmpeg volumedetect"""
    try:
        cmd = ['/usr/bin/ffmpeg', '-i', segment_path, '-af', 'volumedetect', '-vn', '-f', 'null', '/dev/null']
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        # Parse mean_volume from stderr
        mean_volume = -100.0
        for line in result.stderr.split('\n'):
            if 'mean_volume:' in line:
                match = re.search(r'mean_volume:\s*([-\d.]+)\s*dB', line)
                if match:
                    mean_volume = float(match.group(1))
                    break
        
        # Convert dB to 0-100% scale: -60dB = 0%, 0dB = 100%
        volume_percentage = max(0, min(100, (mean_volume + 60) * 100 / 60))
        has_audio = volume_percentage > 5  # 5% threshold
        
        return has_audio, int(volume_percentage), mean_volume
    except Exception:
        return False, 0, -100.0

def get_cache_file_path(image_path):
    """Generate cache file path in the same directory as the image"""
    image_dir = os.path.dirname(image_path)
    return os.path.join(image_dir, 'frame_cache.pkl')

def load_frame_cache(cache_file_path):
    """Load frame cache from file with file locking"""
    if not os.path.exists(cache_file_path):
        return {}
    try:
        with open(cache_file_path, 'rb') as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            cache = pickle.load(f)
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            return cache
    except (EOFError, pickle.PickleError, OSError):
        return {}

def save_frame_cache(cache_file_path, cache_data):
    """Save frame cache to file with file locking"""
    try:
        os.makedirs(os.path.dirname(cache_file_path), exist_ok=True)
        with open(cache_file_path, 'wb') as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            pickle.dump(cache_data, f)
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    except (OSError, pickle.PickleError):
        pass

def get_cached_frame_data(cache, filename):
    """Get frame data from cache if available"""
    for key in ['frame1', 'frame2']:
        if key in cache and cache[key]['filename'] == filename:
            return cache[key]['data']
    return None

def analyze_blackscreen(image_path, threshold=10):
    """Detect if image is mostly black (blackscreen)"""
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return False
        
        # Count pixels <= threshold
        very_dark_pixels = np.sum(img <= threshold)
        total_pixels = img.shape[0] * img.shape[1]
        dark_percentage = (very_dark_pixels / total_pixels) * 100
        
        # If >95% of pixels are very dark, it's blackscreen
        is_blackscreen = dark_percentage > 95
        logger.info(f"Blackscreen check: {dark_percentage:.1f}% pixels <= {threshold} ({'BLACKSCREEN' if is_blackscreen else 'Normal'})")
        return is_blackscreen
    except Exception:
        return False

def analyze_freeze(image_path, previous_frames_cache=None):
    """Detect if image is frozen (identical to previous frames)"""
    try:
        cache_file_path = get_cache_file_path(image_path)
        cache = load_frame_cache(cache_file_path)
        
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return False, None
        
        # Extract timestamp from filename
        current_match = re.search(r'capture_(\d{14})(?:_thumbnail)?\.jpg', image_path)
        if not current_match:
            return False, None
        
        current_timestamp = current_match.group(1)
        current_filename = os.path.basename(image_path)
        directory = os.path.dirname(image_path)
        is_thumbnail = '_thumbnail' in current_filename
        
        # Get all files of same type and sort
        if is_thumbnail:
            file_pattern = lambda f: f.startswith('capture_') and f.endswith('_thumbnail.jpg')
        else:
            file_pattern = lambda f: f.startswith('capture_') and f.endswith('.jpg') and '_thumbnail' not in f
        
        all_files = sorted([f for f in os.listdir(directory) if file_pattern(f)])
        
        if current_filename not in all_files:
            return False, None
        
        current_index = all_files.index(current_filename)
        
        # Need at least 2 previous files (total of 3 frames)
        if current_index < 2:
            # Save current frame to cache
            new_cache = {
                'frame2': {'filename': current_filename, 'data': img, 'timestamp': current_timestamp},
                'last_updated': current_timestamp
            }
            save_frame_cache(cache_file_path, new_cache)
            return False, None
        
        # Get 2 previous frames
        prev1_filename = all_files[current_index - 1]
        prev2_filename = all_files[current_index - 2]
        
        # Load from cache or disk
        prev1_img = get_cached_frame_data(cache, prev1_filename)
        if prev1_img is None:
            prev1_path = os.path.join(directory, prev1_filename)
            prev1_img = cv2.imread(prev1_path, cv2.IMREAD_GRAYSCALE)
        
        prev2_img = get_cached_frame_data(cache, prev2_filename)
        if prev2_img is None:
            prev2_path = os.path.join(directory, prev2_filename)
            prev2_img = cv2.imread(prev2_path, cv2.IMREAD_GRAYSCALE)
        
        if prev1_img is None or prev2_img is None:
            return False, None
        
        # Check dimensions match
        if img.shape != prev1_img.shape or img.shape != prev2_img.shape:
            return False, None
        
        # Optimized sampling for performance
        sample_rate = SAMPLING_PATTERNS["freeze_sample_rate"]
        img_sampled = img[::sample_rate, ::sample_rate]
        prev1_sampled = prev1_img[::sample_rate, ::sample_rate]
        prev2_sampled = prev2_img[::sample_rate, ::sample_rate]
        
        # Calculate all three comparisons
        diff_1vs2 = cv2.absdiff(prev2_sampled, prev1_sampled)
        diff_1vs3 = cv2.absdiff(prev2_sampled, img_sampled)
        diff_2vs3 = cv2.absdiff(prev1_sampled, img_sampled)
        
        mean_diff_1vs2 = np.mean(diff_1vs2)
        mean_diff_1vs3 = np.mean(diff_1vs3)
        mean_diff_2vs3 = np.mean(diff_2vs3)
        
        # Frozen if ALL comparisons show small differences
        freeze_threshold = 0.5
        is_frozen = (mean_diff_1vs2 < freeze_threshold and 
                    mean_diff_1vs3 < freeze_threshold and 
                    mean_diff_2vs3 < freeze_threshold)
        
        freeze_details = {
            'frames_compared': [prev2_filename, prev1_filename, current_filename],
            'frame_differences': [round(mean_diff_1vs2, 2), round(mean_diff_1vs3, 2), round(mean_diff_2vs3, 2)],
            'threshold': freeze_threshold,
            'comparison_method': 'all_pairs_comparison_thumbnail' if is_thumbnail else 'all_pairs_comparison_original',
            'freeze_detected_against': 'all' if is_frozen else None
        }
        
        # Update cache
        prev1_match = re.search(r'capture_(\d{14})(?:_thumbnail)?\.jpg', prev1_filename)
        prev1_timestamp = prev1_match.group(1) if prev1_match else 'unknown'
        
        new_cache = {
            'frame1': {'filename': prev1_filename, 'data': prev1_img, 'timestamp': prev1_timestamp},
            'frame2': {'filename': current_filename, 'data': img, 'timestamp': current_timestamp},
            'last_updated': current_timestamp
        }
        save_frame_cache(cache_file_path, new_cache)
        
        logger.info(f"Freeze check: {'FREEZE' if is_frozen else 'Normal'} (diffs: {mean_diff_1vs2:.2f}, {mean_diff_1vs3:.2f}, {mean_diff_2vs3:.2f})")
        logger.debug(f"Freeze details: {freeze_details}")
        return is_frozen, freeze_details
        
    except Exception:
        return False, None



def main():
    if len(sys.argv) < 2:
        print("Usage: analyze_capture.py /path/to/capture_file.jpg [host_name] [device_id] [incident_state_json]", file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    host_name = sys.argv[2] if len(sys.argv) > 2 else None
    device_id = sys.argv[3] if len(sys.argv) > 3 else None
    incident_state_json = sys.argv[4] if len(sys.argv) > 4 else None
    
    if not os.path.exists(image_path) or not image_path.endswith('.jpg'):
        print(f"Error: Invalid image file: {image_path}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Processing: {os.path.basename(image_path)} (unified analysis)")
    
    try:
        # Use thumbnail for analysis (fast and efficient)
        thumbnail_path = image_path.replace('.jpg', '_thumbnail.jpg')
        if not os.path.exists(thumbnail_path):
            print(f"Thumbnail not found: {os.path.basename(thumbnail_path)}")
            return
        
        print(f"Analyzing: {os.path.basename(thumbnail_path)}")
        
        # Video Analysis
        blackscreen = analyze_blackscreen(thumbnail_path)
        frozen, freeze_details = analyze_freeze(thumbnail_path)
        
        # Audio Analysis
        capture_dir = get_capture_directory_from_image(image_path)
        segment_path = find_latest_audio_segment(capture_dir)
        
        if segment_path:
            has_audio, volume_percentage, mean_volume_db = analyze_audio_volume(segment_path)
            analyzed_segment = os.path.basename(segment_path)
            logger.info(f"Audio analysis: {volume_percentage}% volume, audio={'Yes' if has_audio else 'No'}")
        else:
            has_audio, volume_percentage, mean_volume_db = False, 0, -100.0
            analyzed_segment = "no_recent_segment"
            logger.warning("Audio analysis: No recent segments found")
        
        # Result
        result = {
            'timestamp': datetime.now().isoformat(),
            'filename': os.path.basename(image_path),
            'thumbnail': os.path.basename(thumbnail_path),
            'blackscreen': bool(blackscreen),
            'freeze': bool(frozen),
            'freeze_details': freeze_details if frozen else None,
            'audio': has_audio,
            'volume_percentage': volume_percentage if has_audio else None,
            'analyzed_at': datetime.now().isoformat()
        }
        
        # Save single JSON file
        base_filename = os.path.basename(image_path)
        json_filename = base_filename.replace('.jpg', '.json')
        image_dir = os.path.dirname(image_path)
        json_path = os.path.join(image_dir, json_filename)
        
        with open(json_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        logger.info(f"Analysis complete: {json_filename}")
        logger.info(f"Results: blackscreen={blackscreen}, freeze={frozen}, audio={has_audio}")
        
        # Process alerts with memory-based incident state
        if host_name and device_id and incident_state_json:
            try:
                # Parse incident state from memory
                incident_state = json.loads(incident_state_json)
                
                sys.path.append(os.path.dirname(__file__))
                from alert_system import process_alert_with_memory_state
                
                logger.info(f"Processing alerts for host: {host_name}, device: {device_id}")
                updated_state = process_alert_with_memory_state(
                    analysis_result=result,
                    host_name=host_name,
                    device_id=device_id,  # Pass device_id directly instead of extracting from path
                    incident_state=incident_state
                )
                
                # Output updated state for capture_monitor to read
                print(f"INCIDENT_STATE:{json.dumps(updated_state)}")
                
                logger.info(f"Alert processed with memory state (host: {host_name}, device: {device_id})")
            except ImportError as e:
                logger.error(f"Could not import alert_system: {e}")
            except Exception as e:
                logger.error(f"Alert processing failed: {e}")
        elif host_name:
            logger.warning("Missing device_id or incident state, skipping alert processing")
        else:
            logger.warning("Host name not provided, skipping alert processing")
        
    except Exception as e:
        print(f"Analysis failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 