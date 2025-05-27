import sys
import os
from uuid import uuid4
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv('.env.local')

# Add the parent directory to the path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Add controllers directory to path
controllers_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'controllers')
sys.path.append(controllers_path)

try:
    from utils.supabase_utils import (
        save_test_case, get_test_case, get_all_test_cases, delete_test_case,
        save_tree, get_tree, get_all_trees, delete_tree,
        save_campaign, get_campaign, get_all_campaigns, delete_campaign,
        save_result, get_failure_rates, supabase,
        # Device management functions
        save_device, get_device, get_all_devices, delete_device,
        save_controller, get_controller, get_all_controllers, delete_controller,
        save_environment_profile, get_environment_profile, get_all_environment_profiles, delete_environment_profile
    )
    # Test the connection by checking if supabase client is available
    if supabase:
        print("Supabase connected successfully!")
        supabase_client = True
    else:
        raise Exception("Supabase client not initialized")
except Exception as e:
    print(f"Warning: Supabase connection failed: {e}")
    print("Starting Flask app without Supabase connection...")
    supabase_client = None

# Import VirtualPyTest controller system
try:
    from controllers import ControllerFactory, CONTROLLER_REGISTRY, create_device_controllers
    from controllers.base_controllers import (
        RemoteControllerInterface, 
        AVControllerInterface, 
        VerificationControllerInterface,
        PowerControllerInterface
    )
    print("VirtualPyTest controller system imported successfully!")
    controllers_available = True
except Exception as e:
    print(f"Warning: VirtualPyTest controllers not available: {e}")
    controllers_available = False

app = Flask(__name__)
CORS(app)

# For demo purposes, using a default team_id
# In production, this should come from authentication/session
DEFAULT_TEAM_ID = "550e8400-e29b-41d4-a716-446655440000"  # Demo team ID
DEFAULT_USER_ID = "550e8400-e29b-41d4-a716-446655440001"  # Demo user ID

# Global session storage for Android TV remote
android_tv_session = {
    'controller': None,
    'connected': False,
    'connection_details': {}
}

# Global session storage for IR remote
ir_remote_session = {
    'controller': None,
    'connected': False,
    'connection_details': {}
}

# Global session storage for Bluetooth remote
bluetooth_remote_session = {
    'controller': None,
    'connected': False,
    'connection_details': {}
}

def check_supabase():
    """Helper function to check if Supabase is available"""
    if supabase_client is None:
        return jsonify({'error': 'Supabase not available'}), 503
    return None

def get_team_id():
    """Get team_id from request headers or use default for demo"""
    # In production, extract from JWT token or session
    return request.headers.get('X-Team-ID', DEFAULT_TEAM_ID)

def get_user_id():
    """Get user_id from request headers or use default for demo"""
    # In production, extract from JWT token or session
    return request.headers.get('X-User-ID', DEFAULT_USER_ID)

@app.route('/api/health')
def health():
    """Health check endpoint"""
    supabase_status = "connected" if supabase_client else "disconnected"
    return jsonify({
        'status': 'ok',
        'supabase': supabase_status,
        'team_id': get_team_id()
    })

