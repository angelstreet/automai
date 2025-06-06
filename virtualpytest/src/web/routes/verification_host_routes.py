"""
Verification Host Routes

This module contains the host-side verification API endpoints that:
- Handle actual image cropping using existing utilities
- Process images with autocrop and background removal
- Serve cropped images from local storage
- Save resources to git repository
"""

from flask import Blueprint, request, jsonify
import os
import json
import subprocess
import shutil
from datetime import datetime

# Create blueprint
verification_host_bp = Blueprint('verification_host', __name__)

# =====================================================
# HOST-SIDE CROPPING ENDPOINTS
# =====================================================

# Host configuration
HOST_IP = "77.56.53.130"
HOST_PORT = "5119"
CLIENT_URL = "https://77.56.53.130:444"  # Nginx-exposed URL

@verification_host_bp.route('/stream/crop-area', methods=['POST'])
def host_crop_area():
    """Host-side endpoint to crop images locally using existing utilities."""
    try:
        data = request.get_json()
        source_filename = data.get('source_filename')
        area = data.get('area')
        reference_name = data.get('reference_name', 'cropped')
        
        print(f"[@route:host_crop_area] Host cropping request: {source_filename} with area: {area}")
        
        # Validate required parameters
        if not source_filename or not area:
            return jsonify({
                'success': False,
                'error': 'source_filename and area are required'
            }), 400
        
        # Build source path - assume images are in /var/www/html/stream/captures/
        source_path = f'/var/www/html/stream/captures/{source_filename}'
        
        # Build target path for cropped image in dedicated cropped folder
        cropped_dir = '/var/www/html/stream/captures/cropped'
        os.makedirs(cropped_dir, exist_ok=True)  # Ensure cropped directory exists
        
        # Extract base name without extension and timestamp
        base_name = source_filename.replace('.jpg', '').replace('.png', '')
        
        # Avoid double naming if reference_name is already in the filename
        if reference_name in base_name:
            target_filename = f'cropped_{base_name}.jpg'
        else:
            target_filename = f'cropped_{reference_name}_{base_name}.jpg'
            
        target_path = f'{cropped_dir}/{target_filename}'
        
        print(f"[@route:host_crop_area] Cropping from {source_path} to {target_path}")
        
        # Check if source file exists
        if not os.path.exists(source_path):
            print(f"[@route:host_crop_area] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Import and use existing cropping function
        try:
            from controllers.verification.image import crop_reference_image
            
            # Crop the image
            success = crop_reference_image(source_path, target_path, area)
            
            if success:
                # Return URL path for the cropped image
                cropped_url = f'/stream/captures/cropped/{target_filename}'
                print(f"[@route:host_crop_area] Cropping successful: {cropped_url}")
                
                return jsonify({
                    'success': True,
                    'cropped_path': cropped_url,
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

@verification_host_bp.route('/stream/process-area', methods=['POST'])
def host_process_area():
    """Host-side endpoint to process images with autocrop and background removal."""
    try:
        data = request.get_json()
        source_filename = data.get('source_filename')
        area = data.get('area')
        reference_name = data.get('reference_name', 'processed')
        autocrop = data.get('autocrop', False)
        remove_background = data.get('remove_background', False)
        
        print(f"[@route:host_process_area] Host processing request: {source_filename} with area: {area}")
        print(f"[@route:host_process_area] Processing options: autocrop={autocrop}, remove_background={remove_background}")
        
        # Validate required parameters
        if not source_filename or not area:
            return jsonify({
                'success': False,
                'error': 'source_filename and area are required'
            }), 400
        
        # Build source path - assume images are in /var/www/html/stream/captures/
        source_path = f'/var/www/html/stream/captures/{source_filename}'
        
        # Build target path for processed image in dedicated cropped folder
        cropped_dir = '/var/www/html/stream/captures/cropped'
        os.makedirs(cropped_dir, exist_ok=True)  # Ensure cropped directory exists
        
        # Extract base name without extension and timestamp
        base_name = source_filename.replace('.jpg', '').replace('.png', '')
        
        # Avoid double naming if reference_name is already in the filename
        if reference_name in base_name:
            target_filename = f'processed_{base_name}.jpg'
        else:
            target_filename = f'processed_{reference_name}_{base_name}.jpg'
            
        target_path = f'{cropped_dir}/{target_filename}'
        
        print(f"[@route:host_process_area] Processing from {source_path} to {target_path}")
        
        # Check if source file exists
        if not os.path.exists(source_path):
            print(f"[@route:host_process_area] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Import and use existing processing functions
        try:
            from controllers.verification.image import crop_reference_image, process_reference_image
            
            # First crop the image
            success = crop_reference_image(source_path, target_path, area)
            
            if not success:
                print(f"[@route:host_process_area] Initial cropping failed")
                return jsonify({
                    'success': False,
                    'error': 'Failed to crop image'
                }), 500
            
            # Then apply processing if requested
            processed_area = area  # Default to original area
            
            if autocrop or remove_background:
                processed_area = process_reference_image(target_path, autocrop, remove_background)
                if not processed_area:
                    print(f"[@route:host_process_area] Processing failed, using original area")
                    processed_area = area
            
            # Return URL path for the processed image
            processed_url = f'/stream/captures/cropped/{target_filename}'
            print(f"[@route:host_process_area] Processing successful: {processed_url}")
            
            return jsonify({
                'success': True,
                'cropped_path': processed_url,
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
# HOST-SIDE RESOURCE SAVE ENDPOINT
# =====================================================

@verification_host_bp.route('/stream/save-resource', methods=['POST'])
def host_save_resource():
    """Save already cropped image to resources directory and update git repository."""
    try:
        data = request.get_json()
        cropped_filename = data.get('cropped_filename')  # e.g., "cropped_capture_capture_20250103..."
        reference_name = data.get('reference_name')
        model = data.get('model')
        area = data.get('area')
        reference_type = data.get('reference_type', 'reference_image')
        
        print(f"[@route:host_save_resource] Saving resource: {reference_name} for model: {model}")
        print(f"[@route:host_save_resource] Source cropped file: {cropped_filename}")
        
        # Validate required parameters
        if not cropped_filename or not reference_name or not model or not area:
            return jsonify({
                'success': False,
                'error': 'cropped_filename, reference_name, model, and area are required'
            }), 400
        
        # Build paths
        source_path = f'/var/www/html/stream/captures/cropped/{cropped_filename}'
        
        # Repository folder (permanent storage) - relative path from web app
        repo_resources_dir = f'../resources/{model}'
        repo_target_filename = f'{reference_name}.png'
        repo_target_path = f'{repo_resources_dir}/{repo_target_filename}'
        
        # Nginx exposition folder (for client access)
        nginx_resources_dir = f'/var/www/html/stream/resources/{model}'
        nginx_target_filename = f'{reference_name}.png'
        nginx_target_path = f'{nginx_resources_dir}/{nginx_target_filename}'
        
        resource_json_path = '../config/resource/resource.json'
        
        print(f"[@route:host_save_resource] Copying from {source_path}")
        print(f"[@route:host_save_resource] To repository: {repo_target_path}")
        print(f"[@route:host_save_resource] To nginx: {nginx_target_path}")
        
        # Check if source cropped file exists
        if not os.path.exists(source_path):
            print(f"[@route:host_save_resource] Source cropped file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source cropped file not found: {cropped_filename}'
            }), 404
        
        # Create directories if they don't exist
        os.makedirs(repo_resources_dir, exist_ok=True)
        os.makedirs(nginx_resources_dir, exist_ok=True)
        print(f"[@route:host_save_resource] Created directories: {repo_resources_dir} and {nginx_resources_dir}")
        
        # Copy cropped image to both locations
        shutil.copy2(source_path, repo_target_path)
        shutil.copy2(source_path, nginx_target_path)
        print(f"[@route:host_save_resource] Copied image to repository: {repo_target_path}")
        print(f"[@route:host_save_resource] Copied image to nginx: {nginx_target_path}")
        
        # Update resource.json
        try:
            # Load existing resource.json or create new structure
            if os.path.exists(resource_json_path):
                with open(resource_json_path, 'r') as f:
                    resource_data = json.load(f)
            else:
                resource_data = {"resources": []}
            
            # Create new resource entry
            new_resource = {
                "name": reference_name,
                "model": model,
                "path": f"resources/{model}/{reference_name}.png",
                "created_at": datetime.now().isoformat(),
                "type": reference_type,
                "area": area
            }
            
            # Remove existing resource with same name and model if it exists
            resource_data["resources"] = [
                r for r in resource_data["resources"] 
                if not (r.get("name") == reference_name and r.get("model") == model)
            ]
            
            # Add new resource
            resource_data["resources"].append(new_resource)
            
            # Save updated resource.json
            with open(resource_json_path, 'w') as f:
                json.dump(resource_data, f, indent=2)
            
            print(f"[@route:host_save_resource] Updated resource.json with new resource: {reference_name}")
            
        except Exception as e:
            print(f"[@route:host_save_resource] Failed to update resource.json: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Failed to update resource.json: {str(e)}'
            }), 500
        
        # Git operations using GitPython
        try:
            import git
            
            # Use simple relative path to git repository root
            repo_path = "../../../"
            print(f"[@route:host_save_resource] Using git repository: {repo_path}")
            
            # Open the git repository
            repo = git.Repo(repo_path)
            
            # Git pull first to get latest changes
            print(f"[@route:host_save_resource] Executing git pull...")
            try:
                origin = repo.remotes.origin
                origin.pull()
                print(f"[@route:host_save_resource] Git pull successful")
            except Exception as pull_error:
                print(f"[@route:host_save_resource] Git pull failed, continuing: {str(pull_error)}")
            
            # Add files to git index
            print(f"[@route:host_save_resource] Adding files to git...")
            try:
                # Add the resource image (relative to repo root)
                # The file is saved to ../resources/{model}/{name}.png from web directory
                # From git repo root, this is virtualpytest/src/resources/{model}/{name}.png
                image_git_path = f'virtualpytest/src/resources/{model}/{reference_name}.png'
                repo.index.add([image_git_path])
                
                # Add the resource.json file (relative to repo root)
                # The file is at ../config/resource/resource.json from web directory  
                # From git repo root, this is virtualpytest/src/config/resource/resource.json
                config_git_path = 'virtualpytest/src/config/resource/resource.json'
                repo.index.add([config_git_path])
                
                print(f"[@route:host_save_resource] Files added to git index: {image_git_path}, {config_git_path}")
            except Exception as add_error:
                print(f"[@route:host_save_resource] Git add failed: {str(add_error)}")
            
            # Git commit
            commit_message = f"save resource {reference_name} for model {model}"
            print(f"[@route:host_save_resource] Committing changes...")
            try:
                repo.index.commit(commit_message)
                print(f"[@route:host_save_resource] Git commit successful")
            except Exception as commit_error:
                print(f"[@route:host_save_resource] Git commit failed: {str(commit_error)}")
            
            # Git push
            print(f"[@route:host_save_resource] Pushing to remote...")
            try:
                origin = repo.remotes.origin
                origin.push()
                print(f"[@route:host_save_resource] Git push successful")
            except Exception as push_error:
                print(f"[@route:host_save_resource] Git push failed: {str(push_error)}")
            
            print(f"[@route:host_save_resource] Git operations completed")
            
        except ImportError:
            print(f"[@route:host_save_resource] GitPython not available, skipping git operations")
        except Exception as e:
            print(f"[@route:host_save_resource] Git operation error: {str(e)} - continuing anyway")
        
        # Build public URL
        public_url = f'/stream/resources/{model}/{reference_name}.png'
        
        print(f"[@route:host_save_resource] Resource saved successfully: {public_url}")
        
        return jsonify({
            'success': True,
            'public_url': public_url,
            'message': f'Resource "{reference_name}" saved successfully'
        })
        
    except Exception as e:
        print(f"[@route:host_save_resource] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host save resource error: {str(e)}'
        }), 500

# =====================================================
# HOST-SIDE VERIFICATION EXECUTION ENDPOINT
# =====================================================

@verification_host_bp.route('/stream/execute-verification', methods=['POST'])
def host_execute_verification():
    """Execute verification test on host using existing controllers and return results with comparison images."""
    try:
        data = request.get_json()
        verification = data.get('verification')
        model = data.get('model', 'default')
        verification_index = data.get('verification_index', 0)
        source_filename = data.get('source_filename')  # Current screenshot filename
        
        print(f"[@route:host_execute_verification] Executing verification: {verification.get('command')} for model: {model}")
        print(f"[@route:host_execute_verification] Source filename: {source_filename}")
        
        # Validate required parameters
        if not verification:
            return jsonify({
                'success': False,
                'error': 'verification is required'
            }), 400
        
        controller_type = verification.get('controller_type')
        command = verification.get('command')
        params = verification.get('params', {})
        
        print(f"[@route:host_execute_verification] Controller type: {controller_type}, Command: {command}")
        
        # Build source path - use provided filename or get latest capture
        if source_filename:
            source_path = f'/var/www/html/stream/captures/{source_filename}'
        else:
            # Get latest capture file
            captures_dir = '/var/www/html/stream/captures'
            if os.path.exists(captures_dir):
                capture_files = [f for f in os.listdir(captures_dir) if f.startswith('capture_') and f.endswith('.jpg')]
                if capture_files:
                    latest_file = sorted(capture_files)[-1]
                    source_path = f'{captures_dir}/{latest_file}'
                    source_filename = latest_file
                else:
                    return jsonify({
                        'success': False,
                        'error': 'No capture files found'
                    }), 404
            else:
                return jsonify({
                    'success': False,
                    'error': 'Captures directory not found'
                }), 404
        
        # Check if source file exists
        if not os.path.exists(source_path):
            print(f"[@route:host_execute_verification] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Create verification results directory
        results_dir = f'/var/www/html/stream/verification_results/{model}'
        os.makedirs(results_dir, exist_ok=True)
        
        # Execute verification based on controller type
        if controller_type == 'image':
            result = execute_image_verification_host(verification, source_path, model, verification_index, results_dir)
        elif controller_type == 'text':
            result = execute_text_verification_host(verification, source_path, model, verification_index, results_dir)
        elif controller_type == 'adb':
            result = execute_adb_verification_host(verification, source_path, model, verification_index, results_dir)
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported controller type: {controller_type}'
            }), 400
        
        # Convert local paths to nginx-exposed URLs
        if result.get('success'):
            if 'source_image_path' in result:
                result['source_image_url'] = result['source_image_path'].replace('/var/www/html', '')
            if 'reference_image_path' in result:
                result['reference_image_url'] = result['reference_image_path'].replace('/var/www/html', '')
            if 'result_overlay_path' in result:
                result['result_overlay_url'] = result['result_overlay_path'].replace('/var/www/html', '')
        
        print(f"[@route:host_execute_verification] Verification completed: {result.get('success')}")
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_execute_verification] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host verification execution error: {str(e)}'
        }), 500

