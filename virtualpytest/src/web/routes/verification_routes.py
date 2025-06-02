"""
Verification Routes

This module contains the verification API endpoints for:
- Image verification (waitForImageToAppear, waitForImageToDisappear)
- Text verification (waitForTextToAppear, waitForTextToDisappear)
- Node verification execution
"""

from flask import Blueprint, request, jsonify, send_from_directory
import time
import os
import sys
import re
import json
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .utils import check_controllers_available

# Create blueprint
verification_bp = Blueprint('verification', __name__)

# =====================================================
# VERIFICATION ACTIONS DEFINITION
# =====================================================

@verification_bp.route('/api/virtualpytest/verification/actions', methods=['GET'])
def get_verification_actions():
    """Get available verification actions for all verification controllers."""
    try:
        # Define available verifications following the same pattern as remote actions
        verifications = {
            'image': [
                {
                    'id': 'wait_for_image_appear',
                    'label': 'Wait for Image to Appear',
                    'command': 'waitForImageToAppear',
                    'params': {
                        'image_path': '',
                        'timeout': 10.0,
                        'threshold': 0.8,
                        'area': None
                    },
                    'description': 'Wait for specific image to appear on screen',
                    'requiresInput': True,
                    'inputLabel': 'Image Path',
                    'inputPlaceholder': 'button.png'
                },
                {
                    'id': 'wait_for_image_disappear',
                    'label': 'Wait for Image to Disappear',
                    'command': 'waitForImageToDisappear',
                    'params': {
                        'image_path': '',
                        'timeout': 10.0,
                        'threshold': 0.8,
                        'area': None
                    },
                    'description': 'Wait for specific image to disappear from screen',
                    'requiresInput': True,
                    'inputLabel': 'Image Path',
                    'inputPlaceholder': 'loading.png'
                }
            ],
            'text': [
                {
                    'id': 'wait_for_text_appear',
                    'label': 'Wait for Text to Appear',
                    'command': 'waitForTextToAppear',
                    'params': {
                        'text': '',
                        'timeout': 10.0,
                        'case_sensitive': False,
                        'area': None
                    },
                    'description': 'Wait for specific text to appear on screen',
                    'requiresInput': True,
                    'inputLabel': 'Text',
                    'inputPlaceholder': 'Welcome'
                },
                {
                    'id': 'wait_for_text_disappear',
                    'label': 'Wait for Text to Disappear',
                    'command': 'waitForTextToDisappear',
                    'params': {
                        'text': '',
                        'timeout': 10.0,
                        'case_sensitive': False,
                        'area': None
                    },
                    'description': 'Wait for specific text to disappear from screen',
                    'requiresInput': True,
                    'inputLabel': 'Text',
                    'inputPlaceholder': 'Loading...'
                }
            ]
        }
        
        return jsonify({
            'success': True,
            'controller_type': 'verification',
            'verifications': verifications
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error getting verification actions: {str(e)}'
        }), 500

# =====================================================
# VERIFICATION CONTROLLER MANAGEMENT
# =====================================================

@verification_bp.route('/api/virtualpytest/verification/take-control', methods=['POST'])
def take_verification_control():
    """Initialize verification controllers with AV controller."""
    try:
        import app
        from controllers.verification.image import ImageVerificationController
        from controllers.verification.text import TextVerificationController
        
        data = request.get_json()
        av_controller_type = data.get('av_controller_type', 'android_mobile')
        
        # Get the appropriate AV controller from the app
        av_controller = None
        if av_controller_type == 'android_mobile' and hasattr(app, 'android_mobile_controller'):
            av_controller = app.android_mobile_controller
        elif av_controller_type == 'android_tv' and hasattr(app, 'android_tv_session'):
            av_controller = app.android_tv_session.get('controller')
        else:
            return jsonify({
                'success': False,
                'error': f'No active {av_controller_type} controller found'
            }), 400
        
        if not av_controller or not av_controller.is_connected:
            return jsonify({
                'success': False,
                'error': f'{av_controller_type} controller not connected'
            }), 400
        
        # Initialize verification controllers
        app.image_verification_controller = ImageVerificationController(av_controller)
        app.text_verification_controller = TextVerificationController(av_controller)
        
        return jsonify({
            'success': True,
            'message': f'Verification controllers initialized with {av_controller_type} controller',
            'av_controller_type': av_controller_type,
            'controllers_available': ['image', 'text']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Verification controller initialization error: {str(e)}'
        }), 500

