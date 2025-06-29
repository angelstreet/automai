"""
Text Helpers

Simple text processing helpers for 3 core operations:
1. Detect text from image in area
2. Wait for text to appear  
3. Wait for text to disappear

Includes: crop, filter (greyscale/binary), OCR, language detection
"""

import os
import requests
import tempfile
import json
import time
import cv2
import numpy as np
import subprocess
from typing import Dict, Any, Optional, Tuple
from urllib.parse import urlparse


class TextHelpers:
    """Simple text processing helpers for core operations."""
    
    def __init__(self, captures_path: str):
        """Initialize text helpers with captures path."""
        self.captures_path = captures_path
        
    def download_image(self, source_url: str) -> str:
        """Download image from URL only."""
        try:
            response = requests.get(source_url, timeout=30)
            response.raise_for_status()
            
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                tmp.write(response.content)
                return tmp.name
                
        except Exception as e:
            print(f"[@text_helpers] Error downloading image from URL: {e}")
            raise
    
    def save_text_reference(self, text: str, reference_name: str, 
                           area: Dict[str, Any] = None) -> str:
        """Save text reference for future use."""
        try:
            timestamp = int(time.time())
            ref_filename = f'{reference_name}_{timestamp}.txt'
            ref_path = os.path.join(self.text_references_dir, ref_filename)
            
            reference_data = {
                'text': text,
                'reference_name': reference_name,
                'area': area,
                'created_at': timestamp
            }
            
            with open(ref_path, 'w', encoding='utf-8') as f:
                json.dump(reference_data, f, indent=2, ensure_ascii=False)
            
            return ref_path
            
        except Exception as e:
            print(f"[@text_helpers] Error saving text reference: {e}")
            return ""
    
    def detect_text_in_area(self, image_path: str, area: dict = None) -> Dict[str, Any]:
        """
        Core function: Detect text from image in area.
        1. Crop to area (if specified)
        2. Apply filters (greyscale + binary) 
        3. OCR text extraction
        4. Language detection
        """
        try:
            if not os.path.exists(image_path):
                return {'extracted_text': '', 'error': 'Image not found', 'image_textdetected_path': ''}
            
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                return {'extracted_text': '', 'error': 'Failed to load image', 'image_textdetected_path': ''}
            
            # Step 1: Crop to area if specified
            if area:
                x, y = int(area['x']), int(area['y'])
                w, h = int(area['width']), int(area['height'])
                
                img_height, img_width = img.shape[:2]
                if x < 0 or y < 0 or x + w > img_width or y + h > img_height:
                    return {'extracted_text': '', 'error': 'Area out of bounds', 'image_textdetected_path': ''}
                
                img = img[y:y+h, x:x+w]
            
            # Step 2: Apply filters for better OCR
            # Convert to greyscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply binarization
            _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
            
            # Save processed image to captures directory (not temp) so it can be served by host
            timestamp = int(time.time())
            processed_filename = f'text_detection_{timestamp}.png'
            processed_path = os.path.join(self.captures_path, processed_filename)
            
            # Save the cropped image (before filters) for display
            cv2.imwrite(processed_path, img)
            
            # Use the binary filtered version for OCR
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                cv2.imwrite(tmp.name, binary)
                ocr_temp_path = tmp.name
            
            # Step 3: OCR text extraction
            result = subprocess.run(
                ['tesseract', ocr_temp_path, 'stdout', '-l', 'eng'],
                capture_output=True, text=True, timeout=30
            )
            
            extracted_text = result.stdout.strip() if result.returncode == 0 else ""
            
            # Step 4: Language detection (simple)
            language = self.detect_language(extracted_text) if extracted_text else 'en'
            
            return {
                'extracted_text': extracted_text,
                'character_count': len(extracted_text),
                'word_count': len(extracted_text.split()) if extracted_text else 0,
                'language': language,
                'area': area,
                'image_textdetected_path': processed_path
            }
            
        except Exception as e:
            return {'extracted_text': '', 'error': str(e), 'image_textdetected_path': ''}
    
    def detect_language(self, text: str) -> str:
        """Simple language detection."""
        try:
            from langdetect import detect
            return detect(text) if len(text.strip()) > 3 else 'en'
        except:
            return 'en'
    
    def text_matches(self, extracted_text: str, target_text: str) -> bool:
        """Check if extracted text matches target text."""
        if not extracted_text or not target_text:
            return False
        
        extracted_clean = ' '.join(extracted_text.split()).lower()
        target_clean = ' '.join(target_text.split()).lower()
        
        return target_clean in extracted_clean


 