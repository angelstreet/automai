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

# Path configuration constants - now dynamic based on device
# These will be replaced by device-specific path functions

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
        
        # Get device-specific paths
        from src.utils.buildUrlUtils import get_device_local_captures_path, get_current_device_id
        
        device_id = get_current_device_id()
        captures_path = get_device_local_captures_path(host_device, device_id)
        cropped_dir = f'{captures_path}/cropped'
        
        print(f"[@route:host_text_auto_detect] Using device_id: {device_id}")
        print(f"[@route:host_text_auto_detect] Using captures_path: {captures_path}")
        
        # Build source path
        source_path = f'{captures_path}/{source_filename}'
        
        # Build target path for cropped preview in dedicated cropped folder
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
                    
                    # Build device-specific preview URL
                    from src.utils.buildUrlUtils import _get_device_capture_path
                    capture_path = _get_device_capture_path(host_device, device_id)
                    preview_url = f'{capture_path}/cropped/{target_filename}'
                    
                    return jsonify({
                        'success': False,
                        'error': str(fallback_error),
                        'preview_url': preview_url  # Device-specific preview URL
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
            from src.utils.buildUrlUtils import _get_device_capture_path
            capture_path = _get_device_capture_path(host_device, device_id)
            preview_url = f'{capture_path}/cropped/{target_filename}'
            
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
                
                # Build device-specific preview URL for low confidence case
                from src.utils.buildUrlUtils import _get_device_capture_path
                capture_path = _get_device_capture_path(host_device, device_id)
                preview_url = f'{capture_path}/cropped/{target_filename}'
                
                return jsonify({
                    'success': False,
                    'error': f'No reliable text detected (confidence: {avg_confidence:.1f}%)',
                    'detected_text': detected_text,
                    'confidence': avg_confidence,
                    'preview_url': preview_url
                }), 400
                
        except ImportError as e:
            print(f"[@route:host_text_auto_detect] OCR libraries not available: {e}")
            
            # Build device-specific preview URL for error case
            from src.utils.buildUrlUtils import _get_device_capture_path
            capture_path = _get_device_capture_path(host_device, device_id)
            preview_url = f'{capture_path}/cropped/{target_filename}'
            
            return jsonify({
                'success': False,
                'error': 'OCR libraries not available (pytesseract/cv2 not installed)',
                'preview_url': preview_url
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
        source_filename = data.get('source_filename')  # Optional - controller will take screenshot if None
        
        print(f"[@route:host_verification_text:execute] Executing text verification on host")
        print(f"[@route:host_verification_text:execute] Source: {source_filename}")
        
        # Validate required parameters - only verification is required, source_filename is optional
        if not verification:
            return jsonify({
                'success': False,
                'error': 'verification is required'
            }), 400
        
        # Use centralized VerificationController instead of custom logic
        from src.controllers.verification_controller import get_verification_controller
        
        verification_controller = get_verification_controller(host_device)
        
        # Convert source_filename to source_path if provided (using device-specific path)
        source_path = None
        if source_filename:
            from src.utils.buildUrlUtils import get_device_local_captures_path, get_current_device_id
            device_id = get_current_device_id()
            captures_path = get_device_local_captures_path(host_device, device_id)
            source_path = f'{captures_path}/{source_filename}'
            print(f"[@route:host_verification_text:execute] Using device-specific source path: {source_path} (device_id: {device_id})")
        
        result = verification_controller.execute_verification(verification, 
                                                            source_path=source_path)
        
        print(f"[@route:host_verification_text:execute] Verification completed: {result.get('success')}")
        
        return jsonify({
            'success': True,
            'verification_result': result
        })
        
    except Exception as e:
        print(f"[@route:host_verification_text:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text verification execution error: {str(e)}'
        }), 500 