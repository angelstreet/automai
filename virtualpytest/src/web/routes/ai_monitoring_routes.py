from flask import Blueprint, request, jsonify
import os
import cv2
import numpy as np
import pytesseract
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import glob
import json
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ai_monitoring_bp = Blueprint('ai_monitoring', __name__)

# AI Analysis configuration
BLACKSCREEN_THRESHOLD = 15  # Mean pixel intensity threshold for blackscreen
FREEZE_FRAME_THRESHOLD = 0.95  # Similarity threshold for freeze detection
SUBTITLE_MIN_CONFIDENCE = 60  # Minimum OCR confidence for subtitle text
MAX_SUBTITLE_DISPLAY_LENGTH = 10  # Max characters to display in overlay

# Frame cache for freeze detection
frame_cache = {}
consecutive_counts = {}

def analyze_blackscreen(image: np.ndarray) -> Dict[str, Any]:
    """Detect if the frame is mostly black"""
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate mean intensity
        mean_intensity = np.mean(gray)
        
        # Check if it's a blackscreen
        is_blackscreen = mean_intensity < BLACKSCREEN_THRESHOLD
        
        return {
            'detected': bool(is_blackscreen),
            'confidence': float(100 - (mean_intensity / 255 * 100))  # Higher confidence for darker images
        }
    except Exception as e:
        logger.error(f"Blackscreen analysis failed: {e}")
        return {'detected': False, 'confidence': 0.0}

def analyze_freeze(image: np.ndarray, device_id: str, frame_number: int) -> Dict[str, Any]:
    """Detect if the frame is frozen by comparing with recent frames"""
    try:
        # Convert to grayscale and resize for comparison
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (320, 240))
        
        # Initialize cache for this device
        if device_id not in frame_cache:
            frame_cache[device_id] = []
            consecutive_counts[device_id] = {'freeze': 0}
        
        cache = frame_cache[device_id]
        
        # Keep only last 5 frames
        cache.append(resized)
        if len(cache) > 5:
            cache.pop(0)
        
        # Need at least 2 frames to compare
        if len(cache) < 2:
            return {'detected': False, 'consecutiveFrames': 0}
        
        # Compare current frame with previous frames
        current_frame = cache[-1]
        is_frozen = False
        
        # Check similarity with each of the last 3 frames
        for prev_frame in cache[-4:-1]:  # Skip the current frame
            # Calculate structural similarity
            diff = cv2.absdiff(current_frame, prev_frame)
            similarity = 1 - (np.mean(diff) / 255)
            
            if similarity > FREEZE_FRAME_THRESHOLD:
                is_frozen = True
                break
        
        # Update consecutive count
        if is_frozen:
            consecutive_counts[device_id]['freeze'] += 1
        else:
            consecutive_counts[device_id]['freeze'] = 0
        
        return {
            'detected': bool(is_frozen),
            'consecutiveFrames': consecutive_counts[device_id]['freeze']
        }
        
    except Exception as e:
        logger.error(f"Freeze analysis failed: {e}")
        return {'detected': False, 'consecutiveFrames': 0}

def analyze_subtitles_and_errors(image: np.ndarray) -> Dict[str, Any]:
    """Extract text from image and analyze for subtitles and errors"""
    try:
        # Preprocess image for better OCR
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Focus on bottom third for subtitles
        height = gray.shape[0]
        subtitle_region = gray[int(height * 0.7):, :]
        
        # Extract text from subtitle region
        subtitle_config = '--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?-: '
        subtitle_data = pytesseract.image_to_data(subtitle_region, config=subtitle_config, output_type=pytesseract.Output.DICT)
        
        # Extract text from full image for error detection
        full_config = '--psm 6'
        full_text = pytesseract.image_to_string(image, config=full_config)
        
        # Process subtitle text
        subtitle_text = ""
        subtitle_confidences = []
        
        for i, conf in enumerate(subtitle_data['conf']):
            if int(conf) > SUBTITLE_MIN_CONFIDENCE:
                text = subtitle_data['text'][i].strip()
                if text:
                    subtitle_text += text + " "
                    subtitle_confidences.append(int(conf))
        
        subtitle_text = subtitle_text.strip()
        
        # Truncate subtitle text for display
        truncated_subtitle = subtitle_text
        if len(subtitle_text) > MAX_SUBTITLE_DISPLAY_LENGTH:
            truncated_subtitle = subtitle_text[:MAX_SUBTITLE_DISPLAY_LENGTH] + "..."
        elif not subtitle_text:
            truncated_subtitle = "None"
        
        # Error detection patterns
        error_patterns = [
            r'error\s*\d+',
            r'failed',
            r'unable to',
            r'connection\s*lost',
            r'not\s*found',
            r'timeout',
            r'exception',
            r'invalid'
        ]
        
        detected_error = None
        error_type = ""
        
        for pattern in error_patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                detected_error = match.group(0)
                error_type = pattern.replace(r'\s*', ' ').replace(r'\d+', 'XXX')
                break
        
        # Simple language detection based on character patterns
        language = detect_language(subtitle_text)
        
        return {
            'subtitles': {
                'detected': bool(subtitle_text),
                'text': subtitle_text,
                'truncatedText': truncated_subtitle
            },
            'errors': {
                'detected': bool(detected_error),
                'errorType': error_type,
                'errorText': detected_error or ""
            },
            'language': language
        }
        
    except Exception as e:
        logger.error(f"Text analysis failed: {e}")
        return {
            'subtitles': {'detected': False, 'text': "", 'truncatedText': "None"},
            'errors': {'detected': False, 'errorType': "", 'errorText': ""},
            'language': {'language': 'unknown', 'confidence': 0.0}
        }

