"""
Verification Routes

This module contains the verification API endpoints for:
- Image verification (waitForImageToAppear, waitForImageToDisappear)
- Text verification (waitForTextToAppear, waitForTextToDisappear)
- Node verification execution
"""

from flask import Blueprint, request, jsonify
import time
import os
import sys

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
            image_path = params.get('image_path')
            if not image_path:
                return jsonify({
                    'success': False,
                    'error': 'Image path parameter required for waitForImageToAppear command'
                }), 400
            
            success = controller.waitForImageToAppear(
                image_path=image_path,
                timeout=params.get('timeout', 10.0),
                threshold=params.get('threshold', 0.8),
                area=params.get('area')
            )
            message = f'Image "{image_path}" {"appeared" if success else "not found"}'
            
        elif command == 'waitForImageToDisappear':
            image_path = params.get('image_path')
            if not image_path:
                return jsonify({
                    'success': False,
                    'error': 'Image path parameter required for waitForImageToDisappear command'
                }), 400
            
            success = controller.waitForImageToDisappear(
                image_path=image_path,
                timeout=params.get('timeout', 10.0),
                threshold=params.get('threshold', 0.8),
                area=params.get('area')
            )
            message = f'Image "{image_path}" {"disappeared" if success else "still present"}'
            
        elif command == 'waitForTextToAppear':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for waitForTextToAppear command'
                }), 400
            
            success = controller.waitForTextToAppear(
                text=text,
                timeout=params.get('timeout', 10.0),
                case_sensitive=params.get('case_sensitive', False),
                area=params.get('area')
            )
            message = f'Text "{text}" {"appeared" if success else "not found"}'
            
        elif command == 'waitForTextToDisappear':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for waitForTextToDisappear command'
                }), 400
            
            success = controller.waitForTextToDisappear(
                text=text,
                timeout=params.get('timeout', 10.0),
                case_sensitive=params.get('case_sensitive', False),
                area=params.get('area')
            )
            message = f'Text "{text}" {"disappeared" if success else "still present"}'
            
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
        
        if not verifications:
            return jsonify({
                'success': False,
                'error': 'No verifications provided'
            }), 400
        
        print(f"[@route:execute_batch_verification] Executing {len(verifications)} verifications for node {node_id}")
        
        results = []
        all_passed = True
        
        for verification in verifications:
            # Execute each verification individually
            result = {
                'verification_id': verification.get('id'),
                'success': False,
                'message': '',
                'error': None
            }
            
            try:
                # Reuse the single verification execution logic
                single_result_data = {
                    'verification': verification,
                    'node_id': node_id,
                    'tree_id': tree_id
                }
                
                # Simulate the single verification execution
                verification_id = verification.get('id')
                command = verification.get('command')
                params = verification.get('params', {})
                controller_type = verification.get('controller_type', 'image')
                
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
                
                # Execute verification
                success = False
                if command == 'waitForImageToAppear':
                    success = controller.waitForImageToAppear(
                        image_path=params.get('image_path'),
                        timeout=params.get('timeout', 10.0),
                        threshold=params.get('threshold', 0.8),
                        area=params.get('area')
                    )
                elif command == 'waitForImageToDisappear':
                    success = controller.waitForImageToDisappear(
                        image_path=params.get('image_path'),
                        timeout=params.get('timeout', 10.0),
                        threshold=params.get('threshold', 0.8),
                        area=params.get('area')
                    )
                elif command == 'waitForTextToAppear':
                    success = controller.waitForTextToAppear(
                        text=params.get('text'),
                        timeout=params.get('timeout', 10.0),
                        case_sensitive=params.get('case_sensitive', False),
                        area=params.get('area')
                    )
                elif command == 'waitForTextToDisappear':
                    success = controller.waitForTextToDisappear(
                        text=params.get('text'),
                        timeout=params.get('timeout', 10.0),
                        case_sensitive=params.get('case_sensitive', False),
                        area=params.get('area')
                    )
                
                result['success'] = success
                result['message'] = f'Verification {verification_id} {"passed" if success else "failed"}'
                
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