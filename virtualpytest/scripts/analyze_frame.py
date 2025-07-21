#!/usr/bin/env python3
"""
AI Frame Analysis Script for HDMI Capture Monitoring
Analyzes captured frames and generates JSON metadata
Usage: analyze_frame.py /path/to/capture_YYYYMMDDHHMMSS.jpg
"""

import sys
import os
import json
import cv2
import numpy as np
import re
from datetime import datetime
import time
import hashlib
import pickle
import fcntl

# Optional import for text extraction
try:
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("OCR library not available. Install with: pip install pytesseract", file=sys.stderr)

# Simplified sampling patterns for performance optimization
SAMPLING_PATTERNS = {
    "freeze_sample_rate": 10,     # Every 10th pixel for freeze detection
    "blackscreen_samples": 1000,  # 1000 random pixels for blackscreen
    "error_grid_rate": 15,        # Every 15th pixel in grid for errors
    "subtitle_edge_threshold": 200  # Edge detection threshold
}

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
            # Acquire shared lock for reading
            fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            cache = pickle.load(f)
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            return cache
    except (EOFError, pickle.PickleError, OSError) as e:
        print(f"Warning: Could not load frame cache: {e}")
        return {}

def save_frame_cache(cache_file_path, cache_data):
    """Save frame cache to file with file locking"""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(cache_file_path), exist_ok=True)
        
        with open(cache_file_path, 'wb') as f:
            # Acquire exclusive lock for writing
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            pickle.dump(cache_data, f)
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    except (OSError, pickle.PickleError) as e:
        print(f"Warning: Could not save frame cache: {e}")

def get_cached_frame_data(cache, filename):
    """Get frame data from cache if available"""
    for key in ['frame1', 'frame2']:
        if key in cache and cache[key]['filename'] == filename:
            return cache[key]['data']
    return None

def analyze_blackscreen(image_path, threshold=10):
    """Detect if image is mostly black (blackscreen) - Simple and reliable"""
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return False
        
        # Simple approach: count how many pixels are very dark (0-10)
        very_dark_pixels = np.sum(img <= threshold)
        total_pixels = img.shape[0] * img.shape[1]
        dark_percentage = (very_dark_pixels / total_pixels) * 100
        
        # If more than 95% of pixels are very dark (0-10), it's a blackscreen
        is_blackscreen = dark_percentage > 95
        
        print(f"Blackscreen check: {dark_percentage:.1f}% pixels <= {threshold} (threshold: 95%)")
        if is_blackscreen:
            print(f"  -> BLACKSCREEN detected")
        else:
            print(f"  -> Normal content")
        
        return is_blackscreen
        
    except Exception as e:
        print(f"Error analyzing blackscreen: {e}", file=sys.stderr)
        return False