@verification_bp.route('/api/virtualpytest/verification/release-control', methods=['POST'])
def release_verification_control():
    """Release verification controllers."""
    try:
        import app
        
        # Release controllers
        if hasattr(app, 'image_verification_controller'):
            app.image_verification_controller = None
        if hasattr(app, 'text_verification_controller'):
            app.text_verification_controller = None
        
        return jsonify({
            'success': True,
            'message': 'Verification controllers released'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Release error: {str(e)}'
        }), 500

@verification_bp.route('/api/virtualpytest/verification/status', methods=['GET'])
def get_verification_status():
    """Get verification controllers status."""
    try:
        import app
        
        status = {
            'image_controller_available': hasattr(app, 'image_verification_controller') and app.image_verification_controller is not None,
            'text_controller_available': hasattr(app, 'text_verification_controller') and app.text_verification_controller is not None,
            'controllers': {}
        }
        
        if status['image_controller_available']:
            status['controllers']['image'] = app.image_verification_controller.get_status()
        
        if status['text_controller_available']:
            status['controllers']['text'] = app.text_verification_controller.get_status()
        
        return jsonify({
            'success': True,
            'status': status
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Status check error: {str(e)}'
        }), 500

# =====================================================
# VERIFICATION EXECUTION
# =====================================================

@verification_bp.route('/api/virtualpytest/verification/execute', methods=['POST'])
def execute_verification():
    """Execute a verification from node metadata (follows the same pattern as execute_android_mobile_action)."""
    try:
        import app
        
        data = request.get_json()
        verification_data = data.get('verification')
        node_id = data.get('node_id')
        tree_id = data.get('tree_id')
        
        if not verification_data:
            return jsonify({
                'success': False,
                'error': 'Verification data is required'
            }), 400
        
        verification_id = verification_data.get('id')
        command = verification_data.get('command')
        params = verification_data.get('params', {})
        controller_type = verification_data.get('controller_type', 'image')
        
        if not verification_id or not command:
            return jsonify({
                'success': False,
                'error': 'Verification ID and command are required'
            }), 400
        
        print(f"[@route:execute_verification] Executing verification {verification_id}: {command} with params: {params}")
        
        # Get the appropriate verification controller
        controller = None
        if controller_type == 'image':
            if not hasattr(app, 'image_verification_controller') or not app.image_verification_controller:
                return jsonify({
                    'success': False,
                    'error': 'Image verification controller not initialized'
                }), 400
            controller = app.image_verification_controller
        elif controller_type == 'text':
            if not hasattr(app, 'text_verification_controller') or not app.text_verification_controller:
                return jsonify({
                    'success': False,
                    'error': 'Text verification controller not initialized'
                }), 400
            controller = app.text_verification_controller
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown controller type: {controller_type}'
            }), 400
        
        success = False
        message = ""
        
        # Execute based on the command type
        if command == 'waitForImageToAppear':
            success, message = controller.waitForImageToAppear(
                image_path=params.get('image_path'),
                timeout=params.get('timeout', 10.0),
                threshold=params.get('threshold', 0.8),
                area=params.get('area'),
                image_list=params.get('image_list')
            )
            
        elif command == 'waitForImageToDisappear':
            success, message = controller.waitForImageToDisappear(
                image_path=params.get('image_path'),
                timeout=params.get('timeout', 10.0),
                threshold=params.get('threshold', 0.8),
                area=params.get('area'),
                image_list=params.get('image_list')
            )
            
        elif command == 'waitForTextToAppear':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for waitForTextToAppear command'
                }), 400
            
            success, message = controller.waitForTextToAppear(
                text=text,
                timeout=params.get('timeout', 10.0),
                case_sensitive=params.get('case_sensitive', False),
                area=params.get('area'),
                image_list=params.get('image_list')
            )
            
        elif command == 'waitForTextToDisappear':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for waitForTextToDisappear command'
                }), 400
            
            success, message = controller.waitForTextToDisappear(
                text=text,
                timeout=params.get('timeout', 10.0),
                case_sensitive=params.get('case_sensitive', False),
                area=params.get('area'),
                image_list=params.get('image_list')
            )
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown verification command: {command}'
            }), 400
        
        return jsonify({
            'success': success,
            'message': message,
            'verification_id': verification_id,
            'command': command,
            'controller_type': controller_type,
            'node_id': node_id,
            'tree_id': tree_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Verification execution error: {str(e)}'
        }), 500