@app.route('/api/testcases', methods=['GET', 'POST'])
def testcases():
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            test_cases = get_all_test_cases(team_id)
            return jsonify(test_cases)
        elif request.method == 'POST':
            test_case = request.json
            save_test_case(test_case, team_id, user_id)
            return jsonify({'status': 'success', 'test_id': test_case['test_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/testcases/<test_id>', methods=['GET', 'PUT', 'DELETE'])
def testcase(test_id):
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            test_case = get_test_case(test_id, team_id)
            return jsonify(test_case if test_case else {})
        elif request.method == 'PUT':
            test_case = request.json
            test_case['test_id'] = test_id
            save_test_case(test_case, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_test_case(test_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Test case not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trees', methods=['GET', 'POST'])
def trees():
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            trees = get_all_trees(team_id)
            return jsonify(trees)
        elif request.method == 'POST':
            tree = request.json
            save_tree(tree, team_id, user_id)
            return jsonify({'status': 'success', 'tree_id': tree['tree_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trees/<tree_id>', methods=['GET', 'PUT', 'DELETE'])
def tree(tree_id):
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            tree = get_tree(tree_id, team_id)
            return jsonify(tree if tree else {})
        elif request.method == 'PUT':
            tree = request.json
            tree['tree_id'] = tree_id
            save_tree(tree, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_tree(tree_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Tree not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/campaigns', methods=['GET', 'POST'])
def campaigns():
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            campaigns = get_all_campaigns(team_id)
            return jsonify(campaigns)
        elif request.method == 'POST':
            campaign = request.json
            save_campaign(campaign, team_id, user_id)
            return jsonify({'status': 'success', 'campaign_id': campaign['campaign_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/campaigns/<campaign_id>', methods=['GET', 'PUT', 'DELETE'])
def campaign(campaign_id):
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            campaign = get_campaign(campaign_id, team_id)
            return jsonify(campaign if campaign else {})
        elif request.method == 'PUT':
            campaign = request.json
            campaign['campaign_id'] = campaign_id
            save_campaign(campaign, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_campaign(campaign_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Campaign not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# DEVICE MANAGEMENT ENDPOINTS
# =====================================================

@app.route('/api/devices', methods=['GET', 'POST'])
def devices():
    """Device management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            devices = get_all_devices(team_id)
            return jsonify(devices)
        elif request.method == 'POST':
            device = request.json
            save_device(device, team_id, user_id)
            return jsonify({'status': 'success', 'device_id': device.get('id')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices/<device_id>', methods=['GET', 'PUT', 'DELETE'])
def device(device_id):
    """Individual device management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            device = get_device(device_id, team_id)
            return jsonify(device if device else {})
        elif request.method == 'PUT':
            device = request.json
            device['id'] = device_id
            save_device(device, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_device(device_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Device not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/controllers', methods=['GET', 'POST'])
def controllers():
    """Controller management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            controllers = get_all_controllers(team_id)
            return jsonify(controllers)
        elif request.method == 'POST':
            controller = request.json
            save_controller(controller, team_id, user_id)
            return jsonify({'status': 'success', 'controller_id': controller.get('id')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/controllers/<controller_id>', methods=['GET', 'PUT', 'DELETE'])
def controller(controller_id):
    """Individual controller management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            controller = get_controller(controller_id, team_id)
            return jsonify(controller if controller else {})
        elif request.method == 'PUT':
            controller = request.json
            controller['id'] = controller_id
            save_controller(controller, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_controller(controller_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Controller not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/environment-profiles', methods=['GET', 'POST'])
def environment_profiles():
    """Environment profile management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            profiles = get_all_environment_profiles(team_id)
            return jsonify(profiles)
        elif request.method == 'POST':
            profile = request.json
            save_environment_profile(profile, team_id, user_id)
            return jsonify({'status': 'success', 'profile_id': profile.get('id')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/environment-profiles/<profile_id>', methods=['GET', 'PUT', 'DELETE'])
def environment_profile(profile_id):
    """Individual environment profile management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            profile = get_environment_profile(profile_id, team_id)
            return jsonify(profile if profile else {})
        elif request.method == 'PUT':
            profile = request.json
            profile['id'] = profile_id
            save_environment_profile(profile, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_environment_profile(profile_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Environment profile not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def stats():
    """Get statistics for the dashboard"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        test_cases = get_all_test_cases(team_id)
        trees = get_all_trees(team_id)
        campaigns = get_all_campaigns(team_id)
        devices = get_all_devices(team_id)
        controllers = get_all_controllers(team_id)
        environment_profiles = get_all_environment_profiles(team_id)
        failure_rates = get_failure_rates(team_id)
        
        return jsonify({
            'test_cases_count': len(test_cases),
            'trees_count': len(trees),
            'campaigns_count': len(campaigns),
            'devices_count': len(devices),
            'controllers_count': len(controllers),
            'environment_profiles_count': len(environment_profiles),
            'failure_rates': failure_rates,
            'recent_test_cases': test_cases[:5],  # Last 5 test cases
            'recent_campaigns': campaigns[:5],    # Last 5 campaigns
            'recent_devices': devices[:5]         # Last 5 devices
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# VIRTUALPYTEST CONTROLLER SYSTEM ENDPOINTS
# =====================================================

@app.route('/api/virtualpytest/controller-types', methods=['GET'])
def get_controller_types():
    """Get available controller types from VirtualPyTest system"""
    if not controllers_available:
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
    
    try:
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
                'mock': {'name': 'Mock Remote', 'description': 'Mock remote controller for testing', 'status': 'available'},
                'real_android_tv': {'name': 'Android TV (SSH+ADB)', 'description': 'Real Android TV via SSH+ADB connection', 'status': 'available'},
                'real_android_mobile': {'name': 'Android Mobile (SSH+ADB)', 'description': 'Real Android Mobile via SSH+ADB connection', 'status': 'available'},
                'ir_remote': {'name': 'IR Remote', 'description': 'Infrared remote control with classic TV/STB buttons', 'status': 'available'},
                'bluetooth_remote': {'name': 'Bluetooth Remote', 'description': 'Bluetooth HID remote control', 'status': 'available'},
            },
            'av': {
                'mock': {'name': 'Mock AV', 'description': 'Simulated audio/video capture', 'status': 'available'},
                'hdmi': {'name': 'HDMI Capture', 'description': 'HDMI video capture device', 'status': 'placeholder'},
                'adb': {'name': 'ADB Capture', 'description': 'Android Debug Bridge capture', 'status': 'placeholder'},
                'camera': {'name': 'Camera Capture', 'description': 'USB/IP camera capture', 'status': 'placeholder'},
            },
            'network': {
                'network': {'name': 'Network Stream', 'description': 'Network-based audio/video streaming', 'status': 'placeholder'},
                'rtsp': {'name': 'RTSP Stream', 'description': 'Real-Time Streaming Protocol capture', 'status': 'placeholder'},
                'http_stream': {'name': 'HTTP Stream', 'description': 'HTTP-based video streaming', 'status': 'placeholder'},
                'webrtc': {'name': 'WebRTC', 'description': 'Web Real-Time Communication', 'status': 'placeholder'},
            },
            'verification': {
                'mock': {'name': 'Mock Verification', 'description': 'Simulated verification', 'status': 'available'},
                'ocr': {'name': 'OCR Verification', 'description': 'Optical Character Recognition', 'status': 'placeholder'},
                'image': {'name': 'Image Verification', 'description': 'Image matching verification', 'status': 'placeholder'},
                'audio': {'name': 'Audio Verification', 'description': 'Audio content verification', 'status': 'placeholder'},
                'video': {'name': 'Video Verification', 'description': 'Video content verification', 'status': 'placeholder'},
                'ai': {'name': 'AI Verification', 'description': 'AI-based verification', 'status': 'placeholder'},
            },
            'power': {
                'mock': {'name': 'Mock Power', 'description': 'Simulated power management', 'status': 'available'},
                'smart_plug': {'name': 'Smart Plug', 'description': 'Smart plug power control', 'status': 'placeholder'},
                'ipmi': {'name': 'IPMI Power', 'description': 'IPMI power management', 'status': 'placeholder'},
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

@app.route('/api/virtualpytest/controllers', methods=['GET', 'POST'])
def virtualpytest_controllers():
    """Manage VirtualPyTest controller instances"""
    if not controllers_available:
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
    
    try:
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

@app.route('/api/virtualpytest/controllers/test', methods=['POST'])
def test_controller():
    """Test a controller configuration"""
    if not controllers_available:
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
    
    try:
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

@app.route('/api/virtualpytest/device-sets', methods=['POST'])
def create_device_set():
    """Create a complete device controller set"""
    if not controllers_available:
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
    
    try:
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

@app.route('/api/virtualpytest/android-tv/take-control', methods=['POST'])
def take_android_tv_control():
    """Take control of Android TV device via SSH+ADB."""
    global android_tv_session
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['host_ip', 'host_username', 'host_password', 'device_ip']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Release any existing session first
        if android_tv_session['connected'] and android_tv_session['controller']:
            try:
                android_tv_session['controller'].disconnect()
            except:
                pass
        
        # Create new Android TV controller
        from controllers import ControllerFactory
        
        controller = ControllerFactory.create_remote_controller(
            device_type="real_android_tv",
            device_name="Web Interface TV",
            host_ip=data['host_ip'],
            host_username=data['host_username'],
            host_password=data['host_password'],
            host_port=int(data.get('host_port', 22)),
            device_ip=data['device_ip'],
            device_port=int(data.get('device_port', 5555))
        )
        
        # Attempt connection
        if controller.connect():
            android_tv_session = {
                'controller': controller,
                'connected': True,
                'connection_details': {
                    'host_ip': data['host_ip'],
                    'device_ip': data['device_ip'],
                    'connected_at': time.time()
                }
            }
            
            return jsonify({
                'success': True,
                'message': f'Connected to Android TV at {data["host_ip"]} → {data["device_ip"]}',
                'session_info': android_tv_session['connection_details']
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to Android TV. Check SSH credentials and device connectivity.'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Connection error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-tv/release-control', methods=['POST'])
def release_android_tv_control():
    """Release control of Android TV device."""
    global android_tv_session
    
    try:
        if android_tv_session['connected'] and android_tv_session['controller']:
            android_tv_session['controller'].disconnect()
        
        # Reset session
        android_tv_session = {
            'controller': None,
            'connected': False,
            'connection_details': {}
        }
        
        return jsonify({
            'success': True,
            'message': 'Android TV control released successfully'
        })
        
    except Exception as e:
        # Always reset session even if disconnect fails
        android_tv_session = {
            'controller': None,
            'connected': False,
            'connection_details': {}
        }
        
        return jsonify({
            'success': True,
            'message': 'Android TV control released (with cleanup)'
        })

@app.route('/api/virtualpytest/android-tv/command', methods=['POST'])
def send_android_tv_command():
    """Send command to Android TV device."""
    global android_tv_session
    
    try:
        if not android_tv_session['connected'] or not android_tv_session['controller']:
            return jsonify({
                'success': False,
                'error': 'No active Android TV session. Please take control first.'
            }), 400
        
        data = request.get_json()
        command = data.get('command')
        params = data.get('params', {})
        
        controller = android_tv_session['controller']
        
        if command == 'press_key':
            key = params.get('key')
            if not key:
                return jsonify({
                    'success': False,
                    'error': 'Missing key parameter'
                }), 400
            
            success = controller.press_key(key)
            return jsonify({
                'success': success,
                'message': f'Key "{key}" {"sent" if success else "failed"}'
            })
            
        elif command == 'input_text':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Missing text parameter'
                }), 400
            
            success = controller.input_text(text)
            return jsonify({
                'success': success,
                'message': f'Text input {"sent" if success else "failed"}'
            })
            
        elif command == 'execute_sequence':
            sequence = params.get('sequence', [])
            success = controller.execute_sequence(sequence)
            return jsonify({
                'success': success,
                'message': f'Sequence {"executed" if success else "failed"}'
            })
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Command execution error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-tv/status', methods=['GET'])
def get_android_tv_status():
    """Get Android TV session status."""
    global android_tv_session
    
    try:
        if android_tv_session['connected'] and android_tv_session['controller']:
            controller_status = android_tv_session['controller'].get_status()
            return jsonify({
                'success': True,
                'connected': True,
                'session_info': android_tv_session['connection_details'],
                'controller_status': controller_status
            })
        else:
            return jsonify({
                'success': True,
                'connected': False,
                'session_info': {},
                'controller_status': {}
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Status check error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-tv/defaults', methods=['GET'])
def get_android_tv_defaults():
    """Get default Android TV connection values from environment variables."""
    try:
        defaults = {
            'host_ip': os.getenv('HOST_IP', ''),
            'host_username': os.getenv('HOST_USERNAME', ''),
            'host_password': os.getenv('HOST_PASSWORD', ''),
            'host_port': os.getenv('HOST_PORT', '22'),
            'device_ip': os.getenv('DEVICE_IP', ''),
            'device_port': os.getenv('DEVICE_PORT', '5555')
        }
        
        return jsonify({
            'success': True,
            'defaults': defaults
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get defaults: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-tv/config', methods=['GET'])
def get_android_tv_config():
    """Get Android TV remote configuration."""
    try:
        from controllers.remote.android_tv import AndroidTVRemoteController
        config = AndroidTVRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Config error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-tv/screenshot', methods=['POST'])
def android_tv_screenshot():
    """Take a screenshot of the Android TV device."""
    try:
        global android_tv_session
        
        if not android_tv_session['connected'] or not android_tv_session['controller']:
            return jsonify({
                'success': False,
                'error': 'No active Android TV connection'
            }), 400
            
        success, screenshot_data, error = android_tv_session['controller'].take_screenshot()
        
        if success:
            return jsonify({
                'success': True,
                'screenshot': screenshot_data,  # Base64 encoded image
                'format': 'png'
            })
        else:
            return jsonify({
                'success': False,
                'error': error
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Screenshot error: {str(e)}'
        }), 500

# ==================== IR Remote Control Endpoints ====================

@app.route('/api/virtualpytest/ir-remote/connect', methods=['POST'])
def connect_ir_remote():
    """Connect to IR remote device"""
    global ir_remote_session
    
    if not controllers_available:
        return jsonify({'success': False, 'error': 'Controllers not available'}), 503
    
    try:
        data = request.json
        device_path = data.get('device_path', '/dev/lirc0')
        protocol = data.get('protocol', 'NEC')
        frequency = data.get('frequency', '38000')
        
        print(f"[@api:ir-remote:connect] Connecting to IR device: {device_path}")
        
        # Create IR remote controller
        from controllers.remote.infrared import IRRemoteController
        
        ir_controller = IRRemoteController(
            device_name="IR Remote",
            device_type="ir_remote",
            ir_device=device_path,
            protocol=protocol,
            frequency=int(frequency)
        )
        
        # Connect to the IR device
        if ir_controller.connect():
            ir_remote_session['controller'] = ir_controller
            ir_remote_session['connected'] = True
            ir_remote_session['connection_details'] = {
                'device_path': device_path,
                'protocol': protocol,
                'frequency': frequency
            }
            
            print(f"[@api:ir-remote:connect] Successfully connected to IR device")
            return jsonify({
                'success': True,
                'message': f'Connected to IR device {device_path}',
                'device_path': device_path,
                'protocol': protocol
            })
        else:
            print(f"[@api:ir-remote:connect] Failed to connect to IR device")
            return jsonify({
                'success': False,
                'error': 'Failed to connect to IR device'
            })
            
    except Exception as e:
        print(f"[@api:ir-remote:connect] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Connection failed: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/ir-remote/disconnect', methods=['POST'])
def disconnect_ir_remote():
    """Disconnect from IR remote device"""
    global ir_remote_session
    
    try:
        print(f"[@api:ir-remote:disconnect] Disconnecting from IR device")
        
        if ir_remote_session['controller']:
            ir_remote_session['controller'].disconnect()
            
        # Reset session
        ir_remote_session['controller'] = None
        ir_remote_session['connected'] = False
        ir_remote_session['connection_details'] = {}
        
        print(f"[@api:ir-remote:disconnect] Successfully disconnected")
        return jsonify({
            'success': True,
            'message': 'Disconnected from IR device'
        })
        
    except Exception as e:
        print(f"[@api:ir-remote:disconnect] ERROR: {str(e)}")
        # Reset session even on error
        ir_remote_session['controller'] = None
        ir_remote_session['connected'] = False
        ir_remote_session['connection_details'] = {}
        
        return jsonify({
            'success': True,  # Still return success since we reset the session
            'message': 'Disconnected from IR device'
        })

@app.route('/api/virtualpytest/ir-remote/command', methods=['POST'])
def send_ir_remote_command():
    """Send command to IR remote device"""
    global ir_remote_session
    
    if not ir_remote_session['connected'] or not ir_remote_session['controller']:
        return jsonify({
            'success': False,
            'error': 'IR remote not connected'
        }), 400
    
    try:
        data = request.json
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@api:ir-remote:command] Executing command: {command} with params: {params}")
        
        controller = ir_remote_session['controller']
        
        if command == 'press_key':
            key = params.get('key')
            if not key:
                return jsonify({
                    'success': False,
                    'error': 'Key parameter required for press_key command'
                }), 400
                
            success = controller.press_key(key)
            return jsonify({
                'success': success,
                'message': f'Pressed key: {key}' if success else f'Failed to press key: {key}'
            })
            
        elif command == 'input_text':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for input_text command'
                }), 400
                
            success = controller.input_text(text)
            return jsonify({
                'success': success,
                'message': f'Input text: {text}' if success else f'Failed to input text: {text}'
            })
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
            
    except Exception as e:
        print(f"[@api:ir-remote:command] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command failed: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/ir-remote/status', methods=['GET'])
def get_ir_remote_status():
    """Get IR remote connection status"""
    global ir_remote_session
    
    return jsonify({
        'connected': ir_remote_session['connected'],
        'connection_details': ir_remote_session['connection_details']
    })

@app.route('/api/virtualpytest/ir-remote/config', methods=['GET'])
def get_ir_remote_config():
    """Get IR remote configuration including layout, buttons, and image."""
    try:
        # Import the controller and get its configuration
        from controllers.remote.infrared import IRRemoteController
        
        config = IRRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get config: {str(e)}'
        }), 500

# ==================== Bluetooth Remote Control Endpoints ====================

@app.route('/api/virtualpytest/bluetooth-remote/connect', methods=['POST'])
def connect_bluetooth_remote():
    """Connect to Bluetooth remote device"""
    global bluetooth_remote_session
    
    if not controllers_available:
        return jsonify({'success': False, 'error': 'Controllers not available'}), 503
    
    try:
        data = request.json
        device_address = data.get('device_address', '00:00:00:00:00:00')
        device_name = data.get('device_name', 'Unknown Device')
        pairing_pin = data.get('pairing_pin', '0000')
        
        print(f"[@api:bluetooth-remote:connect] Connecting to Bluetooth device: {device_address}")
        
        # Create Bluetooth remote controller
        from controllers.remote.bluetooth import BluetoothRemoteController
        
        bluetooth_controller = BluetoothRemoteController(
            device_name=device_name,
            device_type="bluetooth_remote",
            device_address=device_address,
            pairing_pin=pairing_pin
        )
        
        # Connect to the Bluetooth device
        if bluetooth_controller.connect():
            bluetooth_remote_session['controller'] = bluetooth_controller
            bluetooth_remote_session['connected'] = True
            bluetooth_remote_session['connection_details'] = {
                'device_address': device_address,
                'device_name': device_name,
                'pairing_pin': pairing_pin
            }
            
            print(f"[@api:bluetooth-remote:connect] Successfully connected to Bluetooth device")
            return jsonify({
                'success': True,
                'message': f'Connected to Bluetooth device {device_name}',
                'device_address': device_address,
                'device_name': device_name
            })
        else:
            print(f"[@api:bluetooth-remote:connect] Failed to connect to Bluetooth device")
            return jsonify({
                'success': False,
                'error': 'Failed to connect to Bluetooth device'
            })
            
    except Exception as e:
        print(f"[@api:bluetooth-remote:connect] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Connection failed: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/bluetooth-remote/disconnect', methods=['POST'])
def disconnect_bluetooth_remote():
    """Disconnect from Bluetooth remote device"""
    global bluetooth_remote_session
    
    try:
        print(f"[@api:bluetooth-remote:disconnect] Disconnecting from Bluetooth device")
        
        if bluetooth_remote_session['controller']:
            bluetooth_remote_session['controller'].disconnect()
            
        # Reset session
        bluetooth_remote_session['controller'] = None
        bluetooth_remote_session['connected'] = False
        bluetooth_remote_session['connection_details'] = {}
        
        print(f"[@api:bluetooth-remote:disconnect] Successfully disconnected")
        return jsonify({
            'success': True,
            'message': 'Disconnected from Bluetooth device'
        })
        
    except Exception as e:
        print(f"[@api:bluetooth-remote:disconnect] ERROR: {str(e)}")
        # Reset session even on error
        bluetooth_remote_session['controller'] = None
        bluetooth_remote_session['connected'] = False
        bluetooth_remote_session['connection_details'] = {}
        
        return jsonify({
            'success': True,  # Still return success since we reset the session
            'message': 'Disconnected from Bluetooth device'
        })

@app.route('/api/virtualpytest/bluetooth-remote/command', methods=['POST'])
def send_bluetooth_remote_command():
    """Send command to Bluetooth remote device"""
    global bluetooth_remote_session
    
    if not bluetooth_remote_session['connected'] or not bluetooth_remote_session['controller']:
        return jsonify({
            'success': False,
            'error': 'Bluetooth remote not connected'
        }), 400
    
    try:
        data = request.json
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@api:bluetooth-remote:command] Executing command: {command} with params: {params}")
        
        controller = bluetooth_remote_session['controller']
        
        if command == 'press_key':
            key = params.get('key')
            if not key:
                return jsonify({
                    'success': False,
                    'error': 'Key parameter required for press_key command'
                }), 400
                
            success = controller.press_key(key)
            return jsonify({
                'success': success,
                'message': f'Pressed key: {key}' if success else f'Failed to press key: {key}'
            })
            
        elif command == 'input_text':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for input_text command'
                }), 400
                
            success = controller.input_text(text)
            return jsonify({
                'success': success,
                'message': f'Input text: {text}' if success else f'Failed to input text: {text}'
            })
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
            
    except Exception as e:
        print(f"[@api:bluetooth-remote:command] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command failed: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/bluetooth-remote/status', methods=['GET'])
def get_bluetooth_remote_status():
    """Get Bluetooth remote connection status"""
    global bluetooth_remote_session
    
    return jsonify({
        'connected': bluetooth_remote_session['connected'],
        'connection_details': bluetooth_remote_session['connection_details']
    })

@app.route('/api/virtualpytest/bluetooth-remote/config', methods=['GET'])
def get_bluetooth_remote_config():
    """Get Bluetooth remote configuration including layout, buttons, and image."""
    try:
        # Import the controller and get its configuration
        from controllers.remote.bluetooth import BluetoothRemoteController
        
        config = BluetoothRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get config: {str(e)}'
        }), 500

# ==================== Android Mobile Remote Control Endpoints ====================

@app.route('/api/virtualpytest/android-mobile/config', methods=['GET'])
def get_android_mobile_config():
    """Get Android Mobile remote configuration including layout, buttons, and image."""
    try:
        # Import the controller and get its configuration
        from controllers.remote.android_mobile import AndroidMobileRemoteController
        
        config = AndroidMobileRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get config: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-mobile/defaults', methods=['GET'])
def get_android_mobile_defaults():
    """Get default connection values for Android Mobile from environment variables."""
    try:
        defaults = {
            'host_ip': os.getenv('HOST_IP', ''),
            'host_username': os.getenv('HOST_USERNAME', ''),
            'host_password': os.getenv('HOST_PASSWORD', ''),
            'host_port': os.getenv('HOST_PORT', '22'),
            'device_ip': os.getenv('DEVICE_IP', ''),
            'device_port': os.getenv('DEVICE_PORT', '5555')
        }
        
        return jsonify({
            'success': True,
            'defaults': defaults
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get defaults: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-mobile/take-control', methods=['POST'])
def android_mobile_take_control():
    """Take control of Android Mobile device via SSH+ADB."""
    try:
        data = request.get_json()
        
        # Import the controller
        from controllers.remote.android_mobile import AndroidMobileRemoteController
        
        # Create controller instance with connection parameters
        controller = AndroidMobileRemoteController(
            device_name="Android Mobile Device",
            host_ip=data.get('host_ip'),
            host_username=data.get('host_username'),
            host_password=data.get('host_password'),
            host_port=int(data.get('host_port', 22)),
            device_ip=data.get('device_ip'),
            adb_port=int(data.get('device_port', 5555))
        )
        
        # Attempt connection
        if controller.connect():
            # Store controller globally for subsequent commands
            global android_mobile_controller
            android_mobile_controller = controller
            
            return jsonify({
                'success': True,
                'message': f'Successfully connected to Android Mobile device {data.get("device_ip")}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to Android Mobile device'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Connection error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-mobile/release-control', methods=['POST'])
def android_mobile_release_control():
    """Release control of Android Mobile device."""
    try:
        global android_mobile_controller
        
        if 'android_mobile_controller' in globals() and android_mobile_controller:
            android_mobile_controller.disconnect()
            android_mobile_controller = None
            
        return jsonify({
            'success': True,
            'message': 'Android Mobile control released'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Release error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-mobile/command', methods=['POST'])
def android_mobile_command():
    """Send command to Android Mobile device."""
    try:
        global android_mobile_controller
        
        if 'android_mobile_controller' not in globals() or not android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No active Android Mobile connection'
            }), 400
            
        data = request.get_json()
        command = data.get('command')
        params = data.get('params', {})
        
        success = False
        
        if command in ['UP', 'DOWN', 'LEFT', 'RIGHT', 'SELECT', 'BACK', 'HOME', 'MENU', 
                      'VOLUME_UP', 'VOLUME_DOWN', 'VOLUME_MUTE', 'POWER', 'CAMERA', 'CALL', 'ENDCALL']:
            success = android_mobile_controller.press_key(command)
        elif command == 'INPUT_TEXT':
            text = params.get('text', '')
            success = android_mobile_controller.input_text(text)
        elif command == 'LAUNCH_APP':
            package = params.get('package', '')
            success = android_mobile_controller.launch_app(package)
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
            
        return jsonify({
            'success': success,
            'message': f'Command {command} {"executed" if success else "failed"}'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Command error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-mobile/dump-ui', methods=['POST'])
def android_mobile_dump_ui():
    """Dump UI elements from Android Mobile device."""
    try:
        global android_mobile_controller
        
        if 'android_mobile_controller' not in globals() or not android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No active Android Mobile connection'
            }), 400
            
        success, elements, error = android_mobile_controller.dump_ui_elements()
        
        if success:
            # Get device resolution
            resolution = android_mobile_controller.get_device_resolution()
            
            # Convert elements to JSON-serializable format
            elements_data = []
            for element in elements:
                elements_data.append({
                    'id': element.id,
                    'tag': element.tag,
                    'text': element.text,
                    'resourceId': element.resource_id,
                    'contentDesc': element.content_desc,
                    'className': element.class_name,
                    'bounds': element.bounds
                })
            
            return jsonify({
                'success': True,
                'elements': elements_data,
                'totalCount': len(elements_data),
                'deviceResolution': resolution
            })
        else:
            return jsonify({
                'success': False,
                'error': error
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'UI dump error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-mobile/click-element', methods=['POST'])
def android_mobile_click_element():
    """Click on a UI element on Android Mobile device."""
    try:
        global android_mobile_controller
        
        if 'android_mobile_controller' not in globals() or not android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No active Android Mobile connection'
            }), 400
            
        data = request.get_json()
        element_data = data.get('element')
        
        if not element_data:
            return jsonify({
                'success': False,
                'error': 'No element data provided'
            }), 400
            
        # Import AndroidElement class
        from controllers.lib.adbUtils import AndroidElement
        
        # Create AndroidElement from data
        element = AndroidElement(
            element_id=element_data.get('id'),
            tag=element_data.get('tag', ''),
            text=element_data.get('text', ''),
            resource_id=element_data.get('resourceId', ''),
            content_desc=element_data.get('contentDesc', ''),
            class_name=element_data.get('className', ''),
            bounds=element_data.get('bounds', ''),
            clickable=element_data.get('clickable', False),
            enabled=element_data.get('enabled', True)
        )
        
        success = android_mobile_controller.click_element(element)
        
        return jsonify({
            'success': success,
            'message': f'Element click {"successful" if success else "failed"}'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Element click error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-mobile/get-apps', methods=['POST'])
def android_mobile_get_apps():
    """Get installed apps from Android Mobile device."""
    try:
        global android_mobile_controller
        
        if 'android_mobile_controller' not in globals() or not android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No active Android Mobile connection'
            }), 400
            
        apps = android_mobile_controller.get_installed_apps()
        
        # Convert apps to JSON-serializable format
        apps_data = []
        for app in apps:
            apps_data.append({
                'packageName': app.package_name,
                'label': app.label
            })
        
        return jsonify({
            'success': True,
            'apps': apps_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Get apps error: {str(e)}'
        }), 500

@app.route('/api/virtualpytest/android-mobile/screenshot', methods=['POST'])
def android_mobile_screenshot():
    """Take a screenshot of the Android Mobile device."""
    try:
        global android_mobile_controller
        
        if 'android_mobile_controller' not in globals() or not android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No active Android Mobile connection'
            }), 400
            
        success, screenshot_data, error = android_mobile_controller.take_screenshot()
        
        if success:
            return jsonify({
                'success': True,
                'screenshot': screenshot_data,  # Base64 encoded image
                'format': 'png'
            })
        else:
            return jsonify({
                'success': False,
                'error': error
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Screenshot error: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5009, debug=True)