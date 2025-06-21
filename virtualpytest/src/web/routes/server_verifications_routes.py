"""
Server Verifications Routes - Unified API for Verification Definitions

This module provides unified API endpoints for managing verification definitions
using the database instead of JSON files.
"""

from flask import Blueprint, request, jsonify
from src.lib.supabase.verifications_db import (
    save_verification, 
    get_verifications, 
    delete_verification, 
    get_all_verifications
)
from src.utils.app_utils import DEFAULT_TEAM_ID

# Create blueprint
server_verifications_bp = Blueprint('server_verifications', __name__)

@server_verifications_bp.route('/server/verifications/save', methods=['POST'])
def save_verification_endpoint():
    """
    Save verification definition to database.
    
    Expected JSON payload:
    {
        "name": "image_name",
        "device_model": "android_mobile",
        "type": "screenshot" | "reference_image",
        "r2_path": "path/in/r2",
        "r2_url": "https://...",
        "area": {...} // Optional, for reference images
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'device_model', 'type', 'r2_path', 'r2_url']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate type
        if data['type'] not in ['screenshot', 'reference_image']:
            return jsonify({
                'success': False,
                'error': 'Type must be "screenshot" or "reference_image"'
            }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Save to database
        result = save_verification(
            name=data['name'],
            device_model=data['device_model'],
            verification_type=data['type'],
            command=data.get('command', ''),
            team_id=team_id,
            parameters=data.get('parameters'),
            timeout=data.get('timeout'),
            r2_path=data.get('r2_path'),
            r2_url=data.get('r2_url'),
            area=data.get('area')
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Verification saved successfully',
                'verification_id': result.get('verification_id')
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

@server_verifications_bp.route('/server/verifications/list', methods=['GET'])
def list_verifications_endpoint():
    """
    List verifications with optional filtering.
    
    Query parameters:
    - type: Filter by type (screenshot, reference_image)
    - device_model: Filter by device model
    - name: Filter by name (partial match)
    """
    try:
        # Get query parameters
        image_type = request.args.get('type')
        device_model = request.args.get('device_model')
        name = request.args.get('name')
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Get verifications from database
        result = get_verifications(
            team_id=team_id,
            verification_type=image_type,
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
        print(f"[@server_verifications_routes:list_verifications_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_verifications_bp.route('/server/verifications/delete', methods=['DELETE'])
def delete_verification_endpoint():
    """
    Delete verification by ID or by name/model/type combination.
    
    Expected JSON payload (option 1 - by ID):
    {
        "image_id": "uuid"
    }
    
    Expected JSON payload (option 2 - by identifiers):
    {
        "name": "image_name",
        "device_model": "android_mobile", 
        "type": "screenshot" | "reference_image"
    }
    """
    try:
        data = request.get_json()
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Delete by ID or by identifiers
        if 'verification_id' in data:
            result = delete_verification(team_id=team_id, verification_id=data['verification_id'])
        elif all(key in data for key in ['name', 'device_model', 'type']):
            result = delete_verification(
                team_id=team_id,
                name=data['name'],
                device_model=data['device_model'],
                verification_type=data['type']
            )
        else:
            return jsonify({
                'success': False,
                'error': 'Must provide either verification_id or name/device_model/type'
            }), 400
        
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

@server_verifications_bp.route('/server/verifications/all', methods=['GET'])
def get_all_verifications_endpoint():
    """
    Get all verifications for the current team.
    """
    try:        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Get all verifications
        result = get_all_verifications(team_id=team_id)
        
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
        print(f"[@server_verifications_routes:get_all_verifications_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

# Health check endpoint
@server_verifications_bp.route('/server/verifications/health', methods=['GET'])
def health_check():
    """Health check endpoint for verifications API."""
    return jsonify({
        'success': True,
        'message': 'Verifications API is healthy',
        'endpoints': [
            '/server/verifications/save',
            '/server/verifications/list', 
            '/server/verifications/delete',
            '/server/verifications/all'
        ]
    }) 