# =====================================================
# BATCH VERIFICATION EXECUTION
# =====================================================

@verification_bp.route('/api/virtualpytest/verification/execute-batch', methods=['POST'])
def execute_batch_verification():
    """Execute multiple verifications from a node (if node has verifications array)."""
    try:
        import app
        
        data = request.get_json()
        verifications = data.get('verifications', [])
        node_id = data.get('node_id')
        tree_id = data.get('tree_id')
        model = data.get('model', 'default')  # Get model name for organizing output images
        
        if not verifications:
            return jsonify({
                'success': False,
                'error': 'No verifications provided'
            }), 400
        
        print(f"[@route:execute_batch_verification] Executing {len(verifications)} verifications for node {node_id} with model {model}")
        
        results = []
        all_passed = True
        
        for verification_index, verification in enumerate(verifications):
            # Execute each verification individually
            result = {
                'verification_id': verification.get('id'),
                'success': False,
                'message': '',
                'error': None
            }
            
            try:
                # Simulate the single verification execution
                verification_id = verification.get('id')
                command = verification.get('command')
                params = verification.get('params', {})
                controller_type = verification.get('controller_type', 'image')
                
                print(f"[@route:execute_batch_verification] Executing verification {verification_index}: {verification_id}")
                print(f"  Command: {command}")
                print(f"  Controller: {controller_type}")
                print(f"  Params: {params}")
                if params.get('area'):
                    print(f"  Area coordinates: {params.get('area')}")
                
                # Get controller
                controller = None
                if controller_type == 'image':
                    controller = app.image_verification_controller
                elif controller_type == 'text':
                    controller = app.text_verification_controller
                
                if not controller:
                    result['error'] = f'Controller {controller_type} not available'
                    all_passed = False
                    results.append(result)
                    continue
                
                # Execute verification with new signature
                success = False
                message = ""
                additional_data = {}
                
                if command == 'waitForImageToAppear':
                    success, message, additional_data = controller.waitForImageToAppear(
                        image_path=params.get('image_path'),
                        timeout=params.get('timeout', 10.0),
                        threshold=params.get('threshold', 0.8),
                        area=params.get('area'),
                        image_list=params.get('image_list'),
                        model=model,
                        verification_index=verification_index,
                        image_filter=params.get('image_filter', 'none')
                    )
                    
                elif command == 'waitForImageToDisappear':
                    success, message, additional_data = controller.waitForImageToDisappear(
                        image_path=params.get('image_path'),
                        timeout=params.get('timeout', 10.0),
                        threshold=params.get('threshold', 0.8),
                        area=params.get('area'),
                        image_list=params.get('image_list'),
                        model=model,
                        verification_index=verification_index,
                        image_filter=params.get('image_filter', 'none')
                    )
                    
                elif command == 'waitForTextToAppear':
                    text = params.get('text')
                    if not text:
                        return jsonify({
                            'success': False,
                            'error': 'Text parameter required for waitForTextToAppear command'
                        }), 400
                    
                    success, message, additional_data = controller.waitForTextToAppear(
                        text=text,
                        timeout=params.get('timeout', 10.0),
                        case_sensitive=params.get('case_sensitive', False),
                        area=params.get('area'),
                        image_list=params.get('image_list'),
                        model=model,
                        verification_index=verification_index,
                        image_filter=params.get('image_filter', 'none')
                    )
                    
                elif command == 'waitForTextToDisappear':
                    text = params.get('text')
                    if not text:
                        return jsonify({
                            'success': False,
                            'error': 'Text parameter required for waitForTextToDisappear command'
                        }), 400
                    
                    success, message, additional_data = controller.waitForTextToDisappear(
                        text=text,
                        timeout=params.get('timeout', 10.0),
                        case_sensitive=params.get('case_sensitive', False),
                        area=params.get('area'),
                        image_list=params.get('image_list'),
                        model=model,
                        verification_index=verification_index,
                        image_filter=params.get('image_filter', 'none')
                    )
                
                # Ensure we have a message, include threshold info for image verifications
                if not message:
                    if controller_type == 'image':
                        threshold_val = params.get('threshold', 0.8)
                        message = f'Verification {verification_id} {"passed" if success else "failed"} (threshold: {threshold_val})'
                    else:
                        message = f'Verification {verification_id} {"passed" if success else "failed"}'
                
                result['success'] = success
                result['message'] = message
                
                # Include additional data for UI thumbnails
                if additional_data:
                    # Convert absolute paths to relative URLs for web access
                    if 'source_image_path' in additional_data:
                        # Convert /path/to/tmp/model/verification_x/source_cropped.png to /api/virtualpytest/tmp/model/verification_x/source_cropped.png
                        source_path = additional_data['source_image_path']
                        if '/tmp/' in source_path:
                            relative_path = source_path.split('/tmp/')[-1]
                            additional_data['source_image_url'] = f'/api/virtualpytest/tmp/{relative_path}'
                    
                    if 'reference_image_path' in additional_data:
                        # Convert absolute reference path to relative URL
                        ref_path = additional_data['reference_image_path']
                        if '/resources/' in ref_path:
                            # Extract model and filename from path like /path/to/resources/model/filename.png
                            path_parts = ref_path.split('/resources/')[-1].split('/')
                            if len(path_parts) >= 2:
                                ref_model = path_parts[0]
                                ref_filename = path_parts[1]
                                additional_data['reference_image_url'] = f'/api/virtualpytest/reference/image/{ref_model}/{ref_filename}'
                        elif '/tmp/' in ref_path:
                            # Handle filtered reference images saved to tmp directory
                            relative_path = ref_path.split('/tmp/')[-1]
                            additional_data['reference_image_url'] = f'/api/virtualpytest/tmp/{relative_path}'
                    
                    result.update(additional_data)
                
                print(f"[@route:execute_batch_verification] Result: {result}")
                
                if not success:
                    all_passed = False
                    
            except Exception as e:
                result['error'] = str(e)
                all_passed = False
            
            results.append(result)
        
        return jsonify({
            'success': all_passed,
            'message': f'Batch verification {"passed" if all_passed else "failed"} ({len([r for r in results if r["success"]])}/{len(results)} passed)',
            'node_id': node_id,
            'tree_id': tree_id,
            'model': model,
            'total_verifications': len(verifications),
            'passed_count': len([r for r in results if r['success']]),
            'failed_count': len([r for r in results if not r['success']]),
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Batch verification execution error: {str(e)}'
        }), 500


