"""
Video Helpers

Core video processing helpers for video verification operations:
1. Image analysis (OpenCV and FFmpeg)
2. Motion detection and comparison
3. Content analysis (blackscreen, freeze, subtitles)
4. AI-powered analysis
5. Text extraction and language detection

Includes: frame comparison, blackscreen detection, freeze detection, subtitle analysis, OCR, AI analysis
"""

import os
import subprocess
import time
import cv2
import numpy as np
import base64
import requests
import tempfile
import re
import json
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List

# Optional imports for text extraction and language detection
try:
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

try:
    from langdetect import detect, LangDetectException
    LANG_DETECT_AVAILABLE = True
except ImportError:
    LANG_DETECT_AVAILABLE = False

# Simplified sampling patterns for performance optimization
SAMPLING_PATTERNS = {
    "freeze_sample_rate": 10,     # Every 10th pixel for freeze detection
    "blackscreen_samples": 1000,  # 1000 random pixels for blackscreen
    "error_grid_rate": 15,        # Every 15th pixel in grid for errors
    "subtitle_edge_threshold": 200  # Edge detection threshold
}


class VideoHelpers:
    """Core video processing helpers for verification operations."""
    
    def __init__(self, av_controller):
        """Initialize video helpers with AV controller."""
        self.av_controller = av_controller
    
    # =============================================================================
    # Core Operation 1: Image Analysis
    # =============================================================================
    
    def analyze_with_opencv(self, image_path: str, analysis_type: str) -> Dict[str, Any]:
        """Analyze image using OpenCV."""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}
            
            height, width, channels = image.shape
            
            if analysis_type == "basic":
                # Basic image properties
                return {
                    "width": width,
                    "height": height,
                    "channels": channels,
                    "total_pixels": width * height,
                    "analysis_type": "basic",
                    "image_path": image_path
                }
                
            elif analysis_type == "color":
                # Color analysis
                mean_color = cv2.mean(image)
                hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
                
                # Dominant color detection (simplified)
                colors = {
                    "blue": mean_color[0],
                    "green": mean_color[1], 
                    "red": mean_color[2]
                }
                dominant_color = max(colors, key=colors.get)
                
                return {
                    "mean_bgr": mean_color[:3],
                    "dominant_color": dominant_color,
                    "color_variance": np.var(image),
                    "analysis_type": "color",
                    "image_path": image_path
                }
                
            elif analysis_type == "brightness":
                # Brightness analysis
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                mean_brightness = np.mean(gray)
                brightness_std = np.std(gray)
                
                return {
                    "mean_brightness": float(mean_brightness),
                    "brightness_std": float(brightness_std),
                    "brightness_percentage": float(mean_brightness / 255 * 100),
                    "analysis_type": "brightness",
                    "image_path": image_path
                }
                
            return {"error": f"Unknown OpenCV analysis type: {analysis_type}"}
            
        except Exception as e:
            return {"error": f"OpenCV analysis failed: {e}"}
    
    def analyze_with_ffmpeg(self, image_path: str, analysis_type: str) -> Dict[str, Any]:
        """Analyze image using FFmpeg."""
        try:
            if analysis_type == "basic":
                # Get basic image info
                cmd = [
                    '/usr/bin/ffprobe',
                    '-v', 'quiet',
                    '-print_format', 'json',
                    '-show_streams',
                    image_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                
                if result.returncode == 0:
                    data = json.loads(result.stdout)
                    if 'streams' in data and len(data['streams']) > 0:
                        stream = data['streams'][0]
                        return {
                            "width": stream.get('width', 0),
                            "height": stream.get('height', 0),
                            "pixel_format": stream.get('pix_fmt', 'unknown'),
                            "analysis_type": "basic",
                            "image_path": image_path
                        }
                        
            # For other analysis types, return basic info
            return {
                "analysis_type": analysis_type,
                "image_path": image_path,
                "note": "Limited analysis without OpenCV"
            }
            
        except Exception as e:
            return {"error": f"FFmpeg analysis failed: {e}"}
    
    # =============================================================================
    # Core Operation 2: Motion Detection and Frame Comparison
    # =============================================================================
    
    def compare_images_for_motion(self, image1_path: str, image2_path: str, threshold: float) -> Tuple[bool, float]:
        """
        Compare two images to detect motion.
        
        Returns:
            Tuple of (motion_detected, change_percentage)
        """
        try:
            # Load images
            img1 = cv2.imread(image1_path, cv2.IMREAD_GRAYSCALE)
            img2 = cv2.imread(image2_path, cv2.IMREAD_GRAYSCALE)
            
            if img1 is None or img2 is None:
                return False, 0.0
            
            # Resize images to same size if needed
            if img1.shape != img2.shape:
                img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
            
            # Calculate absolute difference
            diff = cv2.absdiff(img1, img2)
            
            # Calculate percentage of changed pixels
            total_pixels = img1.shape[0] * img1.shape[1]
            changed_pixels = np.count_nonzero(diff > 30)  # Threshold for significant change
            change_percentage = (changed_pixels / total_pixels) * 100
            
            return change_percentage > threshold, change_percentage
            
        except Exception as e:
            print(f"[@video_helpers] Image comparison error: {e}")
            return False, 0.0
    
    def compare_consecutive_frames(self, images: List[Dict], freeze_threshold: float) -> List[Dict]:
        """
        Compare consecutive frames for freeze detection.
        
        Args:
            images: List of image dictionaries with 'path', 'image', 'filename'
            freeze_threshold: Threshold for frame difference detection
            
        Returns:
            List of comparison results
        """
        try:
            comparisons = []
            
            # Compare consecutive frames
            for i in range(len(images) - 1):
                img1 = images[i]
                img2 = images[i + 1]
                
                # Check if images have same dimensions
                if img1['image'].shape != img2['image'].shape:
                    return [{'error': f'Image dimensions don\'t match: {img1["image"].shape} vs {img2["image"].shape}'}]
                
                # Optimized sampling for pixel difference (every 10th pixel for performance)
                sample_rate = SAMPLING_PATTERNS["freeze_sample_rate"]
                img1_sampled = img1['image'][::sample_rate, ::sample_rate]
                img2_sampled = img2['image'][::sample_rate, ::sample_rate]
                
                # Calculate difference
                diff = cv2.absdiff(img1_sampled, img2_sampled)
                mean_diff = np.mean(diff)
                
                comparison = {
                    'frame1': img1['filename'],
                    'frame2': img2['filename'],
                    'mean_difference': round(float(mean_diff), 2),
                    'is_frozen': bool(mean_diff < freeze_threshold),
                    'threshold': freeze_threshold
                }
                
                comparisons.append(comparison)
            
            return comparisons
            
        except Exception as e:
            print(f"[@video_helpers] Frame comparison error: {e}")
            return [{'error': str(e)}]
    
    # =============================================================================
    # Core Operation 3: Content Analysis
    # =============================================================================
    
    def detect_blackscreen_in_image(self, image_path: str, threshold: int = 10) -> Dict[str, Any]:
        """
        Detect if single image is mostly black (blackscreen).
        
        Args:
            image_path: Path to image file
            threshold: Pixel intensity threshold (0-255)
            
        Returns:
            Dictionary with blackscreen analysis results
        """
        try:
            if not os.path.exists(image_path):
                return {
                    'image_path': image_path,
                    'success': False,
                    'error': 'Image file not found'
                }
            
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                return {
                    'image_path': image_path,
                    'success': False,
                    'error': 'Could not load image'
                }
            
            # Simple approach: count how many pixels are very dark (0-threshold)
            very_dark_pixels = np.sum(img <= threshold)
            total_pixels = img.shape[0] * img.shape[1]
            dark_percentage = (very_dark_pixels / total_pixels) * 100
            
            # If more than 95% of pixels are very dark, it's a blackscreen
            is_blackscreen = bool(dark_percentage > 95)
            
            return {
                'image_path': os.path.basename(image_path),
                'success': True,
                'is_blackscreen': is_blackscreen,
                'dark_percentage': round(float(dark_percentage), 2),
                'threshold': threshold,
                'very_dark_pixels': int(very_dark_pixels),
                'total_pixels': int(total_pixels),
                'image_size': f"{img.shape[1]}x{img.shape[0]}",
                'confidence': 0.9 if is_blackscreen else 0.1
            }
            
        except Exception as e:
            return {
                'image_path': image_path,
                'success': False,
                'error': f'Analysis error: {str(e)}'
            }
    
    def analyze_subtitle_region(self, img, extract_text: bool = True) -> Dict[str, Any]:
        """
        Analyze subtitle region in image for subtitles and errors.
        
        Args:
            img: OpenCV image (BGR format)
            extract_text: Whether to extract text using OCR
            
        Returns:
            Dictionary with subtitle analysis results
        """
        try:
            height, width = img.shape[:2]
            
            # Enhanced subtitle detection with adaptive region processing
            # Expanded to capture 2-line subtitles - start from 70% to bottom (30% of screen height)
            subtitle_height_start = int(height * 0.7)
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
            has_subtitles = bool(subtitle_edges > adaptive_threshold)
            
            # Error detection - look for prominent red content
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            
            # Use configurable grid sampling rate
            grid_rate = SAMPLING_PATTERNS["error_grid_rate"]
            sampled_hsv = hsv[::grid_rate, ::grid_rate]
            
            # Red color range in HSV - more restrictive for actual error messages
            lower_red1 = np.array([0, 100, 100])
            upper_red1 = np.array([10, 255, 255])
            lower_red2 = np.array([170, 100, 100])
            upper_red2 = np.array([180, 255, 255])
            
            mask1 = cv2.inRange(sampled_hsv, lower_red1, upper_red1)
            mask2 = cv2.inRange(sampled_hsv, lower_red2, upper_red2)
            red_mask = mask1 + mask2
            
            red_pixels = np.sum(red_mask > 0)
            total_sampled_pixels = sampled_hsv.shape[0] * sampled_hsv.shape[1]
            red_percentage = float((red_pixels / total_sampled_pixels) * 100)
            
            # Higher threshold for error detection
            has_errors = bool(red_percentage > 8.0)
            
            # Extract text if requested and subtitles detected
            extracted_text = ""
            detected_language = "unknown"
            if extract_text and has_subtitles and OCR_AVAILABLE:
                extracted_text = self.extract_text_from_region(subtitle_region)
                if extracted_text:
                    detected_language = self.detect_language(extracted_text)
                else:
                    # If no text extracted, then no real subtitles detected
                    has_subtitles = False
            elif extract_text and has_subtitles and not OCR_AVAILABLE:
                # If OCR is not available but we want text extraction, we can't verify subtitles
                print(f"[@video_helpers] OCR not available - cannot verify subtitle text")
                # Keep has_subtitles as True since we detected edges but can't verify text
            
            # Calculate confidence based on actual findings
            if has_subtitles and extracted_text:
                confidence = 0.9  # High confidence when we have both edges and text
            elif has_subtitles and not extract_text:
                confidence = 0.7  # Medium confidence when we have edges but didn't try OCR
            elif has_errors:
                confidence = 0.8  # High confidence for error detection
            elif subtitle_edges > adaptive_threshold and not extracted_text and extract_text:
                confidence = 0.2  # Low confidence when edges detected but no text found (likely false positive)
            else:
                confidence = 0.1  # Low confidence when nothing detected
            
            return {
                'has_subtitles': has_subtitles,
                'has_errors': has_errors,
                'subtitle_edges': int(subtitle_edges),
                'subtitle_threshold': float(adaptive_threshold),
                'red_percentage': round(red_percentage, 2),
                'error_threshold': 8.0,
                'extracted_text': extracted_text,
                'detected_language': detected_language,
                'subtitle_region_size': f"{subtitle_region.shape[1]}x{subtitle_region.shape[0]}",
                'confidence': confidence,
                'ocr_available': OCR_AVAILABLE
            }
            
        except Exception as e:
            return {
                'error': f'Subtitle analysis error: {str(e)}',
                'has_subtitles': False,
                'has_errors': False,
                'confidence': 0.0
            }
    
    # =============================================================================
    # Core Operation 4: Text Extraction and Language Detection
    # =============================================================================
    
    def extract_text_from_region(self, region_image) -> str:
        """Extract text from subtitle region using OCR"""
        if not OCR_AVAILABLE:
            return ''
        
        try:
            # Convert to grayscale for better OCR
            gray_region = cv2.cvtColor(region_image, cv2.COLOR_BGR2GRAY)
            
            # Enhance contrast for better text recognition
            enhanced = cv2.convertScaleAbs(gray_region, alpha=2.0, beta=0)
            
            # Apply threshold to get better text
            _, thresh = cv2.threshold(enhanced, 127, 255, cv2.THRESH_BINARY)
            
            # Extract text using OCR
            text = pytesseract.image_to_string(thresh, config='--psm 6')
            text = text.strip()
            
            # Basic text validation
            if len(text) < 3:
                return ''
            
            # Clean and filter the text for better language detection
            cleaned_text = self.clean_ocr_text(text)
            
            # Return cleaned text if it has meaningful content
            if len(cleaned_text) >= 3:
                return cleaned_text
            else:
                # If cleaned text is too short, return original for display but it won't be good for language detection
                return text
            
        except Exception as e:
            print(f"[@video_helpers] Text extraction error: {e}")
            return ''
    
    def clean_ocr_text(self, text: str) -> str:
        """Clean OCR text by removing noise and keeping only meaningful words"""
        if not text:
            return ''
        
        # Remove newlines and extra whitespace
        text = re.sub(r'\s+', ' ', text.replace('\n', ' ')).strip()
        
        # Split into words and filter out noise
        words = text.split()
        cleaned_words = []
        
        for word in words:
            # Remove common OCR noise patterns
            cleaned_word = re.sub(r'[^\w\s\'-]', '', word)  # Keep letters, numbers, apostrophes, hyphens
            cleaned_word = cleaned_word.strip()
            
            # Keep words that are:
            # - At least 2 characters long
            # - Contain at least one letter
            # - Are not just numbers or symbols
            if (len(cleaned_word) >= 2 and 
                re.search(r'[a-zA-ZÀ-ÿ]', cleaned_word) and  # Contains letters (including accented)
                not cleaned_word.isdigit()):  # Not just numbers
                cleaned_words.append(cleaned_word)
        
        return ' '.join(cleaned_words)
    
    def detect_language(self, text: str) -> str:
        """Detect language of extracted text"""
        if not LANG_DETECT_AVAILABLE or not text:
            return 'unknown'
        
        try:
            # Clean the text for better language detection
            cleaned_text = self.clean_ocr_text(text)
            
            # Use cleaned text for detection, but fall back to original if cleaning removed too much
            detection_text = cleaned_text if len(cleaned_text) >= 6 else text
            
            # Check word count - need at least 3 meaningful words for detection
            words = detection_text.split()
            if len(words) < 3:
                return 'unknown'
            
            # Detect language
            detected_lang = detect(detection_text)
            
            # Only allow specific languages - map to full names
            allowed_languages = {
                'en': 'English',
                'fr': 'French', 
                'de': 'German',
                'it': 'Italian',
                'es': 'Spanish',
                'pt': 'Portuguese',
                'nl': 'Dutch'
            }
            
            result = allowed_languages.get(detected_lang, 'unknown')
            return result
            
        except (LangDetectException, Exception) as e:
            print(f"[@video_helpers] Language detection error: {e}")
            return 'unknown'
    
    # =============================================================================
    # Core Operation 5: AI-Powered Analysis
    # =============================================================================
    
    def analyze_subtitle_with_ai(self, region_image) -> Tuple[str, str, float]:
        """
        AI-powered subtitle analysis using OpenRouter.
        
        Args:
            region_image: Cropped subtitle region image
            
        Returns:
            Tuple of (extracted_text, detected_language, confidence)
        """
        try:
            # Get API key from environment
            api_key = os.getenv('OPENROUTER_API_KEY')
            if not api_key:
                print(f"[@video_helpers] OpenRouter API key not found in environment")
                return '', 'unknown', 0.0
            
            # Save cropped region to temporary file for encoding
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                cv2.imwrite(tmp_file.name, region_image)
                temp_path = tmp_file.name
            
            try:
                # Encode image to base64
                with open(temp_path, 'rb') as f:
                    image_data = base64.b64encode(f.read()).decode()
                
                # Enhanced prompt for subtitle analysis with stronger JSON enforcement
                prompt = """You are a subtitle detection system. Analyze this image for subtitles in the bottom portion.

CRITICAL: You MUST respond with ONLY valid JSON. No other text before or after.

Required JSON format:
{
  "subtitles_detected": true,
  "extracted_text": "exact subtitle text here",
  "detected_language": "German",
  "confidence": 0.95
}

If no subtitles found:
{
  "subtitles_detected": false,
  "extracted_text": "",
  "detected_language": "unknown",
  "confidence": 0.1
}

Languages: English, French, German, Spanish, Italian, Portuguese, Dutch, or unknown
JSON ONLY - NO OTHER TEXT"""
                
                # Call OpenRouter API
                response = requests.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://automai.dev',
                        'X-Title': 'AutomAI-VirtualPyTest'
                    },
                    json={
                        'model': 'qwen/qwen-2-vl-7b-instruct',
                        'messages': [
                            {
                                'role': 'user',
                                'content': [
                                    {'type': 'text', 'text': prompt},
                                    {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{image_data}'}}
                                ]
                            }
                        ],
                        'max_tokens': 300,
                        'temperature': 0.0
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content']
                    
                    # Parse JSON response with fallback logic
                    try:
                        # Try to parse as JSON first
                        ai_result = json.loads(content)
                        
                        subtitles_detected = ai_result.get('subtitles_detected', False)
                        extracted_text = ai_result.get('extracted_text', '').strip()
                        detected_language = ai_result.get('detected_language', 'unknown')
                        confidence = float(ai_result.get('confidence', 0.0))
                        
                        if not subtitles_detected or not extracted_text:
                            return '', 'unknown', 0.0
                        
                        return extracted_text, detected_language, confidence
                        
                    except json.JSONDecodeError as e:
                        print(f"[@video_helpers] Failed to parse AI JSON response: {e}")
                        
                        # Fallback: try to extract information from natural language response
                        extracted_text, detected_language, confidence = self.parse_natural_language_response(content)
                        
                        if extracted_text:
                            return extracted_text, detected_language, confidence
                        else:
                            return '', 'unknown', 0.0
                else:
                    print(f"[@video_helpers] OpenRouter API error: {response.status_code} - {response.text}")
                    return '', 'unknown', 0.0
                    
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            print(f"[@video_helpers] AI subtitle analysis error: {e}")
            return '', 'unknown', 0.0
    
    def parse_natural_language_response(self, content: str) -> Tuple[str, str, float]:
        """
        Parse natural language AI response to extract subtitle information.
        
        Args:
            content: Raw AI response content
            
        Returns:
            Tuple of (extracted_text, detected_language, confidence)
        """
        try:
            content_lower = content.lower()
            
            # Check if subtitles were mentioned as present
            subtitle_indicators = ['subtitle', 'text reads', 'says', 'displays', 'shows']
            has_subtitle_mention = any(indicator in content_lower for indicator in subtitle_indicators)
            
            if not has_subtitle_mention:
                return '', 'unknown', 0.0
            
            # Extract text between quotes
            quote_patterns = [
                r'"([^"]+)"',           # Double quotes
                r"'([^']+)'",           # Single quotes  
                r'"([^"]+)"',           # Curly quotes
                r'„([^"]+)"',           # German quotes
                r'«([^»]+)»',           # French quotes
            ]
            
            extracted_text = ''
            for pattern in quote_patterns:
                matches = re.findall(pattern, content)
                if matches:
                    # Take the longest match (likely the subtitle text)
                    extracted_text = max(matches, key=len).strip()
                    break
            
            # If no quotes found, try to extract after "reads:" or "says:"
            if not extracted_text:
                read_patterns = [
                    r'text reads:?\s*(.+?)(?:\.|$)',
                    r'says:?\s*(.+?)(?:\.|$)', 
                    r'displays:?\s*(.+?)(?:\.|$)',
                    r'shows:?\s*(.+?)(?:\.|$)'
                ]
                
                for pattern in read_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        extracted_text = matches[0].strip()
                        # Remove quotes if they exist
                        extracted_text = re.sub(r'^["\'"„«]|["\'"„»]$', '', extracted_text)
                        break
            
            # Clean up the extracted text
            if extracted_text:
                # Remove common OCR artifacts and clean the text
                extracted_text = re.sub(r'\s+', ' ', extracted_text).strip()
                
                # Validate the text (should be at least 3 characters)
                if len(extracted_text) < 3:
                    return '', 'unknown', 0.0
            
            # Detect language from the response content
            detected_language = 'unknown'
            language_mentions = {
                'german': 'German',
                'deutsch': 'German', 
                'english': 'English',
                'french': 'French',
                'français': 'French',
                'spanish': 'Spanish',
                'español': 'Spanish',
                'italian': 'Italian',
                'italiano': 'Italian',
                'portuguese': 'Portuguese',
                'português': 'Portuguese',
                'dutch': 'Dutch',
                'nederlands': 'Dutch'
            }
            
            for lang_key, lang_name in language_mentions.items():
                if lang_key in content_lower:
                    detected_language = lang_name
                    break
            
            # If we found text, try to detect language from the text itself
            if extracted_text and detected_language == 'unknown':
                detected_language = self.detect_language(extracted_text)
            
            # Set confidence based on what we found
            if extracted_text and detected_language != 'unknown':
                confidence = 0.8  # High confidence when we have both text and language
            elif extracted_text:
                confidence = 0.6  # Medium confidence when we have text but no language
            else:
                confidence = 0.1  # Low confidence
            
            return extracted_text, detected_language, confidence
            
        except Exception as e:
            print(f"[@video_helpers] Natural language parsing error: {e}")
            return '', 'unknown', 0.0
    
    def analyze_full_image_with_ai(self, image_path: str, user_question: str) -> str:
        """
        Analyze full image with AI using user's question.
        
        Args:
            image_path: Path to image file
            user_question: User's question about the image
            
        Returns:
            AI's text response (max 3 lines) or empty string if failed
        """
        try:
            # Check if image exists
            if not os.path.exists(image_path):
                return "Image file not found."
            
            # Get API key from environment
            api_key = os.getenv('OPENROUTER_API_KEY')
            if not api_key:
                return "AI service not available."
            
            # Read and encode the full image
            try:
                with open(image_path, 'rb') as f:
                    image_data = base64.b64encode(f.read()).decode()
                
                # Simple prompt for general image analysis
                prompt = f"""Analyze this image and answer the user's question: "{user_question}"

Provide a clear, concise answer in maximum 3 lines.
Be specific and helpful."""
                
                # Call OpenRouter API
                response = requests.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://automai.dev',
                        'X-Title': 'AutomAI-VirtualPyTest'
                    },
                    json={
                        'model': 'qwen/qwen-2-vl-7b-instruct',
                        'messages': [
                            {
                                'role': 'user',
                                'content': [
                                    {'type': 'text', 'text': prompt},
                                    {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{image_data}'}}
                                ]
                            }
                        ],
                        'max_tokens': 200,
                        'temperature': 0.0
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    ai_response = result['choices'][0]['message']['content'].strip()
                    
                    # Limit to 3 lines maximum
                    lines = ai_response.split('\n')
                    if len(lines) > 3:
                        ai_response = '\n'.join(lines[:3])
                    
                    return ai_response
                else:
                    return "AI service error. Please try again."
                    
            except Exception as e:
                return "Failed to process image."
                
        except Exception as e:
            return "Analysis error. Please try again."
