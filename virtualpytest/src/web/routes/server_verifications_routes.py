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
        "params": {...}
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
            params=data.get('params', {})
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

 