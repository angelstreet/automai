#!/usr/bin/env python3
"""
AI Monitoring Frame Analysis Script

Analyzes captured frames for blackscreen, freeze, subtitles, and errors.
Uses thumbnail images for fast processing and creates JSON metadata files.
"""

import sys
import json
import os
import cv2
import numpy as np
from datetime import datetime
import hashlib

# Global cache for freeze detection
FRAME_CACHE = {}
CACHE_SIZE = 10  # Keep last 10 frames for comparison

def analyze_blackscreen(image_path, threshold=15):
    """
    Detect blackscreen by analyzing mean pixel intensity.
    Returns True if image is mostly black.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return False
        
        # Convert to grayscale and calculate mean intensity
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mean_intensity = np.mean(gray)
        
        return mean_intensity < threshold
    except Exception as e:
        print(f"Error in blackscreen analysis: {e}", file=sys.stderr)
        return False

def analyze_freeze(image_path, similarity_threshold=0.95):
    """
    Detect freeze by comparing with previous frames.
    Returns True if current frame is very similar to recent frames.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return False
        
        # Convert to grayscale for comparison
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate histogram for comparison
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = cv2.normalize(hist, hist).flatten()
        
        # Generate hash for cache key
        img_hash = hashlib.md5(hist.tobytes()).hexdigest()
        
        # Check against cached frames
        freeze_detected = False
        for cached_hash, cached_hist in FRAME_CACHE.items():
            correlation = cv2.compareHist(hist, cached_hist, cv2.HISTCMP_CORREL)
            if correlation > similarity_threshold:
                freeze_detected = True
                break
        
        # Update cache (keep only recent frames)
        FRAME_CACHE[img_hash] = hist
        if len(FRAME_CACHE) > CACHE_SIZE:
            # Remove oldest entry
            oldest_key = next(iter(FRAME_CACHE))
            del FRAME_CACHE[oldest_key]
        
        return freeze_detected
    except Exception as e:
        print(f"Error in freeze analysis: {e}", file=sys.stderr)
        return False

def analyze_subtitles_and_errors(image_path):
    """
    Detect subtitles and errors using basic image processing.
    Returns tuple (has_subtitles, has_errors, detected_text).
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return False, False, ""
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Focus on bottom portion for subtitles (bottom 20%)
        height, width = gray.shape
        subtitle_region = gray[int(height * 0.8):, :]
        
        # Simple text detection using edge detection
        edges = cv2.Canny(subtitle_region, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Count potential text regions
        text_regions = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if 100 < area < 5000:  # Filter by area to find text-like regions
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h
                if 1.5 < aspect_ratio < 10:  # Text-like aspect ratio
                    text_regions += 1
        
        has_subtitles = text_regions > 3  # Threshold for subtitle detection
        
        # Simple error detection (look for red regions that might indicate errors)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Define red color range
        lower_red1 = np.array([0, 50, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 50, 50])
        upper_red2 = np.array([180, 255, 255])
        
        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = mask1 + mask2
        
        red_pixels = cv2.countNonZero(red_mask)
        total_pixels = width * height
        red_percentage = (red_pixels / total_pixels) * 100
        
        has_errors = red_percentage > 2.0  # If more than 2% red pixels
        
        # Placeholder for detected text (would need OCR library like pytesseract)
        detected_text = "OCR_PLACEHOLDER" if has_subtitles else ""
        
        return has_subtitles, has_errors, detected_text
    except Exception as e:
        print(f"Error in subtitle/error analysis: {e}", file=sys.stderr)
        return False, False, ""

def detect_language(text):
    """
    Simple language detection based on text patterns.
    Returns detected language code.
    """
    if not text or text == "OCR_PLACEHOLDER":
        return "unknown"
    
    # Simple pattern-based detection (placeholder)
    text_lower = text.lower()
    
    # English indicators
    english_words = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with']
    if any(word in text_lower for word in english_words):
        return "en"
    
    # French indicators
    french_words = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir']
    if any(word in text_lower for word in french_words):
        return "fr"
    
    # German indicators
    german_words = ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich']
    if any(word in text_lower for word in german_words):
        return "de"
    
    return "unknown"

def analyze_frame(image_path):
    """
    Main analysis function that processes a captured frame.
    Uses thumbnail for analysis and creates JSON metadata.
    """
    try:
        # Use thumbnail for analysis (faster processing)
        thumbnail_path = image_path.replace('.jpg', '_thumbnail.jpg')
        
        if os.path.exists(thumbnail_path):
            analysis_image = thumbnail_path
            print(f"Analyzing thumbnail: {os.path.basename(thumbnail_path)}")
        else:
            analysis_image = image_path
            print(f"Thumbnail not found, analyzing full image: {os.path.basename(image_path)}")
        
        # Perform AI analysis
        blackscreen = analyze_blackscreen(analysis_image)
        freeze = analyze_freeze(analysis_image)
        subtitles, errors, detected_text = analyze_subtitles_and_errors(analysis_image)
        language = detect_language(detected_text)
        
        # Calculate confidence based on analysis results
        confidence = 0.9 if (blackscreen or freeze or subtitles or errors) else 0.7
        
        # Create analysis metadata
        filename = os.path.basename(image_path)
        timestamp = int(datetime.now().timestamp() * 1000)
        
        analysis_data = {
            "filename": filename,
            "timestamp": timestamp,
            "analysis": {
                "blackscreen": blackscreen,
                "freeze": freeze,
                "subtitles": subtitles,
                "errors": errors,
                "language": language,
                "confidence": confidence
            },
            "processed_at": timestamp,
            "analyzed_image": os.path.basename(analysis_image),
            "original_image": filename
        }
        
        # Save analysis to JSON file
        json_path = image_path.replace('.jpg', '.json')
        with open(json_path, 'w') as f:
            json.dump(analysis_data, f, indent=2)
        
        print(f"Analysis complete: {os.path.basename(json_path)}")
        return json_path
        
    except Exception as e:
        print(f"Error analyzing frame {image_path}: {e}", file=sys.stderr)
        return None

def main():
    """Main entry point for the script."""
    if len(sys.argv) != 2:
        print("Usage: analyze_frame.py <image_path>", file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"Image file not found: {image_path}", file=sys.stderr)
        sys.exit(1)
    
    result = analyze_frame(image_path)
    if result:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main() 