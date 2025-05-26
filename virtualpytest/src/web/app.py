import sys
import os
from uuid import uuid4
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Add the parent directory to the path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

app = Flask(__name__)
CORS(app)

# For demo purposes, using a default team_id
# In production, this should come from authentication/session
DEFAULT_TEAM_ID = "550e8400-e29b-41d4-a716-446655440000"  # Demo team ID
DEFAULT_USER_ID = "550e8400-e29b-41d4-a716-446655440001"  # Demo user ID

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5009, debug=True)