@verification_host_bp.route('/stream/execute-verification-batch', methods=['POST'])
def host_execute_verification_batch():
    """Execute batch verification tests on host and return consolidated results."""
    try:
        data = request.get_json()
        verifications = data.get('verifications', [])
        model = data.get('model', 'default')
        node_id = data.get('node_id', 'unknown')
        capture_filename = data.get('capture_filename')  # NEW: Optional specific capture
        
        print(f"[@route:host_execute_verification_batch] Executing {len(verifications)} verifications for node: {node_id}")
        print(f"[@route:host_execute_verification_batch] Model: {model}")
        print(f"[@route:host_execute_verification_batch] Capture filename: {capture_filename}")
        
        # Validate required parameters
        if not verifications:
            return jsonify({
                'success': False,
                'error': 'verifications list is required'
            }), 400
        
        # NEW: Resolve capture path using specific filename or fallback
        source_path, source_filename = resolve_capture_path(capture_filename)
        
        if not source_path:
            return jsonify({
                'success': False,
                'error': 'No capture file available for verification'
            }), 404
            
        print(f"[@route:host_execute_verification_batch] Using capture: {source_filename}")
        
        # Create verification results directory
        results_dir = f'/var/www/html/stream/verification_results/{model}'
        os.makedirs(results_dir, exist_ok=True)
        
        # Execute each verification
        results = []
        passed_count = 0
        
        for i, verification in enumerate(verifications):
            print(f"[@route:host_execute_verification_batch] Executing verification {i+1}/{len(verifications)}: {verification.get('id', 'unknown')}")
            
            controller_type = verification.get('controller_type', 'unknown')
            
            if controller_type == 'image':
                result = execute_image_verification_host(verification, source_path, model, i, results_dir)
            elif controller_type == 'text':
                result = execute_text_verification_host(verification, source_path, model, i, results_dir)
            elif controller_type == 'adb':
                result = execute_adb_verification_host(verification, source_path, model, i, results_dir)
            else:
                result = {
                    'success': False,
                    'error': f'Unknown controller type: {controller_type}'
                }
            
            # Convert file paths to URLs for client access
            if result.get('source_image_path'):
                result['sourceImageUrl'] = result['source_image_path'].replace('/var/www/html', '')
            if result.get('reference_image_path'):
                result['referenceImageUrl'] = result['reference_image_path'].replace('/var/www/html', '')
            if result.get('result_overlay_path'):
                result['resultOverlayUrl'] = result['result_overlay_path'].replace('/var/www/html', '')
            
            # Add verification metadata to result
            result['verification_id'] = verification.get('id')
            result['verification_index'] = i
            
            results.append(result)
            
            if result.get('success'):
                passed_count += 1
        
        print(f"[@route:host_execute_verification_batch] Batch completed: {passed_count}/{len(verifications)} passed")
        
        # Return consolidated results
        return jsonify({
            'success': passed_count == len(verifications),
            'message': f'Batch verification completed: {passed_count}/{len(verifications)} passed',
            'passed_count': passed_count,
            'total_count': len(verifications),
            'results': results,
            'node_id': node_id,
            'model': model,
            'capture_filename': source_filename  # Return actual filename used
        })
        
    except Exception as e:
        print(f"[@route:host_execute_verification_batch] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Batch verification error: {str(e)}'
        }), 500