# =====================================================
# REFERENCE IMAGE CAPTURE
# =====================================================

@verification_bp.route('/api/virtualpytest/reference/capture', methods=['POST'])
def capture_reference_image():
    """Crop and save a reference image from a source screenshot or frame."""
    try:
        data = request.get_json()
        area = data.get('area')
        source_path = data.get('source_path')
        reference_name = data.get('reference_name')
        
        print(f"[@route:capture_reference_image] Capturing reference image from {source_path} with area: {area}")
        
        # Validate required parameters
        if not area or not source_path or not reference_name:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: area, source_path, or reference_name'
            }), 400
            
        # Ensure target directory exists
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        target_dir = os.path.join(base_dir, 'tmp', 'model')
        os.makedirs(target_dir, exist_ok=True)
        
        # Define target path
        target_path = os.path.join(target_dir, f"{reference_name}.png")
        
        # Import the crop function from image controller
        from controllers.verification.image import crop_reference_image
        
        # Crop and save reference image
        success = crop_reference_image(source_path, target_path, area)
        
        if success:
            # Return success with image info
            relative_path = f"/api/virtualpytest/reference/image/{reference_name}.png"
            return jsonify({
                'success': True,
                'message': f'Reference image saved: {reference_name}',
                'image_path': target_path,
                'image_url': relative_path
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to crop and save reference image'
            }), 500
            
    except Exception as e:
        print(f"[@route:capture_reference_image] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reference capture error: {str(e)}'
        }), 500

