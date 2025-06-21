"""
Server Actions Routes - Unified API for Action Definitions

This module provides unified API endpoints for managing action definitions
using the database instead of JSON files.
"""

from flask import Blueprint, request, jsonify
from src.lib.supabase.actions_db import (
    save_action, 
    get_actions, 
    delete_action, 
    get_all_actions
)
from src.utils.app_utils import DEFAULT_TEAM_ID

# Create blueprint
server_actions_bp = Blueprint('server_actions', __name__)

@server_actions_bp.route('/server/actions/save', methods=['POST'])
def save_action_endpoint():
    """
    Save action definition to database.
    
    Expected JSON payload:
    {
        "name": "action_name",
        "device_model": "android_mobile",
        "action_type": "adb" | "ui" | "gesture",
        "command": "input tap 100 200",
        "parameters": {...}, // Optional
        "wait_time": 500, // Optional, defaults to 500
        "requires_input": false // Optional, defaults to false
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'device_model', 'action_type', 'command']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate action_type
        valid_types = ['adb', 'ui', 'gesture', 'navigation', 'system']
        if data['action_type'] not in valid_types:
            return jsonify({
                'success': False,
                'error': f'Action type must be one of: {", ".join(valid_types)}'
            }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Save to database
        result = save_action(
            name=data['name'],
            device_model=data['device_model'],
            action_type=data['action_type'],
            command=data['command'],
            team_id=team_id,
            parameters=data.get('parameters'),
            wait_time=data.get('wait_time', 500),
            requires_input=data.get('requires_input', False)
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Action saved successfully',
                'action_id': result.get('action_id')
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_actions_routes:save_action_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_actions_bp.route('/server/actions/list', methods=['GET'])
def list_actions_endpoint():
    """
    List actions with optional filtering.
    
    Query parameters:
    - action_type: Filter by type (adb, ui, gesture, etc.)
    - device_model: Filter by device model
    - name: Filter by name (partial match)
    """
    try:
        # Get query parameters
        action_type = request.args.get('action_type')
        device_model = request.args.get('device_model')
        name = request.args.get('name')
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Get actions from database
        result = get_actions(
            team_id=team_id,
            action_type=action_type,
            device_model=device_model,
            name=name
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'actions': result['actions'],
                'count': len(result['actions'])
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_actions_routes:list_actions_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_actions_bp.route('/server/actions/delete', methods=['DELETE'])
def delete_action_endpoint():
    """
    Delete action by ID or by name/model/type combination.
    
    Expected JSON payload (option 1 - by ID):
    {
        "action_id": "uuid"
    }
    
    Expected JSON payload (option 2 - by identifiers):
    {
        "name": "action_name",
        "device_model": "android_mobile", 
        "action_type": "adb"
    }
    """
    try:
        data = request.get_json()
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Delete by ID or by identifiers
        if 'action_id' in data:
            result = delete_action(team_id=team_id, action_id=data['action_id'])
        elif all(key in data for key in ['name', 'device_model', 'action_type']):
            result = delete_action(
                team_id=team_id,
                name=data['name'],
                device_model=data['device_model'],
                action_type=data['action_type']
            )
        else:
            return jsonify({
                'success': False,
                'error': 'Must provide either action_id or name/device_model/action_type'
            }), 400
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Action deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_actions_routes:delete_action_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_actions_bp.route('/server/actions/all', methods=['GET'])
def get_all_actions_endpoint():
    """
    Get all actions for the current team.
    """
    try:        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Get all actions
        result = get_all_actions(team_id=team_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'actions': result['actions'],
                'count': len(result['actions'])
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_actions_routes:get_all_actions_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

# Health check endpoint
@server_actions_bp.route('/server/actions/health', methods=['GET'])
def health_check():
    """Health check endpoint for actions API."""
    return jsonify({
        'success': True,
        'message': 'Actions API is healthy',
        'endpoints': [
            '/server/actions/save',
            '/server/actions/list', 
            '/server/actions/delete',
            '/server/actions/all'
        ]
    }) 