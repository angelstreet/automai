"""
Image Monitoring Helper

AI monitoring functions for analyzing captured frames:
1. Blackscreen detection
2. Freeze detection  
3. Subtitle/OCR processing
4. Error detection
5. Language identification

Used by the image controller for AI monitoring functionality.
"""

import os
import cv2
import numpy as np
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import glob


class ImageMonitoringHelper:
    """AI monitoring helper for analyzing captured frames."""
    
    def __init__(self, captures_path: str, av_controller):
        """Initialize monitoring helper with captures path."""
        self.captures_path = captures_path
        self.av_controller = av_controller
        self.frame_cache = {}  # Cache for freeze detection
        self.max_cache_size = 10  # Keep last 10 frames for comparison
        
        print(f"[@image_monitoring] Initialized with captures path: {self.captures_path}")
    
    def get_latest_frames(self, limit: int = 180) -> Dict[str, Any]:
        """
        Get latest captured frames from the HDMI controller's capture folder.
        
        Args:
            limit: Maximum number of frames to return (default: 180 = 3 minutes at 1fps)
            
        Returns:
            Dict with success status and frame list
        """
        try:
            # Check if captures folder exists
            if not os.path.exists(self.captures_path):
                return {
                    'success': True,
                    'frames': [],
                    'message': 'Capture folder not found'
                }
            
            # Get all capture files with timestamp pattern: capture_YYYYMMDDHHMMSS.jpg
            pattern = os.path.join(self.captures_path, 'capture_*.jpg')
            frame_files = glob.glob(pattern)
            
            if not frame_files:
                return {
                    'success': True,
                    'frames': [],
                    'message': 'No captured frames found'
                }
            
            # Sort by filename (which contains timestamp) to get chronological order
            frame_files.sort()
            
            # Take the most recent frames (limit)
            recent_frames = frame_files[-limit:] if len(frame_files) > limit else frame_files
            
            # Build frame data
            frames = []
            for i, frame_path in enumerate(recent_frames):
                filename = os.path.basename(frame_path)
                # Extract timestamp from filename: capture_YYYYMMDDHHMMSS.jpg
                timestamp_str = filename.replace('capture_', '').replace('.jpg', '')
                
                frames.append({
                    'frameNumber': i,
                    'imagePath': frame_path,
                    'filename': filename,
                    'timestamp': timestamp_str,
                    'analysis': None  # Will be populated when frame is analyzed
                })
            
            print(f"[@image_monitoring] Found {len(frames)} frames in {self.captures_path}")
            
            return {
                'success': True,
                'frames': frames,
                'message': f'Found {len(frames)} captured frames'
            }
            
        except Exception as e:
            print(f"[@image_monitoring] Error getting latest frames: {e}")
            return {
                'success': False,
                'frames': [],
                'message': f'Error accessing frames: {str(e)}'
            }
    
    def analyze_frame(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze a single frame for AI monitoring.
        
        Args:
            image_path: Path to the frame image
            
        Returns:
            Dict with analysis results
        """
        try:
            if not os.path.exists(image_path):
                return {
                    'status': 'error',
                    'error': f'Frame not found: {image_path}',
                    'blackscreen': {'detected': False, 'confidence': 0.0},
                    'freeze': {'detected': False, 'consecutive_count': 0},
                    'subtitles': {'detected': False, 'text': '', 'language': 'unknown'},
                    'errors': {'detected': False, 'error_text': ''}
                }
            
            # Perform individual analyses
            blackscreen_result = self.analyze_blackscreen(image_path)
            freeze_result = self.analyze_freeze(image_path)
            subtitle_result = self.analyze_subtitles_and_errors(image_path)
            
            # Determine overall status
            has_issues = (
                blackscreen_result.get('detected', False) or
                freeze_result.get('detected', False) or
                subtitle_result.get('errors', {}).get('detected', False)
            )
            
            status = 'issue' if has_issues else 'ok'
            
            return {
                'status': status,
                'blackscreen': blackscreen_result,
                'freeze': freeze_result,
                'subtitles': {
                    'detected': subtitle_result.get('subtitles', {}).get('detected', False),
                    'text': subtitle_result.get('subtitles', {}).get('text', ''),
                    'language': subtitle_result.get('language', 'unknown')
                },
                'errors': subtitle_result.get('errors', {'detected': False, 'error_text': ''})
            }
            
        except Exception as e:
            print(f"[@image_monitoring] Error analyzing frame {image_path}: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'blackscreen': {'detected': False, 'confidence': 0.0},
                'freeze': {'detected': False, 'consecutive_count': 0},
                'subtitles': {'detected': False, 'text': '', 'language': 'unknown'},
                'errors': {'detected': False, 'error_text': ''}
            }
    
    def analyze_blackscreen(self, image_path: str) -> Dict[str, Any]:
        """
        Detect if frame is a blackscreen.
        
        Args:
            image_path: Path to the frame image
            
        Returns:
            Dict with blackscreen detection results
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                return {'detected': False, 'confidence': 0.0, 'error': 'Could not load image'}
            
            # Calculate mean pixel intensity
            mean_intensity = np.mean(img)
            
            # Threshold for blackscreen (adjustable)
            blackscreen_threshold = 15
            
            is_blackscreen = mean_intensity < blackscreen_threshold
            confidence = max(0.0, (blackscreen_threshold - mean_intensity) / blackscreen_threshold)
            
            return {
                'detected': is_blackscreen,
                'confidence': float(confidence),
                'mean_intensity': float(mean_intensity),
                'threshold': blackscreen_threshold
            }
            
        except Exception as e:
            print(f"[@image_monitoring] Blackscreen analysis error: {e}")
            return {'detected': False, 'confidence': 0.0, 'error': str(e)}
    
    def analyze_freeze(self, image_path: str) -> Dict[str, Any]:
        """
        Detect if frame is frozen by comparing with previous frames.
        
        Args:
            image_path: Path to the frame image
            
        Returns:
            Dict with freeze detection results
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                return {'detected': False, 'consecutive_count': 0, 'error': 'Could not load image'}
            
            # Convert to grayscale for comparison
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Get filename for cache key
            filename = os.path.basename(image_path)
            
            # Compare with cached frames
            consecutive_count = 0
            freeze_threshold = 5  # Difference threshold
            
            for cached_filename, cached_gray in self.frame_cache.items():
                if cached_gray is not None:
                    # Calculate absolute difference
                    diff = cv2.absdiff(gray, cached_gray)
                    mean_diff = np.mean(diff)
                    
                    if mean_diff < freeze_threshold:
                        consecutive_count += 1
            
            # Update cache
            self.frame_cache[filename] = gray.copy()
            
            # Limit cache size
            if len(self.frame_cache) > self.max_cache_size:
                oldest_key = list(self.frame_cache.keys())[0]
                del self.frame_cache[oldest_key]
            
            # Consider frozen if similar to multiple previous frames
            is_frozen = consecutive_count >= 3
            
            return {
                'detected': is_frozen,
                'consecutive_count': consecutive_count,
                'threshold': freeze_threshold,
                'cache_size': len(self.frame_cache)
            }
            
        except Exception as e:
            print(f"[@image_monitoring] Freeze analysis error: {e}")
            return {'detected': False, 'consecutive_count': 0, 'error': str(e)}
    
    def analyze_subtitles_and_errors(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze frame for subtitles and error messages using OCR.
        
        Args:
            image_path: Path to the frame image
            
        Returns:
            Dict with subtitle and error detection results
        """
        try:
            # Simple implementation - can be enhanced with actual OCR
            # For now, return mock data to test the UI
            
            # Mock subtitle detection (replace with actual OCR)
            extracted_text = self._extract_text_mock(image_path)
            
            # Check for error keywords
            error_keywords = ['error', 'failed', 'exception', '404', '500', 'timeout', 'connection failed']
            has_errors = any(keyword.lower() in extracted_text.lower() for keyword in error_keywords)
            
            # Extract error text if found
            error_text = extracted_text if has_errors else ''
            
            # Detect language (simple implementation)
            language = self._detect_language_simple(extracted_text)
            
            return {
                'subtitles': {
                    'detected': len(extracted_text.strip()) > 0,
                    'text': extracted_text,
                    'confidence': 0.8 if extracted_text else 0.0
                },
                'errors': {
                    'detected': has_errors,
                    'error_text': error_text,
                    'confidence': 0.9 if has_errors else 0.0
                },
                'language': language
            }
            
        except Exception as e:
            print(f"[@image_monitoring] OCR analysis error: {e}")
            return {
                'subtitles': {'detected': False, 'text': '', 'confidence': 0.0},
                'errors': {'detected': False, 'error_text': '', 'confidence': 0.0},
                'language': 'unknown'
            }
    
    def _extract_text_mock(self, image_path: str) -> str:
        """
        Mock text extraction - replace with actual OCR (Tesseract).
        
        Args:
            image_path: Path to the frame image
            
        Returns:
            Extracted text string
        """
        # Mock implementation - return empty for now
        # TODO: Implement actual OCR using Tesseract
        # import pytesseract
        # img = cv2.imread(image_path)
        # text = pytesseract.image_to_string(img)
        # return text.strip()
        
        return ""  # Return empty text for now
    
    def _detect_language_simple(self, text: str) -> str:
        """
        Simple language detection based on keywords.
        
        Args:
            text: Text to analyze
            
        Returns:
            Detected language code
        """
        if not text.strip():
            return 'unknown'
        
        # Simple keyword-based detection
        french_words = ['le', 'la', 'les', 'de', 'et', 'à', 'un', 'une', 'ce', 'que']
        english_words = ['the', 'and', 'of', 'to', 'a', 'in', 'is', 'it', 'you', 'that']
        
        text_lower = text.lower()
        
        french_count = sum(1 for word in french_words if word in text_lower)
        english_count = sum(1 for word in english_words if word in text_lower)
        
        if french_count > english_count:
            return 'french'
        elif english_count > 0:
            return 'english'
        else:
            return 'unknown' 