@verification_bp.route('/api/virtualpytest/reference/save', methods=['POST'])
def save_reference_image():
    """Save the temporary capture.png to the resources folder with proper naming and update registry."""
    try:
        data = request.get_json()
        reference_name = data.get('reference_name')
        model_name = data.get('model_name')
        area = data.get('area')
        
        print(f"[@route:save_reference_image] Saving reference: {reference_name} for model: {model_name} with area: {area}")
        
        # Validate required parameters
        if not reference_name or not model_name or not area:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: reference_name, model_name, or area'
            }), 400
            
        # Validate area structure
        if not isinstance(area, dict) or not all(key in area for key in ['x', 'y', 'width', 'height']):
            return jsonify({
                'success': False,
                'error': 'Area must be an object with x, y, width, height properties'
            }), 400
            
        # Define paths
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        temp_file = os.path.join(base_dir, 'tmp', 'model', 'capture.png')
        
        # Ensure resources directory exists
        resources_dir = os.path.join(base_dir, 'resources', model_name)
        os.makedirs(resources_dir, exist_ok=True)
        
        # Define final path
        final_path = os.path.join(resources_dir, f"{reference_name}.png")
        
        # Check if temporary file exists
        if not os.path.exists(temp_file):
            return jsonify({
                'success': False,
                'error': 'No temporary capture found. Please capture an image first.'
            }), 400
        
        # Copy/move the temporary file to the final location
        import shutil
        shutil.copy2(temp_file, final_path)
        
        # Update resource registry
        registry_path = os.path.join(base_dir, 'config', 'resource', 'resource.json')
        
        # Load existing registry
        registry_data = {'resources': []}
        if os.path.exists(registry_path):
            try:
                with open(registry_path, 'r') as f:
                    registry_data = json.load(f)
            except (json.JSONDecodeError, IOError):
                registry_data = {'resources': []}
        
        # Ensure resources key exists
        if 'resources' not in registry_data:
            registry_data['resources'] = []
        
        # Create resource entry with required area coordinates
        resource_entry = {
            'name': reference_name,
            'model': model_name,
            'path': f"resources/{model_name}/{reference_name}.png",
            'full_path': final_path,
            'created_at': datetime.now().isoformat(),
            'type': 'reference_image',
            'area': {
                'x': int(area['x']),
                'y': int(area['y']),
                'width': int(area['width']),
                'height': int(area['height'])
            }
        }
        
        print(f"[@route:save_reference_image] Saved area coordinates: {resource_entry['area']}")
        
        # Check if resource already exists (update instead of duplicate)
        existing_index = -1
        for i, resource in enumerate(registry_data['resources']):
            if resource.get('name') == reference_name and resource.get('model') == model_name:
                existing_index = i
                break
        
        if existing_index >= 0:
            # Update existing entry
            registry_data['resources'][existing_index] = resource_entry
            print(f"[@route:save_reference_image] Updated existing resource: {reference_name}")
        else:
            # Add new entry
            registry_data['resources'].append(resource_entry)
            print(f"[@route:save_reference_image] Added new resource: {reference_name}")
        
        # Save updated registry
        os.makedirs(os.path.dirname(registry_path), exist_ok=True)
        with open(registry_path, 'w') as f:
            json.dump(registry_data, f, indent=2)
        
        print(f"[@route:save_reference_image] Reference saved successfully: {final_path}")
        
        return jsonify({
            'success': True,
            'message': f'Reference image saved: {reference_name}',
            'resource_path': f"resources/{model_name}/{reference_name}.png",
            'full_path': final_path,
            'area': resource_entry['area']
        })
        
    except Exception as e:
        print(f"[@route:save_reference_image] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reference save error: {str(e)}'
        }), 500

