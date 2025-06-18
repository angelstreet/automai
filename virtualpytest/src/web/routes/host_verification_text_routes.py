"""
Verification Text Host Routes

This module contains the host-side text verification API endpoints that:
- Handle text auto-detection using OCR
- Save text references to git repository
- Execute text verification tests
"""

from flask import Blueprint, request, jsonify, current_app
import os
import json
import subprocess
from datetime import datetime

# Create blueprint
verification_text_host_bp = Blueprint('verification_text_host', __name__, url_prefix='/host/verification/text')

# Host configuration
HOST_IP = "77.56.53.130"
HOST_PORT = "5119"
CLIENT_URL = "https://77.56.53.130:444"  # Nginx-exposed URL

# Path configuration constants
STREAM_BASE_PATH = '/var/www/html/stream'
CAPTURES_PATH = f'{STREAM_BASE_PATH}/captures'
CROPPED_PATH = f'{CAPTURES_PATH}/cropped'
RESOURCES_BASE_PATH = '../resources'
RESOURCE_JSON_PATH = '../config/resource/resource.json'

# =====================================================
# HOST-SIDE TEXT AUTO-DETECTION ENDPOINT
# =====================================================

@verification_text_host_bp.route('/auto-detect-text', methods=['POST'])
def text_auto_detect():
    """Auto-detect text elements in the current screen"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        print(f"[@route:host_text_auto_detect] Using host device: {host_device.get('host_name')} - {host_device.get('device_name')}")
        
        data = request.get_json()
        source_filename = data.get('source_filename')
        area = data.get('area')
        model = data.get('model', 'default')
        image_filter = data.get('image_filter', 'none')
        
        print(f"[@route:host_text_auto_detect] Text auto-detection request: {source_filename}")
        print(f"[@route:host_text_auto_detect] Area: {area}, Filter: {image_filter}")
        
        # Validate required parameters
        if not source_filename or not area:
            return jsonify({
                'success': False,
                'error': 'source_filename and area are required'
            }), 400
        
        # Build source path
        source_path = f'{CAPTURES_PATH}/{source_filename}'
        
        # Build target path for cropped preview in dedicated cropped folder
        cropped_dir = CROPPED_PATH
        os.makedirs(cropped_dir, exist_ok=True)  # Ensure cropped directory exists
        
        # Extract base name without extension
        base_name = source_filename.replace('.jpg', '').replace('.png', '')
        target_filename = f'text_detect_{base_name}.jpg'
        target_path = f'{cropped_dir}/{target_filename}'
        
        print(f"[@route:host_text_auto_detect] Cropping from {source_path} to {target_path}")
        
        # Check if source file exists
        if not os.path.exists(source_path):
            print(f"[@route:host_text_auto_detect] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Use image controller for cropping
        try:
            from src.utils.host_utils import get_local_controller
            
            # Get image verification controller
            image_controller = get_local_controller('verification_image')
            if not image_controller:
                print(f"[@route:host_text_auto_detect] Image controller not available")
                return jsonify({
                    'success': False,
                    'error': 'Image controller not available'
                }), 500
            
            # Crop the image area using controller
            success = image_controller.crop_image(source_path, target_path, area)
            
            if success:
                print(f"Reference image saved successfully: {target_path}")
            else:
                print(f"[@route:host_text_auto_detect] Cropping failed")
                return jsonify({
                    'success': False,
                    'error': 'Failed to crop image for text detection'
                }), 500
                
        except ImportError as e:
            print(f"[@route:host_text_auto_detect] Import error: {e}")
            return jsonify({
                'success': False,
                'error': 'Cropping utilities not available'
            }), 500
        
        # Apply image filter if specified (can improve OCR accuracy)
        if image_filter and image_filter != 'none':
            print(f"[@route:host_text_auto_detect] Applying {image_filter} filter for better OCR")
            if not image_controller.apply_filter(target_path, image_filter):
                print(f"[@route:host_text_auto_detect] Warning: Failed to apply {image_filter} filter")
        
        # Perform OCR with detailed confidence data
        try:
            import cv2
            import pytesseract
            
            # Load the cropped image
            img = cv2.imread(target_path)
            if img is None:
                print(f"[@route:host_text_auto_detect] Failed to load cropped image")
                return jsonify({
                    'success': False,
                    'error': 'Failed to load cropped image for OCR'
                }), 500
            
            print(f"[@route:host_text_auto_detect] Performing detailed OCR...")
            
            # Get detailed OCR data with confidence
            try:
                ocr_data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, lang='eng')
                detected_text = pytesseract.image_to_string(img, lang='eng').strip()
                
                # Calculate average confidence for detected text
                confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                
                # Estimate font size from OCR data
                heights = [int(h) for h in ocr_data['height'] if int(h) > 0]
                avg_font_size = sum(heights) / len(heights) if heights else 12.0
                
                print(f"[@route:host_text_auto_detect] OCR successful: '{detected_text}' (confidence: {avg_confidence:.1f}%)")
                
            except Exception as ocr_error:
                print(f"[@route:host_text_auto_detect] Detailed OCR failed, trying fallback: {str(ocr_error)}")
                
                # Fallback to simple OCR
                try:
                    detected_text = pytesseract.image_to_string(img, lang='eng').strip()
                    avg_confidence = 50.0  # Default confidence for fallback
                    avg_font_size = 12.0   # Default font size
                    print(f"[@route:host_text_auto_detect] Fallback OCR: '{detected_text}'")
                except Exception as fallback_error:
                    print(f"[@route:host_text_auto_detect] Error: {str(fallback_error)}")
                    return jsonify({
                        'success': False,
                        'error': str(fallback_error),
                        'preview_url': f'/host/stream/captures/cropped/{target_filename}'  # Still provide preview
                    }), 500
            
            # Attempt language detection
            detected_language = 'eng'
            detected_language_name = 'English'
            language_confidence = 0.8
            
            if detected_text and len(detected_text.strip()) > 3:
                try:
                    from langdetect import detect, detect_langs
                    detected_lang = detect(detected_text)
                    detected_language = detected_lang
                    
                    # Map common language codes to names
                    lang_names = {
                        'en': 'English', 'fr': 'French', 'es': 'Spanish', 'de': 'German',
                        'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
                        'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic'
                    }
                    detected_language_name = lang_names.get(detected_lang, detected_lang.capitalize())
                    
                    # Get confidence for detected language
                    lang_probs = detect_langs(detected_text)
                    if lang_probs:
                        language_confidence = lang_probs[0].prob
                    
                    print(f"[@route:host_text_auto_detect] Language detected: {detected_language_name} ({language_confidence:.2f})")
                    
                except ImportError:
                    print(f"[@route:host_text_auto_detect] Language detection not available (langdetect not installed)")
                except Exception as lang_error:
                    print(f"[@route:host_text_auto_detect] Language detection failed: {str(lang_error)}")
            
            # Return URL path for the preview image
            preview_url = f'/stream/captures/cropped/{target_filename}'
            
            # Check if we have meaningful text (confidence threshold)
            if avg_confidence >= 30 and detected_text.strip():
                print(f"[@route:host_text_auto_detect] Text auto-detection successful")
                return jsonify({
                    'success': True,
                    'detected_text': detected_text,
                    'confidence': avg_confidence,
                    'font_size': avg_font_size,
                    'detected_language': detected_language,
                    'detected_language_name': detected_language_name,
                    'language_confidence': language_confidence,
                    'preview_url': preview_url,
                    'message': f'Text detected with {avg_confidence:.1f}% confidence'
                })
            else:
                print(f"[@route:host_text_auto_detect] Low confidence or no text detected")
                return jsonify({
                    'success': False,
                    'error': f'No reliable text detected (confidence: {avg_confidence:.1f}%)',
                    'detected_text': detected_text,
                    'confidence': avg_confidence,
                    'preview_url': preview_url
                }), 400
                
        except ImportError as e:
            print(f"[@route:host_text_auto_detect] OCR libraries not available: {e}")
            return jsonify({
                'success': False,
                'error': 'OCR libraries not available (pytesseract/cv2 not installed)',
                'preview_url': f'/stream/captures/cropped/{target_filename}'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_text_auto_detect] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text auto-detection error: {str(e)}'
        }), 500

# =====================================================
# HOST-SIDE TEXT REFERENCE SAVE ENDPOINT
# =====================================================

@verification_text_host_bp.route('/save-text-reference', methods=['POST'])
def save_text_resource():
    """Save text verification reference"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        print(f"[@route:host_save_text_resource] Using host device: {host_device.get('host_name')} - {host_device.get('device_name')}")
        
        data = request.get_json()
        name = data.get('name')  # Client sends 'name' instead of 'reference_name'
        model = data.get('model')
        text = data.get('text')
        font_size = data.get('font_size', 12.0)
        confidence = data.get('confidence', 0.8)
        area = data.get('area')
        
        print(f"[@route:host_save_text_resource] Saving text reference: {name} for model: {model}")
        print(f"[@route:host_save_text_resource] Text: '{text}', Font size: {font_size}, Confidence: {confidence}")
        
        # Validate required parameters
        if not name or not model or not text:
            return jsonify({
                'success': False,
                'error': 'name, model, and text are required'
            }), 400
        
        # Build resource directory path
        resource_dir = f'{RESOURCES_BASE_PATH}/{model}'
        os.makedirs(resource_dir, exist_ok=True)
        
        # Build resource JSON path
        resource_json_path = RESOURCE_JSON_PATH
        os.makedirs(os.path.dirname(resource_json_path), exist_ok=True)
        
        # Load existing resource data or create new
        resource_data = {'resources': []}
        if os.path.exists(resource_json_path):
            try:
                with open(resource_json_path, 'r') as f:
                    resource_data = json.load(f)
            except json.JSONDecodeError:
                print(f"[@route:host_save_text_resource] Warning: Invalid JSON in {resource_json_path}, creating new")
                resource_data = {'resources': []}
        
        # Remove existing resource with same name and model (update case)
        resource_data['resources'] = [
            r for r in resource_data['resources'] 
            if not (r.get('name') == name and r.get('model') == model)
        ]
        
        # Create new text reference entry
        new_resource = {
            'name': name,
            'model': model,
            'type': 'text_reference',  # Different type for text references
            'text': text,
            'font_size': font_size,
            'confidence': confidence,
            'area': area,
            'created_at': datetime.now().isoformat(),
            'path': f'resources/{model}',  # Directory path (no specific file for text)
            'full_path': f'/var/www/html/stream/resources/{model}'
        }
        
        # Add new resource
        resource_data['resources'].append(new_resource)
        
        # Save updated resource data
        with open(resource_json_path, 'w') as f:
            json.dump(resource_data, f, indent=2)
        
        print(f"[@route:host_save_text_resource] Text reference saved to JSON: {name}")
        
        # Perform git operations
        try:
            # Change to the parent directory for git operations
            original_cwd = os.getcwd()
            os.chdir('..')
            
            print(f"[@route:host_save_text_resource] Performing git operations...")
            
            # Git pull to get latest changes
            subprocess.run(['git', 'pull'], check=True, capture_output=True, text=True)
            
            # Git add the resource file
            subprocess.run(['git', 'add', 'config/resource/resource.json'], check=True, capture_output=True, text=True)
            
            # Git commit with descriptive message
            commit_message = f'Add text reference: {name} for {model}'
            subprocess.run(['git', 'commit', '-m', commit_message], check=True, capture_output=True, text=True)
            
            # Git push with authentication
            github_token = os.getenv('GITHUB_TOKEN')
            if github_token:
                # Use token for authentication
                subprocess.run(['git', 'push'], check=True, capture_output=True, text=True)
                print(f"[@route:host_save_text_resource] Git operations completed successfully")
            else:
                print(f"[@route:host_save_text_resource] Warning: GITHUB_TOKEN not set, skipping push")
            
            # Return to original directory
            os.chdir(original_cwd)
            
            # Return success with resource path
            return jsonify({
                'success': True,
                'message': f'Text reference saved and committed: {name}',
                'public_url': f'/resources/{model}',  # Generic path for text references
                'resource_type': 'text_reference'
            })
            
        except subprocess.CalledProcessError as git_error:
            os.chdir(original_cwd)  # Ensure we return to original directory
            print(f"[@route:host_save_text_resource] Git operation failed: {git_error}")
            return jsonify({
                'success': False,
                'error': f'Git operation failed: {str(git_error)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_save_text_resource] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text reference save error: {str(e)}'
        }), 500

