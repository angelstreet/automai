"""
Host Navigation Routes - Execute navigation on host device
"""
from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_host
import time

host_navigation_bp = Blueprint('host_navigation', __name__, url_prefix='/host')

@host_navigation_bp.route('/navigation/execute', methods=['POST'])
def execute_navigation():
    """Execute navigation on host device using local navigation executor"""
    try:
        data = request.get_json()
        tree_id = data.get('tree_id')
        target_node_id = data.get('target_node_id')
        team_id = data.get('team_id')
        current_node_id = data.get('current_node_id')
        
        print(f"[@route:host_navigation:execute] Executing navigation to {target_node_id} in tree {tree_id}")
        
        if not all([tree_id, target_node_id, team_id]):
            return jsonify({
                'success': False,
                'error': 'tree_id, target_node_id, and team_id are required'
            }), 400
        
        # Call local navigation executor directly
        from src.lib.navigation.navigation_executor import execute_navigation_with_verification
        
        result = execute_navigation_with_verification(tree_id, target_node_id, team_id, current_node_id)
        
        print(f"[@route:host_navigation:execute] Navigation result: {result}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_navigation:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Navigation execution error: {str(e)}'
        }), 500 