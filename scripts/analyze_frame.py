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
from datetime import datetime
import time

def analyze_blackscreen(image_path, threshold=15):
    """Detect if image is mostly black (blackscreen)"""
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return False
        
        mean_intensity = np.mean(img)
        return mean_intensity < threshold
    except Exception as e:
        print(f"Error analyzing blackscreen: {e}", file=sys.stderr)
        return False

def analyze_freeze(image_path, previous_frames_cache=None):
    """Detect if image is frozen (similar to previous frame)"""
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return False
        
        # Calculate histogram for comparison
        hist = cv2.calcHist([img], [0], None, [256], [0, 256])
        
        # For simplicity, check if image has very low variance (static content)
        variance = np.var(img)
        return variance < 100  # Threshold for "frozen" content
    except Exception as e:
        print(f"Error analyzing freeze: {e}", file=sys.stderr)
        return False

def analyze_subtitles_and_errors(image_path):
    """Detect subtitles and error messages using edge detection and color analysis"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return False, False
        
        height, width = img.shape[:2]
        
        # Check bottom 20% for subtitles (edge detection)
        subtitle_region = img[int(height * 0.8):, :]
        gray_subtitle = cv2.cvtColor(subtitle_region, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray_subtitle, 50, 150)
        subtitle_edges = np.sum(edges > 0)
        has_subtitles = subtitle_edges > 500  # Threshold for text detection
        
        # Check for red error regions (color analysis)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        # Red color range in HSV
        lower_red1 = np.array([0, 50, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 50, 50])
        upper_red2 = np.array([180, 255, 255])
        
        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = mask1 + mask2
        
        red_pixels = np.sum(red_mask > 0)
        total_pixels = width * height
        red_percentage = (red_pixels / total_pixels) * 100
        has_errors = red_percentage > 2.0  # More than 2% red pixels
        
        return has_subtitles, has_errors
    except Exception as e:
        print(f"Error analyzing subtitles/errors: {e}", file=sys.stderr)
        return False, False

def detect_language(has_subtitles):
    """Simple language detection (placeholder)"""
    if not has_subtitles:
        return 'unknown'
    
    # For now, return 'detected' - could be enhanced with OCR
    return 'detected'

def main():
    if len(sys.argv) != 2:
        print("Usage: analyze_frame.py /path/to/capture_file.jpg", file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}", file=sys.stderr)
        sys.exit(1)
    
    if not image_path.endswith('.jpg'):
        print(f"Error: Only .jpg files supported: {image_path}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Analyzing frame: {os.path.basename(image_path)}")
    
    try:
        # Use existing thumbnail created by rename_captures.sh
        thumbnail_path = image_path.replace('.jpg', '_thumbnail.jpg')
        
        # Wait for thumbnail to be created (up to 2 seconds)
        wait_count = 0
        while not os.path.exists(thumbnail_path) and wait_count < 20:
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
        
        # Run analysis on thumbnail (or original if thumbnail not available)
        blackscreen = analyze_blackscreen(analysis_image)
        freeze = analyze_freeze(analysis_image)
        subtitles, errors = analyze_subtitles_and_errors(analysis_image)
        language = detect_language(subtitles)
        
        # Calculate confidence
        confidence = 0.9 if (blackscreen or freeze or subtitles or errors) else 0.1
        
        # Create analysis result
        analysis_result = {
            'timestamp': datetime.now().isoformat(),
            'filename': os.path.basename(image_path),
            'thumbnail': os.path.basename(thumbnail_path) if os.path.exists(thumbnail_path) else None,
            'analysis': {
                'blackscreen': blackscreen,
                'freeze': freeze,
                'subtitles': subtitles,
                'errors': errors,
                'language': language,
                'confidence': confidence
            },
            'processing_info': {
                'analyzed_at': datetime.now().isoformat(),
                'image_size': f"{img.shape[1]}x{img.shape[0]}",
                'analyzed_image': os.path.basename(analysis_image)
            }
        }
        
        # Save JSON metadata
        json_path = image_path.replace('.jpg', '.json')
        with open(json_path, 'w') as f:
            json.dump(analysis_result, f, indent=2)
        
        print(f"Analysis complete: {os.path.basename(json_path)}")
        print(f"Results: blackscreen={blackscreen}, freeze={freeze}, subtitles={subtitles}, errors={errors}")
        
    except Exception as e:
        print(f"Analysis failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
