"""
Host Verification Image Routes

Host-side image verification endpoints that execute using instantiated image verification controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id, get_host
from src.utils.build_url_utils import buildHostImageUrl
import os

# Create blueprint
verification_image_host_bp = Blueprint('verification_image_host', __name__, url_prefix='/host/verification/image')

def get_verification_controller(device_id: str, controller_type: str, check_device: bool = False):
    """
    Helper function to get verification controller and handle common validation.
    
    Args:
        device_id: ID of the device
        controller_type: Type of controller ('verification_image' or 'verification_text')
        check_device: Whether to also validate device existence
        
    Returns:
        Tuple of (controller, device, error_response) where error_response is None if successful
    """
    controller = get_controller(device_id, controller_type)
    device = None
    
    if not controller:
        error_response = jsonify({
            'success': False,
            'error': f'No {controller_type} controller found for device {device_id}'
        }), 404
        return None, None, error_response
    
    if check_device:
        device = get_device_by_id(device_id)
        if not device:
            error_response = jsonify({
                'success': False,
                'error': f'Device {device_id} not found'
            }), 404
            return None, None, error_response
    
    return controller, device, None

@verification_image_host_bp.route('/cropImage', methods=['POST'])
def crop_area():
    """Crop area from image for verification"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_crop_area] Host cropping request for device: {device_id}")
        
        # Get image verification controller and device info
        image_controller, device, error_response = get_verification_controller(device_id, 'verification_image', check_device=True)
        if error_response:
            return error_response
        
        # Controller handles everything
        result = image_controller.crop_image(data)
        
        # Build image URL for frontend preview using host instance
        if result.get('success') and result.get('image_cropped_path'):
            host = get_host()
            result['image_cropped_url'] = buildHostImageUrl(host.to_dict(), result['image_cropped_path'])
            print(f"[@route:host_crop_area] Built image cropped URL: {result['image_cropped_url']}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_crop_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host cropping error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/processImage', methods=['POST'])
def process_area():
    """Process image for verification"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_process_area] Host processing request for device: {device_id}")
        
        # Get image verification controller and device info
        image_controller, device, error_response = get_verification_controller(device_id, 'verification_image', check_device=True)
        if error_response:
            return error_response
        
        result = image_controller.process_image(data)
        
        # Build image URL for frontend preview using host instance
        if result.get('success') and result.get('image_filtered_path'):
            host = get_host()
            result['image_filtered_url'] = buildHostImageUrl(host.to_dict(), result['image_filtered_path'])
            print(f"[@route:host_process_area] Built image filtered URL: {result['image_filtered_url']}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_process_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host processing error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/saveImage', methods=['POST'])
def save_resource():
    """Save image verification reference"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_save_resource] Save image reference request for device: {device_id}")
        
        # Get image verification controller and device info
        image_controller, device, error_response = get_verification_controller(device_id, 'verification_image', check_device=True)
        if error_response:
            return error_response
        
        result = image_controller.save_image(data)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_save_resource] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Image save error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/execute', methods=['POST'])
def execute_image_verification():
    """Execute single image verification on host"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_verification_image:execute] Executing image verification for device: {device_id}")
        
        # Get image verification controller
        image_controller, _, error_response = get_verification_controller(device_id, 'verification_image')
        if error_response:
            return error_response
        
        verification = data.get('verification')
        model = data.get('model')  # Get model from request
        image_source_url = data.get('image_source_url')  # Get source image URL if provided
        
        # Convert image_source_url to local file path if provided
        source_image_path = None
        if image_source_url:
            print(f"[@route:host_verification_image:execute] Image source URL provided: {image_source_url}")
            try:
                # Use centralized URL conversion function
                from src.utils.build_url_utils import convertHostUrlToLocalPath
                source_image_path = convertHostUrlToLocalPath(image_source_url)
                
                print(f"[@route:host_verification_image:execute] Converted to local path: {source_image_path}")
                
                # Verify the file exists - if not, FAIL immediately (no fallback)
                if os.path.exists(source_image_path):
                    print(f"[@route:host_verification_image:execute] Source image file exists, using provided image")
                else:
                    error_msg = f"Source image file not found: {source_image_path}. No fallback allowed."
                    print(f"[@route:host_verification_image:execute] ERROR: {error_msg}")
                    return jsonify({
                        'success': False,
                        'error': error_msg,
                        'verification_type': 'image',
                        'resultType': 'ERROR'
                    }), 400
                    
            except Exception as e:
                error_msg = f"Error processing image_source_url: {e}"
                print(f"[@route:host_verification_image:execute] ERROR: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': error_msg,
                    'verification_type': 'image',
                    'resultType': 'ERROR'
                }), 400
        
        # Prepare verification config
        verification_config = {
            'command': verification.get('command', 'waitForImageToAppear'),
            'params': {
                'image_path': verification.get('params', {}).get('image_path', ''),
                'threshold': verification.get('params', {}).get('threshold', 0.8),
                'timeout': verification.get('params', {}).get('timeout', 10.0),
                'area': verification.get('params', {}).get('area'),
                'image_filter': verification.get('params', {}).get('image_filter', 'none'),
                'model': model  # Pass model to controller
            }
        }
        
        # Add source image path if available
        if source_image_path:
            verification_config['source_image_path'] = source_image_path
        
        # Execute verification using controller
        verification_result = image_controller.execute_verification(verification_config)
        
        print(f"[@route:host_verification_image:execute] Verification result: {verification_result}")
        
        # Build URLs from file paths if verification generated images
        if verification_result.get('success') and 'source_image_path' in verification_result.get('details', {}):
            from src.utils.build_url_utils import buildVerificationResultUrl
            
            # Get host info for URL building
            host = get_host()
            host_info = host.to_dict() if host else None
            
            details = verification_result.get('details', {})
            
            # Build URLs for the generated images using frontend-expected property names
            if details.get('source_image_path'):
                filename = os.path.basename(details['source_image_path'])
                verification_result['sourceUrl'] = buildVerificationResultUrl(host_info, filename, device_id)
            
            if details.get('reference_image_path'):
                filename = os.path.basename(details['reference_image_path'])
                verification_result['referenceUrl'] = buildVerificationResultUrl(host_info, filename, device_id)
                
            if details.get('result_overlay_path'):
                filename = os.path.basename(details['result_overlay_path'])
                verification_result['overlayUrl'] = buildVerificationResultUrl(host_info, filename, device_id)
            
            print(f"[@route:host_verification_image:execute] Built URLs:")
            print(f"  Source: {verification_result.get('sourceUrl')}")
            print(f"  Reference: {verification_result.get('referenceUrl')}")
            print(f"  Overlay: {verification_result.get('overlayUrl')}")
        
        # Build clean response with frontend-expected properties
        result = {
            'success': verification_result.get('success', False),
            'message': verification_result.get('message', 'Unknown result'),
            'verification_type': 'image',
            'resultType': 'PASS' if verification_result.get('success') else 'FAIL',
            'matchingResult': verification_result.get('matching_result', 0.0),  # Actual confidence
            'userThreshold': verification_result.get('user_threshold', 0.8),    # User's threshold
            'imageFilter': verification_result.get('image_filter', 'none'),     # Applied filter
            'sourceUrl': verification_result.get('sourceUrl'),                  # Frontend-expected names
            'referenceUrl': verification_result.get('referenceUrl'),
            'overlayUrl': verification_result.get('overlayUrl')
        }
        
        print(f"[@route:host_verification_image:execute] Final result: {result}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_verification_image:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Image verification execution error: {str(e)}'
        }), 500 