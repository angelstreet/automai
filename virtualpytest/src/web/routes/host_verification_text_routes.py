"""
Verification Text Host Routes

This module contains the host-side text verification API endpoints that:
- Handle text auto-detection using OCR
- Save text references to database (NEW: no more git operations)
- Execute text verification tests
"""

from flask import Blueprint, request, jsonify, current_app
import os
from datetime import datetime

# Create blueprint
verification_text_host_bp = Blueprint('verification_text_host', __name__, url_prefix='/host/verification/text')

# Path configuration constants
STREAM_BASE_PATH = '/var/www/html/stream'
CAPTURES_PATH = f'{STREAM_BASE_PATH}/captures'
CROPPED_PATH = f'{CAPTURES_PATH}/cropped'

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
        
        data = request.get_json()
        source_filename = data.get('source_filename')
        area = data.get('area')
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
    """Save text verification reference - NEW: Fast R2/Database approach like image references"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        data = request.get_json()
        reference_name = data.get('name') or data.get('reference_name')  # Handle both parameter names
        text = data.get('text')
        font_size = data.get('font_size', 12.0)
        confidence = data.get('confidence', 0.8)
        area = data.get('area')
        reference_type = data.get('reference_type', 'reference_text')
        
        print(f"[@route:host_save_text_resource] Saving text reference: {reference_name}")
        print(f"[@route:host_save_text_resource] Text: '{text}', Font size: {font_size}, Confidence: {confidence}")
        print(f"[@route:host_save_text_resource] Request data keys: {list(data.keys())}")
        
        # Validate required parameters
        if not reference_name or not text:
            return jsonify({
                'success': False,
                'error': 'reference_name (or name) and text are required'
            }), 400
        
        # ✅ NEW: Return immediately with text data for frontend to save to database via server
        # This follows the same fast pattern as image reference saving
        return jsonify({
            'success': True,
            'message': f'Text reference ready: {reference_name}',
            'reference_name': reference_name,
            'text': text,
            'font_size': font_size,
            'confidence': confidence,
            'area': area,
            'reference_type': reference_type,
            # Return text data for local use
            'text_data': {
                'text': text,
                'font_size': font_size,
                'confidence': confidence
            }
        })
            
    except Exception as e:
        print(f"[@route:host_save_text_resource] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text reference save error: {str(e)}'
        }), 500

# =====================================================
# HOST-SIDE TEXT VERIFICATION EXECUTION ENDPOINTS
# =====================================================

@verification_text_host_bp.route('/execute', methods=['POST'])
def execute_text_verification():
    """Execute single text verification on host"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        data = request.get_json()
        verification = data.get('verification')
        source_filename = data.get('source_filename')
        
        print(f"[@route:host_verification_text:execute] Executing text verification on host")
        print(f"[@route:host_verification_text:execute] Source: {source_filename}")
        
        # Validate required parameters
        if not verification or not source_filename:
            return jsonify({
                'success': False,
                'error': 'verification and source_filename are required'
            }), 400
        
        # Build source path
        source_path = f'{CAPTURES_PATH}/{source_filename}'
        
        # Check if source file exists
        if not os.path.exists(source_path):
            print(f"[@route:host_verification_text:execute] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Create results directory
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        results_dir = f'{STREAM_BASE_PATH}/verification_results/{timestamp}'
        os.makedirs(results_dir, exist_ok=True)
        
        # Execute text verification
        result = execute_text_verification_host(verification, source_path, 0, results_dir)
        
        # Convert local paths to public URLs using centralized URL builder
        from src.utils.buildUrlUtils import buildVerificationResultUrl
        
        # Get host info for URL building
        host_info = host_device  # Already available in this route
        
        if result.get('source_image_path'):
            result['source_image_url'] = buildVerificationResultUrl(host_info, result['source_image_path'])
            print(f"[@route:host_verification_text:execute] Built source URL: {result['source_image_url']}")
        if result.get('result_overlay_path'):
            result['result_overlay_url'] = buildVerificationResultUrl(host_info, result['result_overlay_path'])
            print(f"[@route:host_verification_text:execute] Built overlay URL: {result['result_overlay_url']}")
        
        print(f"[@route:host_verification_text:execute] Verification completed: {result.get('success')}")
        
        return jsonify({
            'success': True,
            'verification_result': result,
            'results_directory': buildVerificationResultUrl(host_info, results_dir),
            'timestamp': timestamp
        })
        
    except Exception as e:
        print(f"[@route:host_verification_text:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text verification execution error: {str(e)}'
        }), 500

def execute_text_verification_host(verification, source_path, verification_index, results_dir):
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
        
        # Get text from verification data directly
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