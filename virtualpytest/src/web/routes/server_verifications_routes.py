"""
Server Verifications Routes - Unified API for Verification Definitions

This module provides unified API endpoints for managing verification definitions
using the database instead of JSON files.
"""

from flask import Blueprint, request, jsonify
import os
import sys

# Add the parent directory to the path so we can import from src
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from lib.supabase.verifications_db import save_verification, get_verifications, delete_verification, get_all_verifications

# Import default team ID from app utils (same as actions)
from src.utils.app_utils import DEFAULT_TEAM_ID

# Create blueprint
server_verifications_bp = Blueprint('server_verifications', __name__)

# =====================================================
# VERIFICATION MANAGEMENT ENDPOINTS
# =====================================================

@server_verifications_bp.route('/verification/saveVerification', methods=['POST'])
def save_verification_endpoint():
    """
    Save or update verification definition.
    
    Expected JSON payload:
    {
        "name": "verification_name",
        "device_model": "android_mobile",
        "verification_type": "image|text|adb",
        "command": "verification_command",
        "parameters": {...}
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'device_model', 'verification_type', 'command']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Save verification to database
        result = save_verification(
            team_id=team_id,
            name=data['name'],
            device_model=data['device_model'],
            verification_type=data['verification_type'],
            command=data['command'],
            parameters=data.get('parameters', {})
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'verification_id': result['verification_id'],
                'reused': result.get('reused', False),
                'message': 'Verification saved successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_verifications_routes:save_verification_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500



@server_verifications_bp.route('/verification/getVerifications', methods=['GET'])
def get_verifications_endpoint():
    """
    Get saved verifications from database with optional filtering.
    
    Query parameters:
    - verification_type: Filter by type
    - device_model: Filter by device model
    - name: Filter by name (partial match)
    """
    try:
        team_id = DEFAULT_TEAM_ID
        
        # Get optional filters from query parameters
        verification_type = request.args.get('verification_type')
        device_model = request.args.get('device_model')
        name = request.args.get('name')
        
        # Get verifications from database
        result = get_verifications(
            team_id=team_id,
            verification_type=verification_type,
            device_model=device_model,
            name=name
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'verifications': result['verifications'],
                'count': len(result['verifications'])
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_verifications_routes:get_verifications] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_verifications_bp.route('/verification/getAvailableVerifications', methods=['POST'])
def get_available_verifications():
    """Get available verification types from device controller (similar to getAvailableActions)."""
    try:
        data = request.get_json()
        host = data.get('host')
        
        if not host:
            return jsonify({'success': False, 'error': 'Host data is required'}), 400
        
        host_name = host.get('host_name')
        if not host_name:
            return jsonify({'success': False, 'error': 'Host name is required'}), 400
        
        print(f"[@route:server_verifications_routes:get_available_verifications] Getting available verification types for host: {host_name}")
        
        # Get host from host manager (similar to getAvailableActions)
        from src.utils.app_utils import get_host_manager
        host_manager = get_host_manager()
        host_data = host_manager.get_host(host_name)
        if not host_data:
            print(f"[@route:server_verifications_routes:get_available_verifications] Host {host_name} not found in host manager")
            return jsonify({'success': False, 'error': f'Host {host_name} not found'}), 404
        
        # Get available verification types from all devices in the host
        all_verification_types = {}
        devices = host_data.get('devices', [])
        
        for device in devices:
            device_verification_types = device.get('device_verification_types', {})
            device_name = device.get('device_name', device.get('device_id', 'unknown'))
            
            print(f"[@route:server_verifications_routes:get_available_verifications] Device {device_name} has {len(device_verification_types)} verification categories")
            
            # Merge device verification types into all_verification_types
            for category, verifications_list in device_verification_types.items():
                if category not in all_verification_types:
                    all_verification_types[category] = []
                if isinstance(verifications_list, list):
                    all_verification_types[category].extend(verifications_list)
        
        if not all_verification_types:
            print(f"[@route:server_verifications_routes:get_available_verifications] No verification types available for host {host_name}")
            return jsonify({'success': True, 'verifications': {}})
        
        print(f"[@route:server_verifications_routes:get_available_verifications] Returning verification types for host {host_name}")
        
        return jsonify({
            'success': True,
            'verifications': all_verification_types
        })
        
    except Exception as e:
        print(f"[@route:server_verifications_routes:get_available_verifications] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@server_verifications_bp.route('/verification/deleteVerification', methods=['POST'])
def delete_verification_endpoint():
    """
    Delete verification by ID or by identifiers.
    
    Expected JSON payload (option 1 - by ID):
    {
        "verification_id": "uuid"
    }
    
    Expected JSON payload (option 2 - by identifiers):
    {
        "name": "verification_name",
        "device_model": "android_mobile", 
        "verification_type": "image"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        team_id = DEFAULT_TEAM_ID
        
        # Delete verification from database
        result = delete_verification(
            team_id=team_id,
            verification_id=data.get('verification_id'),
            name=data.get('name'),
            device_model=data.get('device_model'),
            verification_type=data.get('verification_type')
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Verification deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_verifications_routes:delete_verification_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

 