def detect_language(text: str) -> Dict[str, Any]:
    """Simple language detection based on character patterns"""
    if not text or len(text.strip()) < 3:
        return {'language': 'unknown', 'confidence': 0.0}
    
    text = text.lower()
    
    # Simple pattern-based detection
    french_indicators = ['le ', 'la ', 'les ', 'de ', 'du ', 'des ', 'et ', 'ou ', 'avec ', 'pour ']
    english_indicators = ['the ', 'and ', 'or ', 'with ', 'for ', 'in ', 'on ', 'at ', 'to ', 'of ']
    
    french_score = sum(1 for indicator in french_indicators if indicator in text)
    english_score = sum(1 for indicator in english_indicators if indicator in text)
    
    if french_score > english_score and french_score > 0:
        return {'language': 'fr', 'confidence': min(80.0, french_score * 20)}
    elif english_score > 0:
        return {'language': 'en', 'confidence': min(80.0, english_score * 15)}
    else:
        return {'language': 'unknown', 'confidence': 0.0}

@ai_monitoring_bp.route('/get-latest-frames', methods=['POST'])
def get_latest_frames():
    """Get latest captured frames from HDMI controller"""
    try:
        data = request.get_json()
        host = data.get('host', {})
        device_id = data.get('device_id', 'device1')
        last_processed_frame = data.get('last_processed_frame', 0)
        
        # Get capture folder path based on host configuration
        capture_folder = f"/tmp/captures/{host.get('host_id', 'default')}_{device_id}"
        
        if not os.path.exists(capture_folder):
            return jsonify({
                'success': True,
                'frames': [],
                'message': 'Capture folder not found'
            })
        
        # Find new image files
        image_patterns = [
            os.path.join(capture_folder, "*.jpg"),
            os.path.join(capture_folder, "*.png"),
            os.path.join(capture_folder, "*.jpeg")
        ]
        
        all_images = []
        for pattern in image_patterns:
            all_images.extend(glob.glob(pattern))
        
        # Sort by modification time and filter new frames
        all_images.sort(key=os.path.getmtime)
        
        new_frames = []
        for img_path in all_images:
            try:
                # Extract frame number from filename
                filename = os.path.basename(img_path)
                frame_match = re.search(r'frame_(\d+)', filename)
                if frame_match:
                    frame_number = int(frame_match.group(1))
                    if frame_number > last_processed_frame:
                        new_frames.append({
                            'path': img_path,
                            'frame_number': frame_number,
                            'timestamp': int(os.path.getmtime(img_path))
                        })
            except (ValueError, OSError):
                continue
        
        # Limit to last 10 new frames to avoid overwhelming
        new_frames = new_frames[-10:]
        
        return jsonify({
            'success': True,
            'frames': new_frames,
            'total_new_frames': len(new_frames)
        })
        
    except Exception as e:
        logger.error(f"Failed to get latest frames: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'frames': []
        }), 500

@ai_monitoring_bp.route('/analyze-frame', methods=['POST'])
def analyze_frame():
    """Analyze a single frame with AI detection"""
    try:
        data = request.get_json()
        frame_path = data.get('frame_path')
        frame_number = data.get('frame_number', 0)
        host = data.get('host', {})
        device_id = data.get('device_id', 'device1')
        
        if not frame_path or not os.path.exists(frame_path):
            return jsonify({
                'success': False,
                'error': 'Frame path not found'
            }), 400
        
        # Load image
        image = cv2.imread(frame_path)
        if image is None:
            return jsonify({
                'success': False,
                'error': 'Failed to load image'
            }), 400
        
        # Perform AI analysis
        blackscreen_result = analyze_blackscreen(image)
        freeze_result = analyze_freeze(image, device_id, frame_number)
        text_result = analyze_subtitles_and_errors(image)
        
        # Update consecutive blackscreen count
        if device_id not in consecutive_counts:
            consecutive_counts[device_id] = {'freeze': 0, 'blackscreen': 0}
        
        if blackscreen_result['detected']:
            consecutive_counts[device_id]['blackscreen'] += 1
        else:
            consecutive_counts[device_id]['blackscreen'] = 0
        
        blackscreen_result['consecutiveFrames'] = consecutive_counts[device_id]['blackscreen']
        
        # Determine overall status
        has_issues = (
            blackscreen_result['detected'] or 
            freeze_result['detected'] or 
            text_result['errors']['detected']
        )
        
        status = 'issue' if has_issues else 'ok'
        
        analysis = {
            'status': status,
            'blackscreen': blackscreen_result,
            'freeze': freeze_result,
            'subtitles': text_result['subtitles'],
            'errors': text_result['errors'],
            'language': text_result['language']
        }
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'frame_number': frame_number
        })
        
    except Exception as e:
        logger.error(f"Frame analysis failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_monitoring_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'service': 'ai_monitoring',
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    }) 