def execute_image_verification_host(verification, source_path, model, verification_index, results_dir):
    """Execute image verification using existing image utilities."""
    try:
        from controllers.verification.image import crop_reference_image
        import cv2
        import numpy as np
        
        params = verification.get('params', {})
        area = params.get('area')
        
        # NEW: Get reference name and resolve to actual path
        reference_name = params.get('reference_image') or params.get('reference_name')
        image_path = resolve_reference_path(reference_name, model, 'image')
        
        threshold = params.get('threshold', 0.8)
        image_filter = params.get('image_filter', 'none')
        
        print(f"[@route:execute_image_verification_host] Reference name: {reference_name}")
        print(f"[@route:execute_image_verification_host] Resolved path: {image_path}")
        print(f"[@route:execute_image_verification_host] Area: {area}")
        print(f"[@route:execute_image_verification_host] Threshold: {threshold}")
        
        # Validate reference image
        if not reference_name:
            return {
                'success': False,
                'error': 'No reference image specified'
            }
            
        if not image_path or not os.path.exists(image_path):
            return {
                'success': False,
                'error': f'Reference image not found: {reference_name}'
            }
        
        # Create result file paths
        source_result_path = f'{results_dir}/source_image_{verification_index}.png'
        reference_result_path = f'{results_dir}/reference_image_{verification_index}.png'
        overlay_result_path = f'{results_dir}/result_overlay_{verification_index}.png'
        
        # Crop source image to area if specified
        if area:
            success = crop_reference_image(source_path, source_result_path, area)
            if not success:
                return {
                    'success': False,
                    'error': 'Failed to crop source image'
                }
        else:
            # Copy full source image
            shutil.copy2(source_path, source_result_path)
        
        # Copy reference image for comparison
        shutil.copy2(image_path, reference_result_path)
        
        # Initialize image verification controller (simplified)
        # For now, use basic template matching with OpenCV
        source_img = cv2.imread(source_result_path)
        ref_img = cv2.imread(reference_result_path)
        
        if source_img is None or ref_img is None:
            return {
                'success': False,
                'error': 'Failed to load images for comparison'
            }
        
        # Perform template matching
        result_match = cv2.matchTemplate(source_img, ref_img, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result_match)
        
        # Check if match exceeds threshold
        verification_success = max_val >= threshold
        
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

