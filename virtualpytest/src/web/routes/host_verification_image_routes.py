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
        
        # Upload reference image to R2 using the correct reference upload function
        try:
            from src.utils.cloudflare_utils import upload_reference_image
            
            # Create the target filename for R2 (use reference_name with .jpg extension)
            r2_filename = f"{reference_name}.jpg"
            
            print(f"[@route:host_save_resource] Uploading reference image to R2: {r2_filename}")
            print(f"[@route:host_save_resource] Source file: {cropped_source_path}")
            print(f"[@route:host_save_resource] Target path: reference-images/{model}/{r2_filename}")
            
            # Upload to R2 using the reference upload function (uploads to reference-images/ folder)
            upload_result = upload_reference_image(cropped_source_path, model, r2_filename)
            
            if not upload_result.get('success'):
                print(f"[@route:host_save_resource] R2 upload failed: {upload_result.get('error')}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to upload to R2: {upload_result.get("error")}'
                }), 500
            
            r2_url = upload_result.get('url')
            print(f"[@route:host_save_resource] Successfully uploaded reference to R2: {r2_url}")
            
            # Save to database using the images database function
            try:
                from src.lib.supabase.verifications_references_db import save_reference
                from src.utils.app_utils import get_team_id
                
                team_id = get_team_id()
                print(f"[@route:host_save_resource] Saving to database with team_id: {team_id}")
                
                # Extract R2 path from upload result for database storage
                r2_path = upload_result.get('remote_path', f"reference-images/{model}/{r2_filename}")
                
                db_result = save_reference(
                    name=reference_name,
                    device_model=model,
                    reference_type='reference_image',  # Use reference_image type, not screenshot
                    r2_path=r2_path,
                    r2_url=r2_url,
                    team_id=team_id,
                    area=area
                )
                
                if db_result.get('success'):
                    print(f"[@route:host_save_resource] Successfully saved to database")
                else:
                    print(f"[@route:host_save_resource] Database save failed: {db_result.get('error')}")
                    return jsonify({
                        'success': False,
                        'error': f'Failed to save to database: {db_result.get("error")}'
                    }), 500
                
            except Exception as db_error:
                print(f"[@route:host_save_resource] Database save error: {str(db_error)}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to save to database: {str(db_error)}'
                }), 500
            
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
        source_filename = data.get('source_filename')  # Optional - controller will take screenshot if None
        
        print(f"[@route:host_verification_image:execute] Executing image verification on host")
        print(f"[@route:host_verification_image:execute] Source: {source_filename}")
        
        # Validate required parameters - only verification is required, source_filename is optional
        if not verification:
            return jsonify({
                'success': False,
                'error': 'verification is required'
            }), 400
        
        # Use centralized VerificationController instead of custom logic
        from src.controllers.verification_controller import get_verification_controller
        
        verification_controller = get_verification_controller(host_device)
        
        # Convert source_filename to source_path if provided
        source_path = None
        if source_filename:
            source_path = f'/var/www/html/stream/captures/{source_filename}'
        
        result = verification_controller.execute_verification(verification, 
                                                            source_path=source_path)
        
        print(f"[@route:host_verification_image:execute] Verification completed: {result.get('success')}")
        
        return jsonify({
            'success': True,
            'verification_result': result
        })
        
    except Exception as e:
        print(f"[@route:host_verification_image:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Image verification execution error: {str(e)}'
        }), 500 