def analyze_freeze(image_path, previous_frames_cache=None):
    """Detect if image is frozen (identical to previous frames) - Check last 3 frames with caching"""
    try:
        # Get cache file path
        cache_file_path = get_cache_file_path(image_path)
        
        # Load existing cache
        cache = load_frame_cache(cache_file_path)
        
        # Load current image
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            print(f"Error: Could not load image for freeze analysis: {image_path}", file=sys.stderr)
            return False
        
        # Extract timestamp from current filename
        current_match = re.search(r'capture_(\d{14})(?:_thumbnail)?\.jpg', image_path)
        if not current_match:
            print(f"Could not extract timestamp from filename: {image_path}", file=sys.stderr)
            return False
        
        current_timestamp = current_match.group(1)
        current_filename = os.path.basename(image_path)
        
        # Look for previous capture files in the same directory
        directory = os.path.dirname(image_path)
        
        # Determine if we're analyzing thumbnails or full images
        is_thumbnail = '_thumbnail' in current_filename
        
        try:
            # Get all files of the same type (thumbnail or full) and sort them
            if is_thumbnail:
                file_pattern = lambda f: f.startswith('capture_') and f.endswith('_thumbnail.jpg')
            else:
                file_pattern = lambda f: f.startswith('capture_') and f.endswith('.jpg') and '_thumbnail' not in f
            
            all_files = sorted([f for f in os.listdir(directory) if file_pattern(f)])
            
            if current_filename not in all_files:
                print(f"Current file not found in directory listing: {current_filename}")
                return False
            
            current_index = all_files.index(current_filename)
            
            # Need at least 2 previous files to compare (total of 3 frames)
            if current_index < 2:
                print(f"Not enough previous frames to compare (need 3 total, have {current_index + 1})")
                # Save current frame to cache for future use
                new_cache = {
                    'frame2': {'filename': current_filename, 'data': img, 'timestamp': current_timestamp},
                    'last_updated': current_timestamp
                }
                save_frame_cache(cache_file_path, new_cache)
                return False
            
            # Get the 2 previous frames
            prev1_filename = all_files[current_index - 1]  # Most recent previous
            prev2_filename = all_files[current_index - 2]  # Second most recent previous
            
            # Try to load from cache first, then from disk
            prev1_img = get_cached_frame_data(cache, prev1_filename)
            if prev1_img is None:
                prev1_path = os.path.join(directory, prev1_filename)
                prev1_img = cv2.imread(prev1_path, cv2.IMREAD_GRAYSCALE)
                print(f"Loaded {prev1_filename} from disk")
            else:
                print(f"Used {prev1_filename} from cache")
            
            prev2_img = get_cached_frame_data(cache, prev2_filename)
            if prev2_img is None:
                prev2_path = os.path.join(directory, prev2_filename)
                prev2_img = cv2.imread(prev2_path, cv2.IMREAD_GRAYSCALE)
                print(f"Loaded {prev2_filename} from disk")
            else:
                print(f"Used {prev2_filename} from cache")
            
            if prev1_img is None or prev2_img is None:
                print(f"Could not load previous images: {prev1_filename}, {prev2_filename}")
                return False
            
            # Check if all images have same dimensions
            if img.shape != prev1_img.shape or img.shape != prev2_img.shape:
                print(f"Image dimensions don't match: {img.shape} vs {prev1_img.shape} vs {prev2_img.shape}")
                return False
            
            # Optimized sampling for pixel difference (every 10th pixel for performance)
            sample_rate = SAMPLING_PATTERNS["freeze_sample_rate"]
            img_sampled = img[::sample_rate, ::sample_rate]
            prev1_sampled = prev1_img[::sample_rate, ::sample_rate]
            prev2_sampled = prev2_img[::sample_rate, ::sample_rate]
            
            # Calculate differences between all 3 frames
            diff_current_prev1 = cv2.absdiff(img_sampled, prev1_sampled)
            diff_current_prev2 = cv2.absdiff(img_sampled, prev2_sampled)
            diff_prev1_prev2 = cv2.absdiff(prev1_sampled, prev2_sampled)
            
            mean_diff_1 = np.mean(diff_current_prev1)
            mean_diff_2 = np.mean(diff_current_prev2)
            mean_diff_3 = np.mean(diff_prev1_prev2)
            
            print(f"Comparing {current_filename} with last 2 frames:")
            print(f"  vs {prev1_filename}: diff={mean_diff_1:.2f}")
            print(f"  vs {prev2_filename}: diff={mean_diff_2:.2f}")
            print(f"  {prev1_filename} vs {prev2_filename}: diff={mean_diff_3:.2f}")
            
            # Frames are considered frozen if ALL 3 comparisons show very small differences
            freeze_threshold = 1.0
            is_frozen = (mean_diff_1 < freeze_threshold and 
                        mean_diff_2 < freeze_threshold and 
                        mean_diff_3 < freeze_threshold)
            
            if is_frozen:
                print(f"FREEZE DETECTED: All 3 frames are nearly identical (threshold={freeze_threshold})")
            else:
                print(f"No freeze: At least one frame pair shows significant difference (threshold={freeze_threshold})")
            
            # Update cache with the 2 most recent frames for next execution
            # Extract timestamps for proper ordering
            prev1_match = re.search(r'capture_(\d{14})(?:_thumbnail)?\.jpg', prev1_filename)
            prev1_timestamp = prev1_match.group(1) if prev1_match else 'unknown'
            
            new_cache = {
                'frame1': {'filename': prev1_filename, 'data': prev1_img, 'timestamp': prev1_timestamp},
                'frame2': {'filename': current_filename, 'data': img, 'timestamp': current_timestamp},
                'last_updated': current_timestamp
            }
            save_frame_cache(cache_file_path, new_cache)
            print(f"Updated cache with {prev1_filename} and {current_filename}")
            
            return is_frozen
            
        except Exception as e:
            print(f"Could not compare with previous frames: {e}")
            return False
        
    except Exception as e:
        print(f"Error analyzing freeze: {e}", file=sys.stderr)
        return False

