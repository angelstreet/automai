"""
Verification Image Host Routes

This module contains the host-side image verification API endpoints that:
- Handle actual image cropping using existing utilities
- Process images with autocrop and background removal
- Serve cropped images from local storage
- Save image resources to git repository
- Execute image verification tests
"""

from flask import Blueprint, request, jsonify, current_app
import os
import json
import subprocess
import shutil
from datetime import datetime
import time
from src.utils.host_utils import get_local_controller
from src.utils.app_utils import buildHostUrl

# Create blueprint
verification_image_host_bp = Blueprint('verification_image_host', __name__, url_prefix='/host/verification/image')

# Host configuration
HOST_IP = "77.56.53.130"
HOST_PORT = "5119"
CLIENT_URL = "https://77.56.53.130:444"  # Nginx-exposed URL

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
        
        print(f"[@route:host_crop_area] Using host device: {host_device.get('host_name')} - {host_device.get('device_name')}")
        
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
                final_source_path = f'/var/www/html/stream/captures/{source_filename}'
            else:
                # Use source_path directly if it's a file path
                final_source_path = source_path
        elif source_filename:
            # Build source path from filename - assume images are in /var/www/html/stream/captures/
            final_source_path = f'/var/www/html/stream/captures/{source_filename}'
        else:
            return jsonify({
                'success': False,
                'error': 'Either source_filename or source_path is required'
            }), 400
        
        # Build target path for cropped image in dedicated cropped folder
        cropped_dir = '/var/www/html/stream/captures/cropped'
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
                # Build public URL using buildHostUrl for frontend access
                host_info = {
                    'host_url': host_device.get('host_url'),
                    'host_name': host_device.get('host_name')
                }
                
                public_url = buildHostUrl(host_info, f'/host/stream/captures/cropped/{target_filename}')
                print(f"[@route:host_crop_area] Cropping successful: {public_url}")
                
                return jsonify({
                    'success': True,
                    'image_url': public_url,  # ✅ Public URL for frontend access
                    'filename': target_filename,
                    'cropped_path': public_url,
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
        
        print(f"[@route:host_process_area] Using host device: {host_device.get('host_name')} - {host_device.get('device_name')}")
        
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
                final_source_path = f'/var/www/html/stream/captures/{source_filename}'
            else:
                # Use source_path directly if it's a file path
                final_source_path = source_path
        elif source_filename:
            # Build source path from filename - assume images are in /var/www/html/stream/captures/
            final_source_path = f'/var/www/html/stream/captures/{source_filename}'
        else:
            return jsonify({
                'success': False,
                'error': 'Either source_filename or source_path is required'
            }), 400
        
        # Build target path for processed image in dedicated cropped folder
        cropped_dir = '/var/www/html/stream/captures/cropped'
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
            
            # Build public URL using buildHostUrl for frontend access
            host_info = {
                'host_url': host_device.get('host_url'),
                'host_name': host_device.get('host_name')
            }
            
            public_url = buildHostUrl(host_info, f'/host/stream/captures/cropped/{target_filename}')
            print(f"[@route:host_process_area] Processing successful: {public_url}")
            
            return jsonify({
                'success': True,
                'image_url': public_url,  # ✅ Public URL for frontend access
                'filename': target_filename,
                'cropped_path': public_url,
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
        
        print(f"[@route:host_save_resource] Using host device: {host_device.get('host_name')} - {host_device.get('device_name')}")
        
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
        cropped_source_path = f'/var/www/html/stream/captures/cropped/{cropped_filename}'
        
        print(f"[@route:host_save_resource] Uploading from {cropped_source_path} to Cloudflare R2")
        
        # Check if cropped file exists
        if not os.path.exists(cropped_source_path):
            print(f"[@route:host_save_resource] Cropped file not found: {cropped_source_path}")
            return jsonify({
                'success': False,
                'error': f'Cropped file not found: {cropped_filename}'
            }), 404
        
        # Upload directly to Cloudflare R2
        try:
            # Lazy import - only load CloudflareUploader when actually needed
            from src.utils.cloudflare_upload_utils import CloudflareUploader
            
            uploader = CloudflareUploader()
            
            # Upload to R2 with organized path (public access configured at bucket level)
            r2_path = f'reference-images/{model}/{reference_name}.jpg'
            upload_result = uploader.upload_file(cropped_source_path, r2_path)
            
            if not upload_result.get('success'):
                error_msg = upload_result.get('error', 'Unknown upload error')
                print(f"[@route:host_save_resource] R2 upload failed: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to upload to Cloudflare R2: {error_msg}'
                }), 500
            
            # Get public URL from upload result (no expiration)
            r2_public_url = upload_result.get('url')
            
            print(f"[@route:host_save_resource] Successfully uploaded to R2: {r2_path}")
            print(f"[@route:host_save_resource] R2 public URL (unlimited): {r2_public_url}")
            
        except Exception as upload_error:
            print(f"[@route:host_save_resource] R2 upload exception: {upload_error}")
            return jsonify({
                'success': False,
                'error': f'Failed to upload to R2: {str(upload_error)}'
            }), 500
        
        # Update resource.json with R2 URL only
        resource_json_path = '../config/resource/resource.json'
        os.makedirs(os.path.dirname(resource_json_path), exist_ok=True)
        
        # Load existing resource data or create new
        resource_data = {'resources': []}
        if os.path.exists(resource_json_path):
            try:
                with open(resource_json_path, 'r') as f:
                    resource_data = json.load(f)
            except json.JSONDecodeError:
                print(f"[@route:host_save_resource] Warning: Invalid JSON in {resource_json_path}, creating new")
                resource_data = {'resources': []}
        
        # Remove existing resource with same name and model (update case)
        resource_data['resources'] = [
            r for r in resource_data['resources'] 
            if not (r.get('name') == reference_name and r.get('model') == model)
        ]
        
        # Add new resource with R2 URL as path
        new_resource = {
            'name': reference_name,
            'model': model,
            'type': reference_type,
            'area': area,
            'created_at': datetime.now().isoformat(),
            'path': r2_public_url  # R2 URL is the path
        }
        
        resource_data['resources'].append(new_resource)
        
        # Save updated resource data
        with open(resource_json_path, 'w') as f:
            json.dump(resource_data, f, indent=2)
        
        print(f"[@route:host_save_resource] Resource JSON updated with R2 URL")
        
        # Git operations for resource.json only
        try:
            # Change to the parent directory for git operations
            original_cwd = os.getcwd()
            os.chdir('..')
            
            print(f"[@route:host_save_resource] Performing git operations for resource.json...")
            
            # Git pull to get latest changes
            subprocess.run(['git', 'pull'], check=True, capture_output=True, text=True)
            
            # Git add only the resource.json file
            subprocess.run(['git', 'add', 'config/resource/resource.json'], check=True, capture_output=True, text=True)
            
            # Git commit with descriptive message
            commit_message = f'Add R2 reference: {reference_name} for {model}'
            subprocess.run(['git', 'commit', '-m', commit_message], check=True, capture_output=True, text=True)
            
            # Git push with authentication
            github_token = os.getenv('GITHUB_TOKEN')
            if github_token:
                subprocess.run(['git', 'push'], check=True, capture_output=True, text=True)
                print(f"[@route:host_save_resource] Git operations completed successfully")
            else:
                print(f"[@route:host_save_resource] Warning: GITHUB_TOKEN not set, skipping push")
            
            # Return to original directory
            os.chdir(original_cwd)
            
            # Return success with R2 URL
            return jsonify({
                'success': True,
                'message': f'Reference uploaded to R2: {reference_name}',
                'r2_url': r2_public_url,
                'r2_path': r2_path
            })
            
        except subprocess.CalledProcessError as git_error:
            os.chdir(original_cwd)  # Ensure we return to original directory
            print(f"[@route:host_save_resource] Git operation failed: {git_error}")
            return jsonify({
                'success': False,
                'error': f'Git operation failed: {str(git_error)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_save_resource] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'R2 save error: {str(e)}'
        }), 500



# =====================================================
# HOST-SIDE IMAGE VERIFICATION EXECUTION
# =====================================================

def execute_image_verification_host(verification, source_path, model, verification_index, results_dir):
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
        reference_name = verification.get('inputValue', '')
        
        print(f"[@route:execute_image_verification_host] Reference name: {reference_name}")
        print(f"[@route:execute_image_verification_host] Image filter: {image_filter}")
        print(f"[@route:execute_image_verification_host] Area: {area}")
        print(f"[@route:execute_image_verification_host] Threshold: {threshold}")
        
        if not reference_name:
            return {
                'success': False,
                'error': 'No reference image specified'
            }
        
        # Resolve reference image path
        image_path = resolve_reference_path(reference_name, model, 'image')
        if not image_path:
            return {
                'success': False,
                'error': f'Reference image not found: {reference_name}'
            }
        
        print(f"[@route:execute_image_verification_host] Resolved path: {image_path}")
        
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
            base_path, ext = os.path.splitext(image_path)
            filtered_reference_path = f"{base_path}_{image_filter}{ext}"
            
            if os.path.exists(filtered_reference_path):
                print(f"[@route:execute_image_verification_host] Using existing filtered reference: {filtered_reference_path}")
                image_controller.copy_image(filtered_reference_path, reference_result_path)
            else:
                print(f"[@route:execute_image_verification_host] Filtered reference not found, creating dynamically from original: {image_path}")
                # Copy original reference first using controller
                image_controller.copy_image(image_path, reference_result_path)
                # Apply filter dynamically to the copied reference
                if not image_controller.apply_filter(reference_result_path, image_filter):
                    print(f"[@route:execute_image_verification_host] Warning: Failed to apply {image_filter} filter to reference, using original")
                    # If filter fails, copy original again to ensure clean state
                    image_controller.copy_image(image_path, reference_result_path)
                else:
                    print(f"[@route:execute_image_verification_host] Successfully applied {image_filter} filter to reference image")
        else:
            # User wants original comparison - use original reference
            print(f"[@route:execute_image_verification_host] Using original reference: {image_path}")
            image_controller.copy_image(image_path, reference_result_path)
        
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

def resolve_reference_path(reference_name, model, verification_type):
    """Download reference image from R2 public URL and cache locally for verification."""
    if not reference_name:
        return None
        
    try:
        # Read R2 URL from resource JSON file
        resource_json_path = '../config/resource/resource.json'
        if not os.path.exists(resource_json_path):
            print(f"[@route:resolve_reference_path] Resource JSON not found: {resource_json_path}")
            return None
            
        with open(resource_json_path, 'r') as f:
            resource_data = json.load(f)
        
        # Find matching resource
        r2_url = None
        for resource in resource_data.get('resources', []):
            if (resource.get('name') == reference_name and 
                resource.get('model') == model and
                resource.get('type') == f'reference_{verification_type}'):
                
                r2_url = resource.get('path')  # R2 public URL is stored in path field
                break
        
        if not r2_url:
            print(f"[@route:resolve_reference_path] Reference not found in JSON: {reference_name}")
            return None
        
        print(f"[@route:resolve_reference_path] Found R2 public URL: {r2_url}")
        
        # Create cache directory
        cache_dir = '/tmp/r2_cache'
        os.makedirs(cache_dir, exist_ok=True)
        
        # Cache filename
        cache_filename = f"{model}_{reference_name}.jpg"
        cache_path = os.path.join(cache_dir, cache_filename)
        
        # Check if cached file exists and is recent (avoid re-downloading)
        if os.path.exists(cache_path):
            # If file is less than 1 hour old, use cached version
            if (time.time() - os.path.getmtime(cache_path)) < 3600:
                print(f"[@route:resolve_reference_path] Using cached R2 image: {cache_path}")
                return cache_path
        
        # Download from R2 public URL to cache
        try:
            import requests
            
            print(f"[@route:resolve_reference_path] Downloading from R2 public URL to cache: {cache_path}")
            response = requests.get(r2_url, timeout=30)
            response.raise_for_status()
            
            with open(cache_path, 'wb') as f:
                f.write(response.content)
            
            print(f"[@route:resolve_reference_path] R2 image cached successfully")
            return cache_path
            
        except Exception as download_error:
            print(f"[@route:resolve_reference_path] Failed to download from R2: {download_error}")
            return None
        
    except Exception as e:
        print(f"[@route:resolve_reference_path] Error resolving R2 reference: {str(e)}")
        return None 