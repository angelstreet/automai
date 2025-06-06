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
        
        # Build target path for cropped image
        target_path = f'/var/www/html/stream/captures/cropped_{reference_name}_{source_filename}'
        
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
                cropped_url = f'/stream/captures/cropped_{reference_name}_{source_filename}'
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
        
        # Build target path for processed image
        target_path = f'/var/www/html/stream/captures/processed_{reference_name}_{source_filename}'
        
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
            processed_url = f'/stream/captures/processed_{reference_name}_{source_filename}'
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
        source_path = f'/var/www/html/stream/captures/{cropped_filename}'
        
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
                "full_path": repo_target_path,
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
        
        # Git operations
        try:
            # Change to the web directory
            os.chdir('/var/www/html')
            
            # Git pull
            result = subprocess.run(['git', 'pull'], capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                print(f"[@route:host_save_resource] Git pull warning: {result.stderr}")
                # Continue anyway, just log warning
            
            # Git add
            subprocess.run(['git', 'add', f'stream/resources/{model}/{reference_name}.png'], check=True, timeout=10)
            subprocess.run(['git', 'add', 'resource.json'], check=True, timeout=10)
            
            # Git commit
            commit_message = f"save resource {reference_name}"
            subprocess.run(['git', 'commit', '-m', commit_message], check=True, timeout=10)
            
            # Git push
            subprocess.run(['git', 'push'], check=True, timeout=30)
            
            print(f"[@route:host_save_resource] Git operations completed successfully")
            
        except subprocess.TimeoutExpired:
            print(f"[@route:host_save_resource] Git operation timeout - continuing anyway")
        except subprocess.CalledProcessError as e:
            print(f"[@route:host_save_resource] Git operation warning: {str(e)} - continuing anyway")
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