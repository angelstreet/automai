"""
Verification Image Host Routes

This module contains the host-side image verification API endpoints that:
- Handle actual image cropping using existing utilities
- Process images with autocrop and background removal
- Serve cropped images from local storage
- Execute image verification tests
"""

from flask import Blueprint, request, jsonify, current_app
import os
import json
import time
from datetime import datetime
from src.utils.host_utils import get_local_controller
from src.utils.cloudflare_utils import download_reference_image

# Create blueprint
verification_image_host_bp = Blueprint('verification_image_host', __name__, url_prefix='/host/verification/image')


# Path configuration constants
STREAM_BASE_PATH = '/var/www/html/stream'
CAPTURES_PATH = f'{STREAM_BASE_PATH}/captures'
CROPPED_PATH = f'{CAPTURES_PATH}/cropped'
RESOURCES_PATH = f'{STREAM_BASE_PATH}/resources'


# =====================================================
# HOST-SIDE IMAGE CROPPING AND PROCESSING ENDPOINTS
# =====================================================

@verification_image_host_bp.route('/crop-image', methods=['POST'])
def crop_area():
    """Crop area from image for verification"""
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
        source_path = data.get('source_path')
        area = data.get('area')
        reference_name = data.get('reference_name', 'cropped')
        
        print(f"[@route:host_crop_area] Host cropping request with area: {area}")
        print(f"[@route:host_crop_area] Source filename: {source_filename}, Source path: {source_path}")
        
        # Validate required parameters - need either source_filename or source_path
        if not area:
            return jsonify({
                'success': False,
                'error': 'area is required'
            }), 400
        
        # Determine source path
        if source_path:
            # Extract filename from URL if it's a full URL
            if source_path.startswith('http'):
                # Extract filename from URL like "http://localhost:5009/images/screenshot/android_mobile.jpg?t=1749217510777"
                from urllib.parse import urlparse
                parsed_url = urlparse(source_path)
                source_filename = parsed_url.path.split('/')[-1].split('?')[0]
                final_source_path = f'{CAPTURES_PATH}/{source_filename}'
            else:
                # Use source_path directly if it's a file path
                final_source_path = source_path
        elif source_filename:
            # Build source path from filename
            final_source_path = f'{CAPTURES_PATH}/{source_filename}'
        else:
            return jsonify({
                'success': False,
                'error': 'Either source_filename or source_path is required'
            }), 400
        
        # Build target path for cropped image in dedicated cropped folder
        cropped_dir = CROPPED_PATH
        os.makedirs(cropped_dir, exist_ok=True)  # Ensure cropped directory exists
        
        # Extract timestamp from original screenshot filename (last part after splitting by _)
        base_name = source_filename.replace('.jpg', '').replace('.png', '')
        timestamp = base_name.split('_')[-1]
        target_filename = f'cropped_{reference_name}_{timestamp}.jpg'
            
        target_path = f'{cropped_dir}/{target_filename}'
        
        print(f"[@route:host_crop_area] Cropping from {final_source_path} to {target_path}")
        
        # Check if source file exists
        if not os.path.exists(final_source_path):
            print(f"[@route:host_crop_area] Source file not found: {final_source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {final_source_path}'
            }), 404
        
        # Use image controller for cropping
        try:
            from src.utils.host_utils import get_local_controller
            
            # Get image verification controller
            image_controller = get_local_controller('verification_image')
            if not image_controller:
                print(f"[@route:host_crop_area] Image controller not available")
                return jsonify({
                    'success': False,
                    'error': 'Image controller not available'
                }), 500
            
            # Crop the image using controller
            success = image_controller.crop_image(final_source_path, target_path, area)
            
            if success:
                print(f"[@route:host_crop_area] Cropping successful: {target_filename}")
                
                # Build complete URL for the cropped image (for temporary preview)
                from src.utils.buildUrlUtils import buildCroppedImageUrl
                host_info = host_device
                cropped_image_url = buildCroppedImageUrl(host_info, target_filename)
                print(f"[@route:host_crop_area] Built cropped image URL: {cropped_image_url}")
                
                return jsonify({
                    'success': True,
                    'filename': target_filename,
                    'image_url': cropped_image_url,  # Complete URL for frontend
                    'message': f'Image cropped successfully: {reference_name}'
                })
            else:
                print(f"[@route:host_crop_area] Cropping failed")
                return jsonify({
                    'success': False,
                    'error': 'Failed to crop image'
                }), 500
                
        except ImportError as e:
            print(f"[@route:host_crop_area] Import error: {e}")
            return jsonify({
                'success': False,
                'error': 'Cropping utilities not available'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_crop_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host cropping error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/process-image', methods=['POST'])
def process_area():
    """Process image for verification"""
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
        source_path = data.get('source_path')
        area = data.get('area')
        reference_name = data.get('reference_name', 'processed')
        autocrop = data.get('autocrop', False)
        remove_background = data.get('remove_background', False)
        
        print(f"[@route:host_process_area] Host processing request with area: {area}")
        print(f"[@route:host_process_area] Source filename: {source_filename}, Source path: {source_path}")
        print(f"[@route:host_process_area] Processing options: autocrop={autocrop}, remove_background={remove_background}")
        
        # Validate required parameters - need either source_filename or source_path
        if not area:
            return jsonify({
                'success': False,
                'error': 'area is required'
            }), 400
        
        # Determine source path
        if source_path:
            # Extract filename from URL if it's a full URL
            if source_path.startswith('http'):
                # Extract filename from URL like "http://localhost:5009/images/screenshot/android_mobile.jpg?t=1749217510777"
                from urllib.parse import urlparse
                parsed_url = urlparse(source_path)
                source_filename = parsed_url.path.split('/')[-1].split('?')[0]
                final_source_path = f'{CAPTURES_PATH}/{source_filename}'
            else:
                # Use source_path directly if it's a file path
                final_source_path = source_path
        elif source_filename:
            # Build source path from filename
            final_source_path = f'{CAPTURES_PATH}/{source_filename}'
        else:
            return jsonify({
                'success': False,
                'error': 'Either source_filename or source_path is required'
            }), 400
        
        # Build target path for processed image in dedicated cropped folder
        cropped_dir = CROPPED_PATH
        os.makedirs(cropped_dir, exist_ok=True)  # Ensure cropped directory exists
        
        # Extract timestamp from original screenshot filename (last part after splitting by _)
        base_name = source_filename.replace('.jpg', '').replace('.png', '')
        timestamp = base_name.split('_')[-1]
        target_filename = f'processed_{reference_name}_{timestamp}.jpg'
            
        target_path = f'{cropped_dir}/{target_filename}'
        
        print(f"[@route:host_process_area] Processing from {final_source_path} to {target_path}")
        
        # Check if source file exists
        if not os.path.exists(final_source_path):
            print(f"[@route:host_process_area] Source file not found: {final_source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {final_source_path}'
            }), 404
        
        # Use image controller for processing
        try:
            from src.utils.host_utils import get_local_controller
            
            # Get image verification controller
            image_controller = get_local_controller('verification_image')
            if not image_controller:
                print(f"[@route:host_process_area] Image controller not available")
                return jsonify({
                    'success': False,
                    'error': 'Image controller not available'
                }), 500
            
            # First crop the image using controller
            success = image_controller.crop_image(final_source_path, target_path, area)
            
            if not success:
                print(f"[@route:host_process_area] Initial cropping failed")
                return jsonify({
                    'success': False,
                    'error': 'Failed to crop image'
                }), 500
            
            # Then apply processing if requested
            processed_area = area  # Default to original area
            
            if autocrop:
                print(f"[@route:host_process_area] Applying auto-crop enhancement")
                processed_area = image_controller.auto_crop_image(target_path)
                if not processed_area:
                    print(f"[@route:host_process_area] Auto-crop failed, using original area")
                    processed_area = area
            
            if remove_background:
                print(f"[@route:host_process_area] Applying background removal")
                bg_success = image_controller.remove_background(target_path)
                if not bg_success:
                    print(f"[@route:host_process_area] Background removal failed")
            
            print(f"[@route:host_process_area] Processing successful: {target_filename}")
            
            # Build complete URL for the processed image (for temporary preview)
            from src.utils.buildUrlUtils import buildCroppedImageUrl
            host_info = host_device
            processed_image_url = buildCroppedImageUrl(host_info, target_filename)
            print(f"[@route:host_process_area] Built processed image URL: {processed_image_url}")
            
            return jsonify({
                'success': True,
                'filename': target_filename,
                'image_url': processed_image_url,  # Complete URL for frontend
                'processed_area': processed_area,
                'message': f'Image processed successfully: {reference_name}'
            })
            
        except ImportError as e:
            print(f"[@route:host_process_area] Import error: {e}")
            return jsonify({
                'success': False,
                'error': 'Processing utilities not available'
            }), 500
        
    except Exception as e:
        print(f"[@route:host_process_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host processing error: {str(e)}'
        }), 500