# =====================================================
# HOST-SIDE TEXT VERIFICATION EXECUTION
# =====================================================

def execute_text_verification_host(verification, source_path, model, verification_index, results_dir):
    """Execute text verification using verification controllers."""
    try:
        import cv2
        import pytesseract
        import shutil
        from src.utils.host_utils import get_local_controller
        
        # Get image verification controller
        image_controller = get_local_controller('verification_image')
        if not image_controller:
            return {
                'success': False,
                'error': 'Image verification controller not available'
            }
        
        params = verification.get('params', {})
        area = params.get('area')
        
        # NEW: Get text from multiple possible sources
        text_to_find = (params.get('reference_text') or 
                       verification.get('inputValue', '') or 
                       params.get('text', ''))
        
        confidence = params.get('confidence', 0.8)
        image_filter = params.get('image_filter', 'none')
        
        print(f"[@route:execute_text_verification_host] Text to find: '{text_to_find}'")
        print(f"[@route:execute_text_verification_host] Area: {area}")
        
        if not text_to_find:
            return {
                'success': False,
                'error': 'No text specified for verification'
            }
        
        # Create result file paths
        source_result_path = f'{results_dir}/source_image_{verification_index}.png'
        overlay_result_path = f'{results_dir}/result_overlay_{verification_index}.png'
        
        # Crop source image to area if specified
        if area:
            success = image_controller.crop_image(source_path, source_result_path, area)
            if not success:
                return {
                    'success': False,
                    'error': 'Failed to crop source image'
                }
        else:
            # Copy full source image using controller
            success = image_controller.copy_image(source_path, source_result_path)
            if not success:
                return {
                    'success': False,
                    'error': 'Failed to copy source image'
                }
        
        # Apply filter to source image if user selected one (can improve OCR accuracy)
        if image_filter and image_filter != 'none':
            print(f"[@route:execute_text_verification_host] Applying {image_filter} filter to source image for OCR")
            if not image_controller.apply_filter(source_result_path, image_filter):
                print(f"[@route:execute_text_verification_host] Warning: Failed to apply {image_filter} filter to source")

        # Load image for OCR
        img = cv2.imread(source_result_path)
        if img is None:
            return {
                'success': False,
                'error': 'Failed to load image for OCR'
            }
        
        # Extract text using OCR
        try:
            extracted_text = pytesseract.image_to_string(img, lang='eng').strip()
            print(f"[@route:execute_text_verification_host] Extracted text: '{extracted_text}'")
        except Exception as ocr_error:
            return {
                'success': False,
                'error': f'OCR failed: {str(ocr_error)}'
            }
        
        # Check if text matches (case-insensitive contains)
        verification_success = text_to_find.lower() in extracted_text.lower()
        
        # Create result overlay image
        overlay_img = img.copy()
        if verification_success:
            cv2.putText(overlay_img, f'TEXT FOUND: "{text_to_find}"', (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(overlay_img, f'Extracted: "{extracted_text[:50]}..."', (10, 60), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        else:
            cv2.putText(overlay_img, f'TEXT NOT FOUND: "{text_to_find}"', (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.putText(overlay_img, f'Extracted: "{extracted_text[:50]}..."', (10, 60), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        
        cv2.imwrite(overlay_result_path, overlay_img)
        
        message = f'Text verification {"passed" if verification_success else "failed"}: {"found" if verification_success else "not found"} "{text_to_find}"'
        
        return {
            'success': verification_success,
            'message': message,
            'extracted_text': extracted_text,
            'searched_text': text_to_find,
            'source_image_path': source_result_path,
            'result_overlay_path': overlay_result_path,
            'verification_type': 'text'
        }
        
    except Exception as e:
        print(f"[@route:execute_text_verification_host] Error: {str(e)}")
        return {
            'success': False,
            'error': f'Text verification error: {str(e)}'
        } 