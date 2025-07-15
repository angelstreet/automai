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
from src.utils.app_utils import get_team_id

# Import database functions from src/lib/supabase (uses absolute import)
from src.lib.supabase.testcase_db import (
    get_all_test_cases, get_test_case, save_test_case, delete_test_case
)

from src.utils.app_utils import check_supabase

# Create blueprint with abstract server testcases prefix
server_testcase_bp = Blueprint('testcase', __name__, url_prefix='/server/testcases')

# Helper functions (these should be imported from a shared module)
def get_user_id():
    '''Get user_id from request headers - FAIL FAST if not provided'''
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        raise ValueError('X-User-ID header is required but not provided')
    return user_id

# =====================================================
# TEST CASE ENDPOINTS WITH CONSISTENT NAMING
# =====================================================

@server_testcase_bp.route('/getAllTestCases', methods=['GET'])
def get_all_test_cases_route():
    """Get all test cases for a team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        test_cases = get_all_test_cases(team_id)
        return jsonify(test_cases)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_testcase_bp.route('/getTestCase/<test_id>', methods=['GET'])
def get_test_case_route(test_id):
    """Get a specific test case by ID"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        test_case = get_test_case(test_id, team_id)
        return jsonify(test_case if test_case else {})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_testcase_bp.route('/createTestCase', methods=['POST'])
def create_test_case_route():
    """Create a new test case"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        test_case = request.json
        save_test_case(test_case, team_id, user_id)
        return jsonify({'status': 'success', 'test_id': test_case['test_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_testcase_bp.route('/updateTestCase/<test_id>', methods=['PUT'])
def update_test_case_route(test_id):
    """Update an existing test case"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        test_case = request.json
        test_case['test_id'] = test_id
        save_test_case(test_case, team_id, user_id)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_testcase_bp.route('/deleteTestCase/<test_id>', methods=['DELETE'])
def delete_test_case_route(test_id):
    """Delete a test case"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        success = delete_test_case(test_id, team_id)
        if success:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'error': 'Test case not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_testcase_bp.route('/executeTestCase', methods=['POST'])
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
            'message': f'Test case {test_case_id} execution started on device {device_name}',
            'execution_id': f'exec_{test_case_id}_{device_name}_{int(time.time())}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500 