# =====================================================
# HOST-SIDE IMAGE RESOURCE SAVE ENDPOINT
# =====================================================

@verification_image_host_bp.route('/save-image-reference', methods=['POST'])
def save_resource():
    """Save image verification reference"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # ✅ GET TEAM_ID FROM REQUEST HEADERS LIKE OTHER WORKING ROUTES
        from src.utils.app_utils import get_team_id
        team_id = get_team_id()
        
        data = request.get_json()
        cropped_filename = data.get('cropped_filename')  # e.g., "cropped_capture_capture_20250103..."
        reference_name = data.get('reference_name') or data.get('name')  # Handle both parameter names
        model = data.get('model')
        area = data.get('area')
        reference_type = data.get('reference_type', 'reference_image')
        
        print(f"[@route:host_save_resource] Uploading reference to R2: {reference_name} for model: {model}")
        print(f"[@route:host_save_resource] Source cropped file: {cropped_filename}")
        print(f"[@route:host_save_resource] Request data keys: {list(data.keys())}")
        
        # Validate required parameters
        if not reference_name or not model:
            return jsonify({
                'success': False,
                'error': 'reference_name (or name), and model are required'
            }), 400
        
        # If no cropped_filename provided, we need to capture first
        if not cropped_filename:
            return jsonify({
                'success': False,
                'error': 'cropped_filename is required - must capture area first'
            }), 400
        
        # Build source path for cropped file
        cropped_source_path = f'{CROPPED_PATH}/{cropped_filename}'
        
        print(f"[@route:host_save_resource] Uploading from {cropped_source_path} to Cloudflare R2")
        
        # Check if cropped file exists
        if not os.path.exists(cropped_source_path):
            print(f"[@route:host_save_resource] Cropped file not found: {cropped_source_path}")
            return jsonify({
                'success': False,
                'error': f'Cropped file not found: {cropped_filename}'
            }), 404
        
        # Upload to R2 using CloudflareUtils
        try:
            from src.utils.cloudflare_utils import upload_reference_image
            
            # Create the target filename for R2 (use reference_name with .jpg extension)
            r2_filename = f"{reference_name}.jpg"
            
            print(f"[@route:host_save_resource] Uploading to R2: {r2_filename}")
            
            # Upload to R2
            upload_result = upload_reference_image(cropped_source_path, model, r2_filename)
            
            if not upload_result.get('success'):
                print(f"[@route:host_save_resource] R2 upload failed: {upload_result.get('error')}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to upload to R2: {upload_result.get("error")}'
                }), 500
            
            r2_url = upload_result.get('url')
            print(f"[@route:host_save_resource] Successfully uploaded to R2: {r2_url}")
            
            # Now call the server to save to database
            import requests
            server_url = f"http://localhost:5000/server/verification/image/save-image-reference"
            
            server_payload = {
                'name': reference_name,
                'model': model,
                'r2_url': r2_url,
                'area': area,
                'reference_type': reference_type,
                'team_id': team_id
            }
            
            print(f"[@route:host_save_resource] Calling server to save to database: {server_payload}")
            
            server_response = requests.post(server_url, json=server_payload, timeout=30)
            server_result = server_response.json()
            
            if not server_result.get('success'):
                print(f"[@route:host_save_resource] Server save failed: {server_result.get('error')}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to save to database: {server_result.get("error")}'
                }), 500
            
            print(f"[@route:host_save_resource] Successfully saved to database")
            
            return jsonify({
                'success': True,
                'message': f'Image reference saved successfully: {reference_name}',
                'reference_name': reference_name,
                'r2_url': r2_url,
                'area': area,
                'reference_type': reference_type
            })
            
        except Exception as upload_error:
            print(f"[@route:host_save_resource] Upload error: {str(upload_error)}")
            return jsonify({
                'success': False,
                'error': f'Upload to R2 failed: {str(upload_error)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_save_resource] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'R2 save error: {str(e)}'
        }), 500



# =====================================================
# HOST-SIDE IMAGE VERIFICATION EXECUTION ENDPOINTS
# =====================================================

@verification_image_host_bp.route('/execute', methods=['POST'])
def execute_image_verification():
    """Execute single image verification on host"""
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
        
        print(f"[@route:host_verification_image:execute] Executing image verification on host")
        print(f"[@route:host_verification_image:execute] Source: {source_filename}")
        
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
            print(f"[@route:host_verification_image:execute] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Create results directory - simple path, just ensure it exists
        results_dir = f'{STREAM_BASE_PATH}/verification_results'
        print(f"[@route:host_verification_image:execute] Using verification results directory: {results_dir}")
        
        # Just ensure directory exists, don't delete it
        os.makedirs(results_dir, exist_ok=True)
        
        # Execute image verification
        result = execute_image_verification_host(verification, source_path, 0, results_dir)
        
        # Convert local paths to public URLs using centralized URL builder
        from src.utils.buildUrlUtils import buildVerificationResultUrl
        from src.utils.app_utils import get_host_by_name
        
        # Get host info for URL building
        host_info = host_device  # Already available in this route
        
        if result.get('source_image_path'):
            result['source_image_url'] = buildVerificationResultUrl(host_info, result['source_image_path'])
            print(f"[@route:host_verification_image:execute] Built source URL: {result['source_image_url']}")
        if result.get('result_overlay_path'):
            result['result_overlay_url'] = buildVerificationResultUrl(host_info, result['result_overlay_path'])
            print(f"[@route:host_verification_image:execute] Built overlay URL: {result['result_overlay_url']}")
        if result.get('reference_image_path'):
            result['reference_image_url'] = buildVerificationResultUrl(host_info, result['reference_image_path'])
            print(f"[@route:host_verification_image:execute] Built reference URL: {result['reference_image_url']}")
        
        print(f"[@route:host_verification_image:execute] Verification completed: {result.get('success')}")
        
        return jsonify({
            'success': True,
            'verification_result': result,
            'results_directory': buildVerificationResultUrl(host_info, results_dir)
        })
        
    except Exception as e:
        print(f"[@route:host_verification_image:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Image verification execution error: {str(e)}'
        }), 500

def execute_image_verification_host(verification, source_path, verification_index, results_dir):
    """Execute image verification using verification controllers."""
    try:
        import cv2
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
        threshold = params.get('threshold', 0.8)
        image_filter = params.get('image_filter', 'none')
        
        # Get reference filename directly from verification data
        reference_filename = verification.get('reference_filename', '')
        
        print(f"[@route:execute_image_verification_host] Reference filename: {reference_filename}")
        print(f"[@route:execute_image_verification_host] Image filter: {image_filter}")
        print(f"[@route:execute_image_verification_host] Area: {area}")
        print(f"[@route:execute_image_verification_host] Threshold: {threshold}")
        
        if not reference_filename:
            return {
                'success': False,
                'error': 'No reference filename specified'
            }
        
        # Get device model from verification data
        device_model = verification.get('device_model', 'android_mobile')
        
        # Always download reference from URL to ensure we have the latest version
        reference_url = params.get('reference_url', '')
        
        print(f"[@route:execute_image_verification_host] Always downloading reference from URL to ensure latest version")
        print(f"[@route:execute_image_verification_host] Reference URL from params: {reference_url}")
        
        reference_path = None
        
        if reference_url:
            # Download directly from the provided URL using CloudflareUtils
            try:
                from urllib.parse import urlparse
                from src.utils.cloudflare_utils import get_cloudflare_utils
                
                # Extract filename from URL
                parsed_url = urlparse(reference_url)
                filename = parsed_url.path.split('/')[-1]
                # Extract the R2 object key (path without leading slash)
                r2_object_key = parsed_url.path.lstrip('/')
                local_path = f'{RESOURCES_PATH}/{device_model}/{filename}'
                
                print(f"[@route:execute_image_verification_host] Downloading from URL: {reference_url}")
                print(f"[@route:execute_image_verification_host] R2 object key: {r2_object_key}")
                print(f"[@route:execute_image_verification_host] Saving to: {local_path}")
                
                # Use CloudflareUtils download_file method
                cloudflare_utils = get_cloudflare_utils()
                download_result = cloudflare_utils.download_file(r2_object_key, local_path)
                
                if download_result.get('success'):
                    print(f"[@route:execute_image_verification_host] Successfully downloaded reference from URL: {local_path}")
                    reference_path = local_path
                else:
                    print(f"[@route:execute_image_verification_host] Failed to download from URL: {download_result.get('error')}")
                    
            except Exception as e:
                print(f"[@route:execute_image_verification_host] Error downloading from URL: {str(e)}")
        
        # Fallback: try to download using filename reconstruction if URL download failed
        if not reference_path:
            print(f"[@route:execute_image_verification_host] Fallback: trying filename reconstruction")
            base_name = reference_filename.split('.')[0]
            
            # Try to download from R2 with different extensions
            for ext in ['.png', '.jpg', '.jpeg']:
                r2_filename = f"{base_name}{ext}"
                local_path = f'{RESOURCES_PATH}/{device_model}/{r2_filename}'
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                
                print(f"[@route:execute_image_verification_host] Attempting to download {r2_filename} from R2")
                download_result = download_reference_image(device_model, r2_filename, local_path)
                
                if download_result.get('success'):
                    print(f"[@route:execute_image_verification_host] Successfully downloaded reference from R2: {local_path}")
                    reference_path = local_path
                    break
                else:
                    print(f"[@route:execute_image_verification_host] Failed to download {r2_filename}: {download_result.get('error')}")
        
        # Verify reference image was downloaded successfully
        if not reference_path or not os.path.exists(reference_path):
            return {
                'success': False,
                'error': f'Reference image could not be downloaded. URL: {reference_url}, Filename: {reference_filename}'
            }
        
        print(f"[@route:execute_image_verification_host] Using reference path: {reference_path}")
        
        # Create result file paths in stream directory
        source_result_path = f'{results_dir}/source_image_{verification_index}.png'
        reference_result_path = f'{results_dir}/reference_image_{verification_index}.png'
        overlay_result_path = f'{results_dir}/result_overlay_{verification_index}.png'
        
        # === STEP 1: Handle Source Image ===
        # Crop source image to area if specified (always crop for source)
        if area:
            # Use controller to crop source image
            success = image_controller.crop_image(source_path, source_result_path, area, create_filtered_versions=False)
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
        
        # Apply filter to source image if user selected one
        if image_filter and image_filter != 'none':
            print(f"[@route:execute_image_verification_host] Applying {image_filter} filter to source image")
            if not image_controller.apply_filter(source_result_path, image_filter):
                print(f"[@route:execute_image_verification_host] Warning: Failed to apply {image_filter} filter to source")
        
        # === STEP 2: Handle Reference Image ===
        # Copy reference image and apply filter if needed
        if image_filter and image_filter != 'none':
            # User wants filtered comparison - check if filtered reference exists
            base_path, ext = os.path.splitext(reference_path)
            filtered_reference_path = f"{base_path}_{image_filter}{ext}"
            
            if os.path.exists(filtered_reference_path):
                print(f"[@route:execute_image_verification_host] Using existing filtered reference: {filtered_reference_path}")
                image_controller.copy_image(filtered_reference_path, reference_result_path)
            else:
                print(f"[@route:execute_image_verification_host] Filtered reference not found, creating dynamically from original: {reference_path}")
                # Copy original reference first using controller
                image_controller.copy_image(reference_path, reference_result_path)
                # Apply filter dynamically to the copied reference
                if not image_controller.apply_filter(reference_result_path, image_filter):
                    print(f"[@route:execute_image_verification_host] Warning: Failed to apply {image_filter} filter to reference, using original")
                    # If filter fails, copy original again to ensure clean state
                    image_controller.copy_image(reference_path, reference_result_path)
                else:
                    print(f"[@route:execute_image_verification_host] Successfully applied {image_filter} filter to reference image")
        else:
            # User wants original comparison - use original reference
            print(f"[@route:execute_image_verification_host] Using original reference: {reference_path}")
            image_controller.copy_image(reference_path, reference_result_path)
        
        # === STEP 3: Perform Verification ===
        # Load both images for comparison
        source_img = cv2.imread(source_result_path)
        ref_img = cv2.imread(reference_result_path)
        
        if source_img is None or ref_img is None:
            return {
                'success': False,
                'error': 'Failed to load images for comparison'
            }
        
        print(f"[@route:execute_image_verification_host] Source image shape: {source_img.shape}")
        print(f"[@route:execute_image_verification_host] Reference image shape: {ref_img.shape}")
        
        # Perform template matching
        result_match = cv2.matchTemplate(source_img, ref_img, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result_match)
        
        # Check if match exceeds threshold
        verification_success = max_val >= threshold
        
        print(f"[@route:execute_image_verification_host] Template matching confidence: {max_val:.4f}")
        print(f"[@route:execute_image_verification_host] Threshold: {threshold}")
        print(f"[@route:execute_image_verification_host] Verification result: {verification_success}")
        
        # Create result overlay image
        overlay_img = source_img.copy()
        if verification_success:
            # Draw green rectangle around match
            h, w = ref_img.shape[:2]
            top_left = max_loc
            bottom_right = (top_left[0] + w, top_left[1] + h)
            cv2.rectangle(overlay_img, top_left, bottom_right, (0, 255, 0), 3)
            cv2.putText(overlay_img, f'MATCH: {max_val:.3f}', (top_left[0], top_left[1] - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        else:
            # Draw red X or indicator for no match
            cv2.putText(overlay_img, f'NO MATCH: {max_val:.3f} < {threshold}', (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        cv2.imwrite(overlay_result_path, overlay_img)
        
        message = f'Image verification {"passed" if verification_success else "failed"}: confidence {max_val:.3f}'
        
        return {
            'success': verification_success,
            'message': message,
            'confidence': max_val,
            'threshold': threshold,
            'source_image_path': source_result_path,
            'reference_image_path': reference_result_path,
            'result_overlay_path': overlay_result_path,
            'verification_type': 'image'
        }
        
    except Exception as e:
        print(f"[@route:execute_image_verification_host] Error: {str(e)}")
        return {
            'success': False,
            'error': f'Image verification error: {str(e)}'
        } 