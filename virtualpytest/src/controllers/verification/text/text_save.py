"""
Text Saving Operations Mixin

Provides saving reference images and text verification results.
"""

import os
import cv2
import shutil
import time
from typing import Dict, Any


class TextSaveMixin:
    """Mixin providing text verification saving operations."""
    
    def _save_cropped_source_image(self, source_image_path: str, area: dict, model: str, verification_index: int) -> str:
        """
        Save a cropped version of the source image for UI comparison display.
        
        Args:
            source_image_path: Path to the source image
            area: Area to crop {x, y, width, height}
            model: Model name for directory organization
            verification_index: Index of verification for naming
            
        Returns:
            Path to saved cropped image or None if failed
        """
        try:
            # Create results directory
            results_dir = '/var/www/html/stream/verification_results'
            os.makedirs(results_dir, exist_ok=True)
            
            # Use consistent naming: source_cropped_{verification_index}.png
            cropped_source_path = os.path.join(results_dir, f'source_cropped_{verification_index}.png')
            
            # Read and crop source image using OpenCV
            img = cv2.imread(source_image_path)
            if img is None:
                print(f"[@text_save] Could not read source image: {source_image_path}")
                return None
                
            # Extract area coordinates
            x = int(area['x'])
            y = int(area['y'])
            width = int(area['width'])
            height = int(area['height'])
            
            # Ensure coordinates are within image bounds
            img_height, img_width = img.shape[:2]
            x = max(0, min(x, img_width - 1))
            y = max(0, min(y, img_height - 1))
            width = min(width, img_width - x)
            height = min(height, img_height - y)
            
            # Crop the image
            cropped_img = img[y:y+height, x:x+width]
            
            # Save cropped image
            success = cv2.imwrite(cropped_source_path, cropped_img)
            
            if success:
                print(f"[@text_save] Saved cropped source image: {cropped_source_path}")
                # Automatically create greyscale and binary versions
                self._create_filtered_versions(cropped_source_path)
                return cropped_source_path
            else:
                print(f"[@text_save] Failed to save cropped source image")
                return None
                
        except Exception as e:
            print(f"[@text_save] Error saving cropped source image: {e}")
            return None
    
    def _save_source_image_for_comparison(self, source_image_path: str, model: str, verification_index: int) -> str:
        """
        Save the full source image for comparison display in UI.
        
        Args:
            source_image_path: Path to the source image
            model: Model name for directory organization  
            verification_index: Index of verification for naming
            
        Returns:
            Path to saved source image or None if failed
        """
        try:
            # Create results directory
            results_dir = '/var/www/html/stream/verification_results'
            os.makedirs(results_dir, exist_ok=True)
            
            # Use consistent naming: source_{verification_index}.png
            saved_source_path = os.path.join(results_dir, f'source_{verification_index}.png')
            
            # Copy source image to results directory
            shutil.copy2(source_image_path, saved_source_path)
            
            print(f"[@text_save] Saved source image: {saved_source_path}")
            # Automatically create greyscale and binary versions
            self._create_filtered_versions(saved_source_path)
            
            return saved_source_path
            
        except Exception as e:
            print(f"[@text_save] Error saving source image for comparison: {e}")
            return None
    
    def _save_text_reference(self, text: str, reference_name: str, model: str, 
                            area: dict, font_size: float = 12.0, confidence: float = 0.8) -> str:
        """
        Save a text reference for future verification use.
        
        Args:
            text: The reference text
            reference_name: Name for the reference
            model: Model/device identifier
            area: Area where text was found
            font_size: Detected font size
            confidence: Detection confidence
            
        Returns:
            str: Path to saved reference file
        """
        try:
            # Create references directory
            references_dir = f'/var/www/html/stream/text_references/{model}'
            os.makedirs(references_dir, exist_ok=True)
            
            # Create reference filename
            timestamp = int(time.time())
            ref_filename = f'{reference_name}_{timestamp}.txt'
            ref_path = os.path.join(references_dir, ref_filename)
            
            # Create reference data
            reference_data = {
                'text': text,
                'reference_name': reference_name,
                'model': model,
                'area': area,
                'font_size': font_size,
                'confidence': confidence,
                'created_at': timestamp
            }
            
            # Save reference as JSON
            import json
            with open(ref_path, 'w', encoding='utf-8') as f:
                json.dump(reference_data, f, indent=2, ensure_ascii=False)
            
            print(f"[@text_save] Saved text reference: {ref_path}")
            return ref_path
            
        except Exception as e:
            print(f"[@text_save] Error saving text reference: {e}")
            return ""
    
    def _save_verification_result(self, result_data: Dict[str, Any], verification_index: int) -> str:
        """
        Save verification result data to file.
        
        Args:
            result_data: Verification result information
            verification_index: Index for naming
            
        Returns:
            str: Path to saved result file
        """
        try:
            # Create results directory
            results_dir = '/var/www/html/stream/verification_results'
            os.makedirs(results_dir, exist_ok=True)
            
            # Create result filename
            result_filename = f'text_verification_{verification_index}.json'
            result_path = os.path.join(results_dir, result_filename)
            
            # Add timestamp to result data
            result_data['saved_at'] = int(time.time())
            result_data['verification_index'] = verification_index
            
            # Save result as JSON
            import json
            with open(result_path, 'w', encoding='utf-8') as f:
                json.dump(result_data, f, indent=2, ensure_ascii=False)
            
            print(f"[@text_save] Saved verification result: {result_path}")
            return result_path
            
        except Exception as e:
            print(f"[@text_save] Error saving verification result: {e}")
            return "" 