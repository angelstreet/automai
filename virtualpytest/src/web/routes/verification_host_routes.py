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
        
        # Git operations using GitPython
        try:
            import git
            
            # Use simple relative path to git repository root
            repo_path = "../../../"
            print(f"[@route:host_save_resource] Using git repository: {repo_path}")
            
            # Open the git repository
            repo = git.Repo(repo_path)
            
            # Step 1: Git pull FIRST - before modifying any files
            print(f"[@route:host_save_resource] Executing git pull to get server changes...")
            try:
                origin = repo.remotes.origin
                origin.pull()
                print(f"[@route:host_save_resource] Git pull successful")
            except Exception as pull_error:
                print(f"[@route:host_save_resource] Git pull failed: {str(pull_error)}")
                # Continue anyway - we'll try to commit our changes
        
        except ImportError:
            print(f"[@route:host_save_resource] GitPython not available, skipping git operations")
        except Exception as e:
            print(f"[@route:host_save_resource] Git operation error: {str(e)} - continuing anyway")
        
        # Step 2: NOW modify files (copy images and update resource.json)
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
        
        # Step 3: Git add, commit, and push the changes
        try:
            import git
            repo = git.Repo("../../../")
            
            # Add files to git index
            print(f"[@route:host_save_resource] Adding files to git...")
            try:
                # Add the resource image (relative to repo root)
                image_git_path = f'virtualpytest/src/resources/{model}/{reference_name}.png'
                repo.index.add([image_git_path])
                
                # Add the resource.json file (relative to repo root)
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
            
            # Git push - requires token authentication
            print(f"[@route:host_save_resource] Pushing to remote...")
            try:
                # Require GitHub token for authentication
                github_token = os.environ.get('GITHUB_TOKEN')
                if not github_token:
                    print(f"[@route:host_save_resource] No GITHUB_TOKEN found - skipping push")
                    print(f"[@route:host_save_resource] Changes committed locally only")
                else:
                    print(f"[@route:host_save_resource] Using token authentication for push")
                    origin = repo.remotes.origin
                    original_url = origin.url
                    
                    # Replace https://github.com/ with https://token@github.com/
                    if original_url.startswith('https://github.com/'):
                        token_url = original_url.replace('https://github.com/', f'https://{github_token}@github.com/')
                        origin.set_url(token_url)
                        
                        try:
                            origin.push()
                            print(f"[@route:host_save_resource] Git push successful")
                        finally:
                            # Restore original URL
                            origin.set_url(original_url)
                    else:
                        print(f"[@route:host_save_resource] Remote URL not supported for token auth: {original_url}")
                        
            except Exception as push_error:
                print(f"[@route:host_save_resource] Git push failed: {str(push_error)}")
                print(f"[@route:host_save_resource] Changes committed locally only")
            
            print(f"[@route:host_save_resource] Git operations completed")
            
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
# HOST-SIDE REFERENCE STREAM AVAILABILITY ENDPOINT
# =====================================================