@verification_bp.route('/api/virtualpytest/reference/image/<path:filename>', methods=['GET'])
def get_reference_image(filename):
    """Serve a reference image from tmp or resources folder."""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        # Check if it's a model-based path (contains '/')
        if '/' in filename:
            # Model-based path: resources/{model}/{reference_name}.png
            resources_dir = os.path.join(base_dir, 'resources')
            file_path = os.path.join(resources_dir, filename)
            serve_dir = resources_dir
            relative_path = filename
        else:
            # Single filename: tmp/model/{filename}
            model_dir = os.path.join(base_dir, 'tmp', 'model')
            file_path = os.path.join(model_dir, filename)
            serve_dir = model_dir
            relative_path = filename
        
        print(f"[@route:get_reference_image] Looking for image: {filename} at path: {file_path}")
        
        if not os.path.exists(file_path):
            print(f"[@route:get_reference_image] File not found: {file_path}")
            return jsonify({
                'success': False,
                'error': f'Reference image not found: {filename}'
            }), 404
        
        print(f"[@route:get_reference_image] Serving image: {file_path}")
        from flask import make_response
        
        # For model-based paths, we need to handle subdirectories
        if '/' in filename:
            # Split the path to get directory and filename
            path_parts = filename.split('/')
            subdirs = '/'.join(path_parts[:-1])
            actual_filename = path_parts[-1]
            actual_serve_dir = os.path.join(serve_dir, subdirs)
            
            response = make_response(send_from_directory(
                actual_serve_dir,
                actual_filename,
                mimetype='image/png'
            ))
        else:
            response = make_response(send_from_directory(
                serve_dir, 
                relative_path,
                mimetype='image/png'
            ))
        
        # Prevent caching to ensure fresh images
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response
    except Exception as e:
        print(f"[@route:get_reference_image] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve reference image: {str(e)}'
        }), 500

@verification_bp.route('/api/virtualpytest/reference/list', methods=['GET'])
def list_reference_images():
    """List all available reference images and text references from resource.json."""
    try:
        print(f"[@route:list_reference_images] Listing available reference images and text references")
        
        base_dir = os.path.join(os.path.dirname(__file__), '..', '..')
        registry_path = os.path.join(base_dir, 'config', 'resource', 'resource.json')
        
        all_references = []
        
        if os.path.exists(registry_path):
            with open(registry_path, 'r') as f:
                registry_data = json.load(f)
            
            # Process the flat resources array
            for resource in registry_data.get('resources', []):
                if isinstance(resource, dict):
                    # Determine type based on existing type field or infer from structure
                    resource_type = resource.get('type', 'reference_image')
                    
                    if resource_type == 'reference_image':
                        # Image reference
                        reference = {
                            'name': resource.get('name', ''),
                            'model': resource.get('model', ''),
                            'path': resource.get('path', ''),
                            'full_path': resource.get('full_path', ''),
                            'created_at': resource.get('created_at', ''),
                            'type': 'image',
                            'area': resource.get('area', {})
                        }
                        all_references.append(reference)
                    elif resource_type == 'text_reference':
                        # Text reference
                        reference = {
                            'name': resource.get('name', ''),
                            'model': resource.get('model', ''),
                            'path': '',  # No file path for text references
                            'full_path': '',  # No file path for text references
                            'created_at': resource.get('created_at', ''),
                            'type': 'text',
                            'area': resource.get('area', {}),
                            'text': resource.get('text', ''),
                            'font_size': resource.get('font_size'),
                            'confidence': resource.get('confidence')
                        }
                        all_references.append(reference)
        
        print(f"[@route:list_reference_images] Found {len(all_references)} references total")
        return jsonify({
            'success': True,
            'references': all_references
        })
        
    except Exception as e:
        print(f"[@route:list_reference_images] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'references': []
        }), 500

