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
                'mock': {'name': 'Mock Remote', 'description': 'Simulated remote for testing', 'status': 'available'},
                'real_android_tv': {'name': 'Android TV (SSH+ADB)', 'description': 'Real Android TV via SSH+ADB connection', 'status': 'available'},
                'real_android_mobile': {'name': 'Android Mobile (SSH+ADB)', 'description': 'Real Android mobile via SSH+ADB with UI automation', 'status': 'available'},
                'ir_remote': {'name': 'IR Remote', 'description': 'Infrared remote with classic TV/STB buttons', 'status': 'available'},
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5009, debug=True)