def analyze_errors_only(image_path):
    """Detect error messages without subtitle dependency - Optimized with region processing and sampling"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return False
        
        # More restrictive error detection - only look for real error messages
        # Errors should be prominent red text/backgrounds, not just any red content
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Use configurable grid sampling rate
        grid_rate = SAMPLING_PATTERNS["error_grid_rate"]
        sampled_hsv = hsv[::grid_rate, ::grid_rate]
        
        # Red color range in HSV - more restrictive for actual error messages
        lower_red1 = np.array([0, 100, 100])  # Higher saturation and value for prominent reds
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 100, 100])  # Higher saturation and value for prominent reds
        upper_red2 = np.array([180, 255, 255])
        
        mask1 = cv2.inRange(sampled_hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(sampled_hsv, lower_red2, upper_red2)
        red_mask = mask1 + mask2
        
        red_pixels = np.sum(red_mask > 0)
        total_sampled_pixels = sampled_hsv.shape[0] * sampled_hsv.shape[1]
        red_percentage = (red_pixels / total_sampled_pixels) * 100
        
        # Much higher threshold - only flag as error if there's significant prominent red content
        # This should catch error pages (404, connection errors) but not normal red UI elements
        has_errors = red_percentage > 8.0  # Increased from 2% to 8% for more prominent red content
        
        print(f"Error detection: {red_percentage:.1f}% red pixels in {total_sampled_pixels} sampled pixels (threshold: 8.0%)")
        
        return has_errors
    except Exception as e:
        print(f"Error analyzing errors: {e}", file=sys.stderr)
        return False

# Keep subtitle functions available for on-demand use but don't call them automatically
def analyze_subtitles_across_frames(frame_list):
    """Analyze subtitle detection across multiple frames - AVAILABLE FOR ON-DEMAND USE"""
    subtitle_results = []
    
    for filename, image_path in frame_list:
        if image_path and os.path.exists(image_path):
            # Analyze this frame for subtitles
            subtitles, _ = analyze_subtitles_and_errors(image_path)
            subtitle_results.append(subtitles)
            print(f"  {filename}: subtitles={'Yes' if subtitles else 'No'}")
        else:
            # Use cached analysis if available
            subtitle_results.append(False)  # Default to no subtitles if we can't analyze
            print(f"  {filename}: subtitles=Unknown (cached)")
    
    # Count subtitle detections in last 3 frames
    subtitle_count = sum(subtitle_results)
    
    return {
        'current_frame': subtitle_results[0] if subtitle_results else False,
        'last_3_frames': subtitle_results,
        'subtitle_count_in_3': subtitle_count,
        'no_subtitles_for_3_frames': subtitle_count == 0 and len(subtitle_results) == 3
    }

def analyze_subtitles_and_errors(image_path):
    """Detect subtitles and error messages - AVAILABLE FOR ON-DEMAND USE"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return False, False
        
        height, width = img.shape[:2]
        
        # Phase 4: Enhanced subtitle detection with adaptive region processing
        subtitle_height_start = int(height * 0.8)
        subtitle_width_start = int(width * 0.2)  # Skip left 20%
        subtitle_width_end = int(width * 0.8)    # Skip right 20%
        
        subtitle_region = img[subtitle_height_start:, subtitle_width_start:subtitle_width_end]
        gray_subtitle = cv2.cvtColor(subtitle_region, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding before edge detection for better text extraction
        adaptive_thresh = cv2.adaptiveThreshold(gray_subtitle, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                              cv2.THRESH_BINARY, 11, 2)
        edges = cv2.Canny(adaptive_thresh, 50, 150)
        subtitle_edges = np.sum(edges > 0)
        
        # Dynamic threshold based on region size
        region_pixels = subtitle_region.shape[0] * subtitle_region.shape[1]
        adaptive_threshold = max(SAMPLING_PATTERNS["subtitle_edge_threshold"], region_pixels * 0.002)
        has_subtitles = subtitle_edges > adaptive_threshold
        
        print(f"Subtitle detection: {subtitle_edges} edge pixels in region {subtitle_region.shape} (threshold: {adaptive_threshold:.0f})")
        
        # More restrictive error detection - only look for real error messages
        # Errors should be prominent red text/backgrounds, not just any red content
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Use configurable grid sampling rate
        grid_rate = SAMPLING_PATTERNS["error_grid_rate"]
        sampled_hsv = hsv[::grid_rate, ::grid_rate]
        
        # Red color range in HSV - more restrictive for actual error messages
        lower_red1 = np.array([0, 100, 100])  # Higher saturation and value for prominent reds
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 100, 100])  # Higher saturation and value for prominent reds
        upper_red2 = np.array([180, 255, 255])
        
        mask1 = cv2.inRange(sampled_hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(sampled_hsv, lower_red2, upper_red2)
        red_mask = mask1 + mask2
        
        red_pixels = np.sum(red_mask > 0)
        total_sampled_pixels = sampled_hsv.shape[0] * sampled_hsv.shape[1]
        red_percentage = (red_pixels / total_sampled_pixels) * 100
        
        # Much higher threshold - only flag as error if there's significant prominent red content
        # This should catch error pages (404, connection errors) but not normal red UI elements
        has_errors = red_percentage > 8.0  # Increased from 2% to 8% for more prominent red content
        
        print(f"Error detection: {red_percentage:.1f}% red pixels in {total_sampled_pixels} sampled pixels (threshold: 8.0%)")
        
        return has_subtitles, has_errors
    except Exception as e:
        print(f"Error analyzing subtitles/errors: {e}", file=sys.stderr)
        return False, False

def extract_text(has_subtitles, image_path=None):
    """Extract text from subtitle region using OCR - AVAILABLE FOR ON-DEMAND USE"""
    if not has_subtitles:
        return ''
    
    if not OCR_AVAILABLE or not image_path:
        print("Text extraction: OCR not available or no image path")
        return ''
    
    try:
        # Load image for OCR
        img = cv2.imread(image_path)
        if img is None:
            print("Text extraction: Could not load image")
            return ''
        
        height, width = img.shape[:2]
        
        # Extract subtitle region (bottom 20% of image)
        subtitle_region = img[int(height * 0.8):, :]
        
        # Convert to grayscale for better OCR
        gray_subtitle = cv2.cvtColor(subtitle_region, cv2.COLOR_BGR2GRAY)
        
        # Enhance contrast for better text recognition
        enhanced = cv2.convertScaleAbs(gray_subtitle, alpha=2.0, beta=0)
        
        # Apply threshold to get better text
        _, thresh = cv2.threshold(enhanced, 127, 255, cv2.THRESH_BINARY)
        
        # Extract text using OCR
        text = pytesseract.image_to_string(thresh, config='--psm 6')
        text = text.strip()
        
        print(f"Text extraction: OCR extracted text: '{text[:50]}...' (length: {len(text)})")
        
        # Basic text validation
        if len(text) < 3:
            print("Text extraction: Text too short (< 3 chars)")
            return ''
        
        # Check for garbled text - if less than 70% of characters are printable, likely OCR noise
        valid_chars = sum(1 for c in text if c.isprintable() and not c.iscntrl())
        if len(text) > 0 and valid_chars / len(text) < 0.7:
            print(f"Text extraction: Text appears garbled ({valid_chars}/{len(text)} valid chars)")
            return ''
        
        print(f"Text extraction: Extracted '{text}'")
        return text
        
    except Exception as e:
        print(f"Text extraction failed: {e}", file=sys.stderr)
        return ''

def main():
    if len(sys.argv) < 2:
        print("Usage: analyze_frame.py /path/to/capture_file.jpg [host_name]", file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    host_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}", file=sys.stderr)
        sys.exit(1)
    
    if not image_path.endswith('.jpg'):
        print(f"Error: Only .jpg files supported: {image_path}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Analyzing frame: {os.path.basename(image_path)}")
    
    try:
        # Use existing thumbnail created by rename_captures.sh
        if '_thumbnail' in image_path:
            # We're already analyzing a thumbnail, use it directly
            analysis_image = image_path
            thumbnail_path = image_path  # Set thumbnail path to current file
            print(f"Already analyzing thumbnail: {os.path.basename(image_path)}")
        else:
            # We're analyzing original image, look for thumbnail
            thumbnail_path = image_path.replace('.jpg', '_thumbnail.jpg')
            
            # Wait for thumbnail to be created (up to 1 seconds)
            wait_count = 0
            while not os.path.exists(thumbnail_path) and wait_count < 10:
                time.sleep(0.1)  # Wait 100ms
                wait_count += 1
            
            # Use thumbnail if available, otherwise use original image
            analysis_image = thumbnail_path if os.path.exists(thumbnail_path) else image_path
            
            if analysis_image == thumbnail_path:
                print(f"Using existing thumbnail: {os.path.basename(thumbnail_path)}")
            else:
                print(f"Thumbnail not found, using original image: {os.path.basename(image_path)}")
        
        # Load original image for size info
        img = cv2.imread(image_path)
        if img is None:
            raise Exception("Could not load original image")
        
        # LIGHTENED ANALYSIS - Only run essential detection
        print("=== LIGHTENED ANALYSIS MODE ===")
        print("Running: blackscreen, freeze, errors")
        print("Note: Subtitles and text extraction available via backend API")
        
        # Run core analysis on thumbnail (or original if thumbnail not available)
        blackscreen = analyze_blackscreen(analysis_image)
        frozen = analyze_freeze(analysis_image)
        potential_errors = analyze_errors_only(analysis_image)
        
        # Only flag errors if there's also a freeze - this makes error detection much more restrictive
        # Real errors (404, no internet, etc.) usually cause the screen to freeze on an error page
        errors = potential_errors and frozen
        
        if potential_errors and not frozen:
            print(f"Error detection: Red content detected but no freeze - ignoring (likely normal UI elements)")
        elif errors:
            print(f"Error detection: Red content detected WITH freeze - flagging as error")
        
        # Create analysis result - simplified without subtitle/text data
        analysis_result = {
            'timestamp': datetime.now().isoformat(),
            'filename': os.path.basename(image_path),
            'thumbnail': os.path.basename(thumbnail_path) if os.path.exists(thumbnail_path) else None,
            'analysis': {
                'blackscreen': bool(blackscreen),
                'freeze': bool(frozen),
                'errors': bool(errors)
            },
            'processing_info': {
                'analyzed_at': datetime.now().isoformat(),
                'image_size': f"{img.shape[1]}x{img.shape[0]}",
                'analyzed_image': os.path.basename(analysis_image),
                'analysis_mode': 'lightened'  # Indicate this is lightened analysis
            }
        }
        
        # Save JSON metadata in same folder as image
        base_filename = os.path.basename(image_path)
        json_filename = base_filename.replace('.jpg', '.json')
        image_dir = os.path.dirname(image_path)
        json_path = os.path.join(image_dir, json_filename)
        
        with open(json_path, 'w') as f:
            json.dump(analysis_result, f, indent=2)
        
        print(f"Analysis complete: {json_filename}")
        print(f"Results: blackscreen={blackscreen}, freeze={frozen}, errors={errors}")
        
        # Call alert manager only if host_name is provided
        if host_name:
            try:
                sys.path.append(os.path.dirname(__file__))
                from alert_manager import check_and_update_alerts
                
                check_and_update_alerts(
                    analysis_result=analysis_result,
                    host_name=host_name,
                    analysis_path=image_path
                )
                print(f"Alert check completed for host: {host_name}")
            except ImportError as e:
                print(f"Warning: Could not import alert_manager: {e}")
            except Exception as e:
                print(f"Warning: Alert processing failed: {e}")
        else:
            print("Note: Host name not provided, skipping alert processing")
        
    except Exception as e:
        print(f"Analysis failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