# =====================================================
# SERVE TEMPORARY IMAGES
# =====================================================

@verification_bp.route('/api/virtualpytest/tmp/<path:filename>', methods=['GET'])
def serve_tmp_image(filename):
    """Serve temporary images from the /tmp directory for UI comparison display."""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        tmp_dir = os.path.join(base_dir, 'tmp')
        
        # Security check - ensure path is within tmp directory
        requested_path = os.path.join(tmp_dir, filename)
        canonical_tmp = os.path.realpath(tmp_dir)
        canonical_requested = os.path.realpath(requested_path)
        
        if not canonical_requested.startswith(canonical_tmp):
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        if not os.path.exists(requested_path):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        # Determine file extension for content type
        file_ext = os.path.splitext(filename)[1].lower()
        content_type = 'image/png'
        if file_ext == '.jpg' or file_ext == '.jpeg':
            content_type = 'image/jpeg'
        
        return send_from_directory(tmp_dir, filename, mimetype=content_type)
        
    except Exception as e:
        print(f"[@route:serve_tmp_image] Error serving tmp image {filename}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error serving image: {str(e)}'
        }), 500

@verification_bp.route('/api/virtualpytest/reference/text/auto-detect', methods=['POST'])
def auto_detect_text():
    """Auto-detect text in the specified area using OCR"""
    try:
        data = request.get_json()
        model = data.get('model')
        area = data.get('area')  # {x, y, width, height}
        
        if not model or not area:
            return jsonify({'error': 'Model and area are required'}), 400
            
        print(f"[@route:auto_detect_text] Starting text auto-detection for model: {model}, area: {area}")
        
        # Get the appropriate AV controller from the app instance
        import app
        av_controller = None
        
        # Try to get active AV controller based on the model name
        if model == 'android_mobile' and hasattr(app, 'android_mobile_controller'):
            av_controller = app.android_mobile_controller
        elif model == 'android_tv' and hasattr(app, 'android_tv_session'):
            av_controller = app.android_tv_session.get('controller')
        else:
            # Default fallback - try android_mobile first
            if hasattr(app, 'android_mobile_controller') and app.android_mobile_controller:
                av_controller = app.android_mobile_controller
            elif hasattr(app, 'android_tv_session') and app.android_tv_session:
                av_controller = app.android_tv_session.get('controller')
        
        if not av_controller or not av_controller.is_connected:
            return jsonify({
                'success': False,
                'error': f'No active AV controller found for model {model}. Please ensure the controller is connected.'
            }), 400
        
        capture_path = av_controller.capture_screen()
        
        if not capture_path:
            return jsonify({'error': 'Failed to capture screen'}), 500
            
        # Initialize text verification controller for OCR
        from controllers.verification.text import TextVerificationController
        text_controller = TextVerificationController(av_controller)
        
        # Use OCR to extract text from the specified area
        import cv2
        import pytesseract
        
        # Load the captured image
        image = cv2.imread(capture_path)
        if image is None:
            return jsonify({'error': 'Failed to load captured image'}), 500
            
        # Crop to the specified area
        x, y, width, height = int(area['x']), int(area['y']), int(area['width']), int(area['height'])
        cropped_image = image[y:y+height, x:x+width]
        
        # Use tesseract to extract text and get detailed information
        try:
            # Get text with confidence data
            data_dict = pytesseract.image_to_data(cropped_image, output_type=pytesseract.Output.DICT)
            
            # Extract text and calculate average confidence
            words = []
            confidences = []
            font_sizes = []
            
            for i in range(len(data_dict['text'])):
                text = data_dict['text'][i].strip()
                conf = int(data_dict['conf'][i])
                height = int(data_dict['height'][i])
                
                if text and conf > 0:  # Only include confident text
                    words.append(text)
                    confidences.append(conf)
                    font_sizes.append(height)
            
            if not words:
                return jsonify({
                    'success': False,
                    'error': 'No text detected in the specified area'
                }), 400
                
            # Combine all detected text
            detected_text = ' '.join(words)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            avg_font_size = sum(font_sizes) / len(font_sizes) if font_sizes else 12
            
            print(f"[@route:auto_detect_text] Detected text: '{detected_text}' with confidence: {avg_confidence:.1f}%")
            
            return jsonify({
                'success': True,
                'detected_text': detected_text,
                'confidence': round(avg_confidence / 100, 3),  # Convert to 0-1 range
                'font_size': round(avg_font_size),
                'area': area
            })
            
        except Exception as ocr_error:
            print(f"[@route:auto_detect_text] OCR error: {ocr_error}")
            return jsonify({
                'success': False,
                'error': f'OCR processing failed: {str(ocr_error)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:auto_detect_text] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_bp.route('/api/virtualpytest/reference/text/save', methods=['POST'])
def save_text_reference():
    """Save text reference to resource.json"""
    try:
        data = request.get_json()
        reference_name = data.get('name')
        model_name = data.get('model')
        area = data.get('area')
        text = data.get('text')
        font_size = data.get('fontSize')
        confidence = data.get('confidence')
        
        if not all([reference_name, model_name, area, text]):
            return jsonify({'error': 'Name, model, area, and text are required'}), 400
            
        print(f"[@route:save_text_reference] Saving text reference: {reference_name} for model: {model_name}")
        
        # Path to resource.json
        base_dir = os.path.join(os.path.dirname(__file__), '..', '..')
        registry_path = os.path.join(base_dir, 'config', 'resource', 'resource.json')
        
        # Load existing resource data
        resource_data = {'resources': []}
        if os.path.exists(registry_path):
            with open(registry_path, 'r') as f:
                resource_data = json.load(f)
        
        # Check if reference already exists
        existing_index = None
        for i, resource in enumerate(resource_data.get('resources', [])):
            if (resource.get('name') == reference_name and 
                resource.get('model') == model_name and 
                resource.get('type') == 'text_reference'):
                existing_index = i
                break
        
        # Create new text reference entry
        text_reference = {
            'name': reference_name,
            'model': model_name,
            'path': '',  # No file path for text references
            'full_path': '',  # No file path for text references
            'created_at': datetime.now().isoformat(),
            'type': 'text_reference',
            'area': area,
            'text': text,
            'font_size': font_size,
            'confidence': confidence
        }
        
        # Add or update the reference
        if existing_index is not None:
            resource_data['resources'][existing_index] = text_reference
            print(f"[@route:save_text_reference] Updated existing text reference: {reference_name}")
        else:
            resource_data['resources'].append(text_reference)
            print(f"[@route:save_text_reference] Added new text reference: {reference_name}")
        
        # Save back to file
        os.makedirs(os.path.dirname(registry_path), exist_ok=True)
        with open(registry_path, 'w') as f:
            json.dump(resource_data, f, indent=2)
        
        return jsonify({
            'success': True,
            'message': f'Text reference "{reference_name}" saved successfully',
            'reference': text_reference
        })
        
    except Exception as e:
        print(f"[@route:save_text_reference] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 