@verification_host_bp.route('/stream/ensure-reference-availability', methods=['POST'])
def host_ensure_reference_availability():
    """Ensure reference image is available in stream directory for preview."""
    try:
        data = request.get_json()
        reference_name = data.get('reference_name')
        model = data.get('model')
        
        print(f"[@route:host_ensure_reference_availability] Ensuring availability for: {reference_name} (model: {model})")
        
        # Validate required parameters
        if not reference_name or not model:
            return jsonify({
                'success': False,
                'error': 'reference_name and model are required'
            }), 400
        
        # Simple paths with dynamic model folder structure
        stream_target_path = f'/var/www/html/stream/resources/{model}/{reference_name}.png'
        repo_source_path = f'../resources/{model}/{reference_name}.png'
        
        # Check if already exists in stream directory
        if os.path.exists(stream_target_path):
            print(f"[@route:host_ensure_reference_availability] Already exists in stream directory")
            return jsonify({
                'success': True,
                'image_url': f'https://77.56.53.130:444/stream/resources/{model}/{reference_name}.png'
            })
        
        # Check if exists in git repository and copy it
        if os.path.exists(repo_source_path):
            # Create stream directory if needed
            os.makedirs(f'/var/www/html/stream/resources/{model}', exist_ok=True)
            
            # Copy from git repo to stream directory
            shutil.copy2(repo_source_path, stream_target_path)
            print(f"[@route:host_ensure_reference_availability] Copied from git repo to stream directory")
            
            return jsonify({
                'success': True,
                'image_url': f'https://77.56.53.130:444/stream/resources/{model}/{reference_name}.png'
            })
        
        # File not found anywhere
        return jsonify({
            'success': False,
            'error': f'Reference image not found: {reference_name}'
        }), 404
            
    except Exception as e:
        print(f"[@route:host_ensure_reference_availability] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error ensuring reference availability: {str(e)}'
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
        import cv2
        import shutil
        from controllers.verification.image import copy_reference_with_filtered_versions, crop_reference_image
        
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
            # Use the updated function that doesn't create filtered versions automatically
            success = crop_reference_image(source_path, source_result_path, area, create_filtered_versions=False)
            if not success:
                return {
                    'success': False,
                    'error': 'Failed to crop source image'
                }
        else:
            # Copy full source image
            shutil.copy2(source_path, source_result_path)
        
        # Apply filter to source image if user selected one
        if image_filter and image_filter != 'none':
            print(f"[@route:execute_image_verification_host] Applying {image_filter} filter to source image")
            from controllers.verification.image import apply_image_filter
            if not apply_image_filter(source_result_path, image_filter):
                print(f"[@route:execute_image_verification_host] Warning: Failed to apply {image_filter} filter to source")
        
        # === STEP 2: Handle Reference Image ===
        # Copy reference image and apply filter if needed
        if image_filter and image_filter != 'none':
            # User wants filtered comparison - check if filtered reference exists
            base_path, ext = os.path.splitext(image_path)
            filtered_reference_path = f"{base_path}_{image_filter}{ext}"
            
            if os.path.exists(filtered_reference_path):
                print(f"[@route:execute_image_verification_host] Using existing filtered reference: {filtered_reference_path}")
                shutil.copy2(filtered_reference_path, reference_result_path)
            else:
                print(f"[@route:execute_image_verification_host] Filtered reference not found, creating dynamically from original: {image_path}")
                # Copy original reference first
                shutil.copy2(image_path, reference_result_path)
                # Apply filter dynamically to the copied reference
                from controllers.verification.image import apply_image_filter
                if not apply_image_filter(reference_result_path, image_filter):
                    print(f"[@route:execute_image_verification_host] Warning: Failed to apply {image_filter} filter to reference, using original")
                    # If filter fails, copy original again to ensure clean state
                    shutil.copy2(image_path, reference_result_path)
                else:
                    print(f"[@route:execute_image_verification_host] Successfully applied {image_filter} filter to reference image")
        else:
            # User wants original comparison - use original reference
            print(f"[@route:execute_image_verification_host] Using original reference: {image_path}")
            shutil.copy2(image_path, reference_result_path)
        
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

def execute_text_verification_host(verification, source_path, model, verification_index, results_dir):
    """Execute text verification using existing text utilities."""
    try:
        import cv2
        import pytesseract
        import shutil
        from controllers.verification.image import crop_reference_image
        
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
        
        # Apply filter to source image if user selected one (can improve OCR accuracy)
        if image_filter and image_filter != 'none':
            print(f"[@route:execute_text_verification_host] Applying {image_filter} filter to source image for OCR")
            from controllers.verification.image import apply_image_filter
            if not apply_image_filter(source_result_path, image_filter):
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

def execute_adb_verification_host(verification, source_path, model, verification_index, results_dir):
    """Execute ADB verification using existing ADB utilities."""
    try:
        params = verification.get('params', {})
        command = verification.get('command', '')
        
        # Get element selector from inputValue (where client stores it)
        element_selector = verification.get('inputValue', '') or params.get('text', '')
        timeout = params.get('timeout', 10.0)
        
        print(f"[@route:execute_adb_verification_host] Command: {command}")
        print(f"[@route:execute_adb_verification_host] Element selector: '{element_selector}'")
        print(f"[@route:execute_adb_verification_host] Timeout: {timeout}s")
        print(f"[@route:execute_adb_verification_host] Available params: {list(params.keys())}")
        print(f"[@route:execute_adb_verification_host] Verification keys: {list(verification.keys())}")
        
        if not element_selector:
            return {
                'success': False,
                'error': 'No element selector specified for ADB verification',
                'verification_type': 'adb'
            }
        
        # Import ADB controller
        from controllers.verification.adb import ADBVerificationController
        from utils.sshUtils import SSHConnection
        
        # Create SSH connection (localhost since we're on the host)
        ssh_connection = SSHConnection()
        ssh_connection.connect('localhost', 22, 'root', password='your_password')  # Adjust credentials as needed
        
        # Get device ID from model
        device_id = get_device_id_from_model(model)
        if not device_id:
            return {
                'success': False,
                'error': f'No ADB device configured for model: {model}',
                'verification_type': 'adb'
            }
        
        # Initialize ADB controller
        adb_controller = ADBVerificationController(ssh_connection, device_id, model)
        
        # Execute verification based on command
        if command == 'adb_element_appear':
            success, message, result_data = adb_controller.waitForElementToAppear(element_selector, timeout)
        elif command == 'adb_element_disappear':
            success, message, result_data = adb_controller.waitForElementToDisappear(element_selector, timeout)
        else:
            return {
                'success': False,
                'error': f'Unknown ADB command: {command}',
                'verification_type': 'adb'
            }
        
        # Build comprehensive result
        result = {
            'success': success,
            'message': message,
            'verification_type': 'adb',
            'command': command,
            'element_selector': element_selector,
            'timeout': timeout,
            'device_id': device_id,
            'model': model
        }
        
        # Add result data if available
        if result_data:
            result.update({
                'search_term': result_data.get('search_term'),
                'wait_time': result_data.get('wait_time'),
                'total_matches': result_data.get('total_matches', 0),
                'matches': result_data.get('matches', []),
                'successful_term': result_data.get('successful_term'),
                'attempted_terms': result_data.get('attempted_terms', []),
                'search_details': result_data.get('search_details', {}),
                'timeout_reached': result_data.get('timeout_reached', False),
                'infrastructure_error': result_data.get('infrastructure_error', False)
            })
            
            # Add specific data for disappear verification
            if command == 'adb_element_disappear':
                result.update({
                    'element_still_present': result_data.get('element_still_present', False),
                    'still_present_elements': result_data.get('still_present_elements', []),
                    'total_still_present': result_data.get('total_still_present', 0)
                })
        
        print(f"[@route:execute_adb_verification_host] Verification completed: {success}")
        if success:
            print(f"[@route:execute_adb_verification_host] Success message: {message}")
        else:
            print(f"[@route:execute_adb_verification_host] Failure message: {message}")
            
        return result
        
    except Exception as e:
        print(f"[@route:execute_adb_verification_host] Error: {str(e)}")
        return {
            'success': False,
            'error': f'ADB verification error: {str(e)}',
            'verification_type': 'adb'
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

def get_device_id_from_model(model):
    """
    Get ADB device ID from model name.
    This should be configured based on your setup.
    """
    # TODO: Configure this mapping based on your actual device setup
    device_mapping = {
        'android_mobile': '192.168.1.100:5555',  # Example mapping
        'android_tablet': '192.168.1.101:5555',
        'default': '192.168.1.100:5555'
    }
    
    device_id = device_mapping.get(model, device_mapping.get('default'))
    print(f"[@route:get_device_id_from_model] Model '{model}' mapped to device: {device_id}")
    return device_id

# =====================================================
# HOST-SIDE TEXT AUTO-DETECTION ENDPOINT
# =====================================================

@verification_host_bp.route('/stream/text-auto-detect', methods=['POST'])
def host_text_auto_detect():
    """Host-side endpoint to perform OCR text auto-detection on cropped image area."""
    try:
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
        
        # Build source path - assume images are in /var/www/html/stream/captures/
        source_path = f'/var/www/html/stream/captures/{source_filename}'
        
        # Build target path for cropped preview in dedicated cropped folder
        cropped_dir = '/var/www/html/stream/captures/cropped'
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
        
        # Import and use existing cropping function
        try:
            from controllers.verification.image import crop_reference_image
            
            # Crop the image area
            success = crop_reference_image(source_path, target_path, area)
            
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
            try:
                from controllers.verification.image import apply_image_filter
                if not apply_image_filter(target_path, image_filter):
                    print(f"[@route:host_text_auto_detect] Warning: Failed to apply {image_filter} filter")
            except ImportError:
                print(f"[@route:host_text_auto_detect] Warning: Image filter utilities not available")
        
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
                        'preview_url': f'/stream/captures/cropped/{target_filename}'  # Still provide preview
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

@verification_host_bp.route('/stream/save-text-resource', methods=['POST'])
def host_save_text_resource():
    """Host-side endpoint to save text references directly to resource.json without image files."""
    try:
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
        resource_dir = f'../resources/{model}'
        os.makedirs(resource_dir, exist_ok=True)
        
        # Build resource JSON path
        resource_json_path = '../config/resource/resource.json'
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
# HOST-SIDE ADB VERIFICATION ENDPOINTS
# =====================================================

@verification_host_bp.route('/stream/adb-element-lists', methods=['POST'])
def host_adb_element_lists():
    """Get ADB UI element lists using existing ADB controller."""
    try:
        data = request.get_json()
        model = data.get('model', 'default')
        search_term = data.get('search_term', '')
        
        print(f"[@route:host_adb_element_lists] Getting ADB element lists for model: {model}")
        if search_term:
            print(f"[@route:host_adb_element_lists] With search term: '{search_term}'")
        
        # Import ADB controller
        from controllers.verification.adb import ADBVerificationController
        from utils.sshUtils import SSHConnection
        
        # Create SSH connection (localhost since we're on the host)
        ssh_connection = SSHConnection()
        ssh_connection.connect('localhost', 22, 'root', password='your_password')  # Adjust credentials as needed
        
        # Get device ID from model (you may need to adjust this mapping)
        device_id = get_device_id_from_model(model)
        if not device_id:
            return jsonify({
                'success': False,
                'error': f'No ADB device configured for model: {model}'
            }), 400
        
        # Initialize ADB controller
        adb_controller = ADBVerificationController(ssh_connection, device_id, model)
        
        if search_term:
            # Use smart search functionality
            success, result_data, error = adb_controller.getElementListsWithSmartSearch(search_term)
        else:
            # Get all elements
            success, elements, error = adb_controller.getElementLists()
            result_data = {
                'total_elements': len(elements),
                'elements': elements,
                'device_info': {
                    'device_id': device_id,
                    'device_name': model
                }
            }
        
        if success:
            print(f"[@route:host_adb_element_lists] Success: {result_data.get('total_elements', 0)} elements")
            return jsonify({
                'success': True,
                'data': result_data
            })
        else:
            print(f"[@route:host_adb_element_lists] Failed: {error}")
            return jsonify({
                'success': False,
                'error': error
            }), 500
            
    except Exception as e:
        print(f"[@route:host_adb_element_lists] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB element lists error: {str(e)}'
        }), 500

@verification_host_bp.route('/stream/adb-wait-element-appear', methods=['POST'])
def host_adb_wait_element_appear():
    """Wait for ADB element to appear using existing ADB controller."""
    try:
        data = request.get_json()
        search_term = data.get('search_term', '')
        timeout = data.get('timeout', 10.0)
        model = data.get('model', 'default')
        
        print(f"[@route:host_adb_wait_element_appear] Waiting for element: '{search_term}' (timeout: {timeout}s)")
        
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Import ADB controller
        from controllers.verification.adb import ADBVerificationController
        from utils.sshUtils import SSHConnection
        
        # Create SSH connection (localhost since we're on the host)
        ssh_connection = SSHConnection()
        ssh_connection.connect('localhost', 22, 'root', password='your_password')  # Adjust credentials as needed
        
        # Get device ID from model
        device_id = get_device_id_from_model(model)
        if not device_id:
            return jsonify({
                'success': False,
                'error': f'No ADB device configured for model: {model}'
            }), 400
        
        # Initialize ADB controller
        adb_controller = ADBVerificationController(ssh_connection, device_id, model)
        
        # Wait for element to appear
        success, message, result_data = adb_controller.waitForElementToAppear(search_term, timeout)
        
        if success:
            print(f"[@route:host_adb_wait_element_appear] Success: {message}")
            return jsonify({
                'success': True,
                'message': message,
                'data': result_data
            })
        else:
            print(f"[@route:host_adb_wait_element_appear] Failed: {message}")
            return jsonify({
                'success': False,
                'message': message,
                'data': result_data
            }), 200  # Return 200 but success=False for timeout/not found
            
    except Exception as e:
        print(f"[@route:host_adb_wait_element_appear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB wait element appear error: {str(e)}'
        }), 500

