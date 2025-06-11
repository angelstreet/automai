"""
VirtualPyTest Controller Routes

This module contains the VirtualPyTest controller system API endpoints for:
- Controller types discovery
- Controller instance management
- Controller testing
- Device sets creation
"""

from flask import Blueprint, request, jsonify, current_app
import time

# Create blueprint
controller_bp = Blueprint('controller', __name__, url_prefix='/server/controller')

# Helper functions
def check_controllers_available():
    """Helper function to check if controllers are available (lazy loaded)"""
    try:
        from src.utils.app_utils import lazy_load_controllers
        controllers_available = lazy_load_controllers()
        if not controllers_available:
            return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
        return None
    except Exception as e:
        print(f"⚠️ Error loading controllers: {e}")
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503

# =====================================================
# VIRTUALPYTEST CONTROLLER SYSTEM ENDPOINTS
# =====================================================

@controller_bp.route('/controller-types', methods=['GET'])
def get_controller_types():
    """Get available controller types from VirtualPyTest system"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        from controllers import ControllerFactory
        
        available_controllers = ControllerFactory.list_available_controllers()
        
        # Create a virtual network category by extracting network-related controllers
        # and adding new network streaming types
        enhanced_available_controllers = {}
        for controller_type, implementations in available_controllers.items():
            if controller_type == 'av':
                # Remove network from AV and put it in its own category
                enhanced_available_controllers[controller_type] = [impl for impl in implementations if impl != 'network']
            elif controller_type == 'verification':
                # Add audio and video verification types to existing verification types
                enhanced_available_controllers[controller_type] = implementations + ['audio', 'video']
            else:
                enhanced_available_controllers[controller_type] = implementations
        
        # Add the new network category
        enhanced_available_controllers['network'] = ['network', 'rtsp', 'http_stream', 'webrtc']
        
        # Add metadata for each controller type
        controller_metadata = {
            'remote': {
                'android_tv': {'name': 'Android TV Remote', 'description': 'ADB Android TV controller', 'status': 'available'},
                'android_mobile': {'name': 'Android Mobile Remote', 'description': 'ADB Android Mobile controller', 'status': 'available'},
                'ir_remote': {'name': 'IR Remote', 'description': 'Infrared remote controller', 'status': 'available'},
                'bluetooth_remote': {'name': 'Bluetooth Remote', 'description': 'Bluetooth HID remote controller', 'status': 'available'},
            },
            'av': {
                'hdmi_stream': {'name': 'HDMI Stream', 'description': 'HDMI stream URL capture', 'status': 'available'},
            },
            'network': {
                'network': {'name': 'Network Stream', 'description': 'Network-based audio/video streaming', 'status': 'placeholder'},
                'rtsp': {'name': 'RTSP Stream', 'description': 'Real-Time Streaming Protocol capture', 'status': 'placeholder'},
                'http_stream': {'name': 'HTTP Stream', 'description': 'HTTP-based video streaming', 'status': 'placeholder'},
                'webrtc': {'name': 'WebRTC', 'description': 'Web Real-Time Communication', 'status': 'placeholder'},
            },
            'verification': {
                'ocr': {'name': 'Text Verification', 'description': 'Text matching verification', 'status': 'available'},
                'image': {'name': 'Image Verification', 'description': 'Image matching verification', 'status': 'available'},
                'adb': {'name': 'ADB Verification', 'description': 'Direct ADB element verification via SSH', 'status': 'available'},
                'audio': {'name': 'Audio Verification', 'description': 'Audio content verification', 'status': 'placeholder'},
                'video': {'name': 'Video Verification', 'description': 'Video content verification', 'status': 'placeholder'},
                'ai': {'name': 'AI Verification', 'description': 'AI-based verification', 'status': 'placeholder'},
            },
            'power': {
                'usb': {'name': 'USB Power Control', 'description': 'USB hub power control via SSH + uhubctl', 'status': 'available'},
            }
        }
        
        # Enhance available controllers with metadata
        enhanced_controllers = {}
        for controller_type, implementations in enhanced_available_controllers.items():
            enhanced_controllers[controller_type] = []
            for impl in implementations:
                metadata = controller_metadata.get(controller_type, {}).get(impl, {
                    'name': impl.replace('_', ' ').title(),
                    'description': f'{impl} controller',
                    'status': 'available'
                })
                enhanced_controllers[controller_type].append({
                    'id': impl,
                    'name': metadata['name'],
                    'description': metadata['description'],
                    'status': metadata['status']
                })
        
        return jsonify({
            'controller_types': enhanced_controllers,
            'total_types': sum(len(impls) for impls in enhanced_available_controllers.values())
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@controller_bp.route('/controllers', methods=['GET', 'POST'])
def virtualpytest_controllers():
    """Manage VirtualPyTest controller instances"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        from controllers import ControllerFactory
        
        if request.method == 'GET':
            # For now, return empty list as we don't have persistent controller instances
            # In a real implementation, you'd store active controller instances
            return jsonify({
                'controllers': [],
                'message': 'No active controller instances. Create a new controller to get started.'
            })
        
        elif request.method == 'POST':
            controller_config = request.json
            
            # Validate required fields
            required_fields = ['name', 'controller_type', 'implementation']
            for field in required_fields:
                if field not in controller_config:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            # Create controller instance
            controller_type = controller_config['controller_type']
            implementation = controller_config['implementation']
            name = controller_config['name']
            params = controller_config.get('parameters', {})
            
            if controller_type == 'remote':
                controller = ControllerFactory.create_remote_controller(
                    device_type=implementation,
                    device_name=name,
                    **params
                )
            elif controller_type == 'av':
                controller = ControllerFactory.create_av_controller(
                    capture_type=implementation,
                    device_name=name,
                    **params
                )
            elif controller_type == 'verification':
                controller = ControllerFactory.create_verification_controller(
                    verification_type=implementation,
                    device_name=name,
                    **params
                )
            elif controller_type == 'power':
                controller = ControllerFactory.create_power_controller(
                    power_type=implementation,
                    device_name=name,
                    **params
                )
            else:
                return jsonify({'error': f'Unknown controller type: {controller_type}'}), 400
            
            # Get controller status
            status = controller.get_status()
            
            return jsonify({
                'status': 'success',
                'controller': {
                    'id': f"{controller_type}_{implementation}_{name}",
                    'name': name,
                    'type': controller_type,
                    'implementation': implementation,
                    'status': status,
                    'created': True
                }
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@controller_bp.route('/controllers/test', methods=['POST'])
def test_controller():
    """Test a controller configuration"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        from controllers import ControllerFactory
        
        test_config = request.json
        
        # Validate required fields
        required_fields = ['controller_type', 'implementation']
        for field in required_fields:
            if field not in test_config:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        controller_type = test_config['controller_type']
        implementation = test_config['implementation']
        name = test_config.get('name', f'Test {implementation}')
        params = test_config.get('parameters', {})
        
        # Create controller instance
        if controller_type == 'remote':
            controller = ControllerFactory.create_remote_controller(
                device_type=implementation,
                device_name=name,
                **params
            )
        elif controller_type == 'av':
            controller = ControllerFactory.create_av_controller(
                capture_type=implementation,
                device_name=name,
                **params
            )
        elif controller_type == 'verification':
            controller = ControllerFactory.create_verification_controller(
                verification_type=implementation,
                device_name=name,
                **params
            )
        elif controller_type == 'power':
            controller = ControllerFactory.create_power_controller(
                power_type=implementation,
                device_name=name,
                **params
            )
        else:
            return jsonify({'error': f'Unknown controller type: {controller_type}'}), 400
        
        # Test connection
        connection_result = controller.connect()
        status = controller.get_status()
        
        # Perform basic functionality test
        test_results = {
            'connection': connection_result,
            'status': status
        }
        
        # Type-specific tests
        if controller_type == 'remote' and connection_result:
            # Test basic key press
            test_results['key_press_test'] = controller.press_key('OK')
            test_results['text_input_test'] = controller.input_text('TEST')
        
        # Disconnect after test
        controller.disconnect()
        
        return jsonify({
            'test_results': test_results,
            'success': connection_result,
            'message': 'Controller test completed successfully' if connection_result else 'Controller test failed'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@controller_bp.route('/device-sets', methods=['POST'])
def create_device_set():
    """Create a complete device controller set"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        from controllers import create_device_controllers
        
        device_config = request.json
        
        # Validate required fields
        if 'device_name' not in device_config:
            return jsonify({'error': 'Missing required field: device_name'}), 400
        
        device_name = device_config['device_name']
        device_type = device_config.get('device_type', 'mock')
        
        # Create device controller set
        controllers = create_device_controllers(
            device_name=device_name,
            device_type=device_type,
            **device_config.get('overrides', {})
        )
        
        # Test connection to all controllers
        connection_results = controllers.connect_all()
        status = controllers.get_status()
        
        # Disconnect after test
        controllers.disconnect_all()
        
        return jsonify({
            'status': 'success',
            'device_set': {
                'device_name': device_name,
                'device_type': device_type,
                'connection_test': connection_results,
                'controllers_status': status
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500 