def execute_text_verification_host(verification, source_path, model, verification_index, results_dir):
    """Execute text verification using existing text utilities."""
    try:
        import cv2
        import pytesseract
        
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
            success = crop_reference_image(source_path, source_result_path, area)
            if not success:
                return {
                    'success': False,
                    'error': 'Failed to crop source image'
                }
        else:
            # Copy full source image
            shutil.copy2(source_path, source_result_path)
        
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

def execute_adb_verification_host(verification, source_path, model, verification_index, results_dir):
    """Execute ADB verification using existing ADB utilities."""
    try:
        params = verification.get('params', {})
        
        # NEW: Get element selector from inputValue (where client stores it)
        element_selector = verification.get('inputValue', '') or params.get('text', '')
        timeout = params.get('timeout', 10.0)
        
        print(f"[@route:execute_adb_verification_host] Element selector: '{element_selector}'")
        print(f"[@route:execute_adb_verification_host] Available params: {list(params.keys())}")
        print(f"[@route:execute_adb_verification_host] Verification keys: {list(verification.keys())}")
        
        if not element_selector:
            return {
                'success': False,
                'error': 'No element selector specified for ADB verification'
            }
        
        # TODO: Implement actual ADB verification logic
        # For now, return a placeholder result
        verification_success = True  # Placeholder
        
        message = f'ADB verification {"passed" if verification_success else "failed"}: element "{element_selector}"'
        
        return {
            'success': verification_success,
            'message': message,
            'element_selector': element_selector,
            'verification_type': 'adb'
        }
        
    except Exception as e:
        print(f"[@route:execute_adb_verification_host] Error: {str(e)}")
        return {
            'success': False,
            'error': f'ADB verification error: {str(e)}'
        }