@verification_host_bp.route('/stream/adb-wait-element-disappear', methods=['POST'])
def host_adb_wait_element_disappear():
    """Wait for ADB element to disappear using existing ADB controller."""
    try:
        data = request.get_json()
        search_term = data.get('search_term', '')
        timeout = data.get('timeout', 10.0)
        model = data.get('model', 'default')
        
        print(f"[@route:host_adb_wait_element_disappear] Waiting for element to disappear: '{search_term}' (timeout: {timeout}s)")
        
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Import ADB controller
        from controllers.verification.adb import ADBVerificationController
        from utils.sshUtils import SSHConnection
        
        # Create SSH connection (localhost since we're on the host)
        ssh_connection = SSHConnection()
        ssh_connection.connect('localhost', 22, 'root', password='your_password')  # Adjust credentials as needed
        
        # Get device ID from model
        device_id = get_device_id_from_model(model)
        if not device_id:
            return jsonify({
                'success': False,
                'error': f'No ADB device configured for model: {model}'
            }), 400
        
        # Initialize ADB controller
        adb_controller = ADBVerificationController(ssh_connection, device_id, model)
        
        # Wait for element to disappear
        success, message, result_data = adb_controller.waitForElementToDisappear(search_term, timeout)
        
        if success:
            print(f"[@route:host_adb_wait_element_disappear] Success: {message}")
            return jsonify({
                'success': True,
                'message': message,
                'data': result_data
            })
        else:
            print(f"[@route:host_adb_wait_element_disappear] Failed: {message}")
            return jsonify({
                'success': False,
                'message': message,
                'data': result_data
            }), 200  # Return 200 but success=False for timeout/still present
            
    except Exception as e:
        print(f"[@route:host_adb_wait_element_disappear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB wait element disappear error: {str(e)}'
        }), 500 