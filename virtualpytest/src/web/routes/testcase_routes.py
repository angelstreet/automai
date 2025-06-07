'''
Test Case API Routes

This module contains the API endpoints for managing test cases.
'''

from flask import Blueprint, request, jsonify, current_app

# Import utility functions
import sys
import os

# Add parent directory to path for imports
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, src_dir)  # Insert at beginning to prioritize over local utils

from utils.supabase_utils import (
    get_all_test_cases, get_test_case, save_test_case, delete_test_case
)

from .utils import check_supabase, get_team_id

# Create blueprint
testcase_bp = Blueprint('testcase', __name__, url_prefix='/api')

# Helper functions (these should be imported from a shared module)
def get_user_id():
    '''Get user_id from request headers or use default for demo'''
    default_user_id = getattr(current_app, 'default_user_id', 'default-user-id')
    return request.headers.get('X-User-ID', default_user_id)

# =====================================================
# TEST CASES ENDPOINTS
# =====================================================

@testcase_bp.route('/testcases', methods=['GET', 'POST'])
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

@testcase_bp.route('/testcases/<test_id>', methods=['GET', 'PUT', 'DELETE'])
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