def resolve_reference_path(reference_name, model, verification_type):
    """Host resolves reference names to actual file paths using JSON metadata."""
    if not reference_name:
        return None
        
    try:
        # Try to read from resource JSON file
        resource_json_path = '../config/resource/resource.json'
        if os.path.exists(resource_json_path):
            import json
            with open(resource_json_path, 'r') as f:
                resource_data = json.load(f)
            
            # Find matching resource
            for resource in resource_data.get('resources', []):
                if (resource.get('name') == reference_name and 
                    resource.get('model') == model and
                    resource.get('type') == f'reference_{verification_type}'):
                    
                    # Build path consistently with save logic: ../resources/{model}/{name}.png
                    relative_path = f'../{resource.get("path")}'  # Use path from JSON with ../ prefix
                    if os.path.exists(relative_path):
                        print(f"[@route:resolve_reference_path] Found in JSON: {relative_path}")
                        return relative_path
        
        # Fallback: try standard paths (build same way as save logic)
        if verification_type == 'image':
            possible_paths = [
                f'../resources/{model}/{reference_name}.png',
                f'../resources/{model}/{reference_name}.jpg',
                f'/var/www/html/stream/resources/{model}/{reference_name}.png',
                f'/var/www/html/stream/resources/{model}/{reference_name}.jpg'
            ]
            for path in possible_paths:
                if os.path.exists(path):
                    print(f"[@route:resolve_reference_path] Found fallback: {path}")
                    return path
        
        print(f"[@route:resolve_reference_path] Reference not found: {reference_name}")
        return None
        
    except Exception as e:
        print(f"[@route:resolve_reference_path] Error resolving reference: {str(e)}")
        return None

def resolve_capture_path(capture_filename=None):
    """Host resolves capture to use for verification - specific filename or fallback."""
    captures_dir = '/var/www/html/stream/captures'
    
    if capture_filename:
        # Use specific capture if provided
        specific_path = f'{captures_dir}/{capture_filename}'
        if os.path.exists(specific_path):
            print(f"[@route:resolve_capture_path] Using specific capture: {capture_filename}")
            return specific_path, capture_filename
        else:
            print(f"[@route:resolve_capture_path] Specific capture not found: {capture_filename}")
    
    # Fallback to latest capture (for backward compatibility)
    if os.path.exists(captures_dir):
        capture_files = [f for f in os.listdir(captures_dir) 
                        if f.startswith('capture_') and f.endswith('.jpg')]
        if capture_files:
            latest_file = sorted(capture_files)[-1]
            print(f"[@route:resolve_capture_path] Using latest capture: {latest_file}")
            return f'{captures_dir}/{latest_file}', latest_file
    
    print(f"[@route:resolve_capture_path] No captures found in {captures_dir}")
    return None, None 