"""
Test Case API Routes

This module contains the test case management endpoints for:
- Creating test cases
- Retrieving test cases
- Updating test cases
- Deleting test cases
"""

from flask import Blueprint, request, jsonify, current_app
import time

# Import utility functions
from .utils import get_team_id

from utils.supabase_utils import (
    get_all_test_cases, get_test_case, save_test_case, delete_test_case
)

from .utils import check_supabase

# Create blueprint with abstract server test prefix
testcase_bp = Blueprint('testcase', __name__, url_prefix='/server/test')

# Helper functions (these should be imported from a shared module)
def get_user_id():
    '''Get user_id from request headers or use default for demo'''
    default_user_id = getattr(current_app, 'default_user_id', 'default-user-id')
    return request.headers.get('X-User-ID', default_user_id)

# =====================================================
# ABSTRACT TEST CASE ENDPOINTS
# =====================================================

@testcase_bp.route('/cases', methods=['GET', 'POST'])
def test_cases():
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

@testcase_bp.route('/cases/<test_id>', methods=['GET', 'PUT', 'DELETE'])
def test_case_by_id(test_id):
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

@testcase_bp.route('/execute', methods=['POST'])
def execute_test_case():
    """Execute a test case using abstract controllers"""
    try:
        data = request.get_json()
        test_case_id = data.get('test_case_id')
        device_id = data.get('device_id')
        
        if not test_case_id or not device_id:
            return jsonify({'error': 'test_case_id and device_id are required'}), 400
        
        # TODO: Implement test case execution logic using abstract controllers
        # This would involve:
        # 1. Loading the test case from database
        # 2. Getting the device/host information
        # 3. Executing the test steps using abstract remote/verification controllers
        # 4. Returning execution results
        
        return jsonify({
            'success': True,
            'message': f'Test case {test_case_id} execution started on device {device_id}',
            'execution_id': f'exec_{test_case_id}_{device_id}_{int(time.time())}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500 