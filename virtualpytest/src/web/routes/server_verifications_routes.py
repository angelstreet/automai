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
    get_all_verifications,
    get_verifications_by_ids
)
from src.lib.supabase.verifications_references_db import (
    save_reference,
    get_references,
    delete_reference
)
from src.utils.app_utils import DEFAULT_TEAM_ID

# Create blueprint
server_verifications_bp = Blueprint('server_verifications', __name__)

@server_verifications_bp.route('/server/verifications/save-reference', methods=['POST'])
def save_reference_endpoint():
    """
    Save reference asset (image/text) to database.
    
    Expected JSON payload:
    {
        "name": "reference_name",
        "device_model": "android_mobile",
        "type": "reference_image" | "reference_text",
        "r2_path": "path/in/r2",
        "r2_url": "https://...",
        "area": {...} // Optional, for reference data
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'device_model', 'type']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate type
        if data['type'] not in ['reference_image', 'reference_text']:
            return jsonify({
                'success': False,
                'error': 'Type must be "reference_image" or "reference_text"'
            }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Save to database using references table
        result = save_reference(
            name=data['name'],
            device_model=data['device_model'],
            reference_type=data['type'],
            team_id=team_id,
            r2_path=data.get('r2_path'),
            r2_url=data.get('r2_url'),
            area=data.get('area')
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Reference saved successfully',
                'reference_id': result.get('reference_id')
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_verifications_routes:save_reference_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_verifications_bp.route('/server/verifications/save-verification', methods=['POST'])
def save_verification_endpoint():
    """
    Save verification definition to database.
    
    Expected JSON payload:
    {
        "name": "verification_name",
        "device_model": "android_mobile", 
        "verification_type": "image" | "text" | "adb" | "appium" | "audio" | "video",
        "command": "verification_command",
        "parameters": {...}, // Optional parameters
        "timeout": 5000 // Optional timeout in ms
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
        
        # Validate verification_type
        valid_types = ['image', 'text', 'adb', 'appium', 'audio', 'video']
        if data['verification_type'] not in valid_types:
            return jsonify({
                'success': False,
                'error': f'verification_type must be one of: {", ".join(valid_types)}'
            }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Save to database using verifications table
        result = save_verification(
            name=data['name'],
            device_model=data['device_model'],
            verification_type=data['verification_type'],
            command=data['command'],
            team_id=team_id,
            parameters=data.get('parameters'),
            timeout=data.get('timeout'),
            r2_path=data.get('r2_path'),  # Optional for image verifications
            r2_url=data.get('r2_url'),    # Optional for image verifications
            area=data.get('area')         # Optional for image verifications
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

@server_verifications_bp.route('/server/verifications/load-by-ids', methods=['POST'])
def load_verifications_by_ids_endpoint():
    """
    Load verification definitions by their database IDs.
    
    Expected JSON payload:
    {
        "verification_ids": ["uuid1", "uuid2", ...]
    }
    """
    try:
        data = request.get_json()
        verification_ids = data.get('verification_ids', [])
        
        if not verification_ids:
            return jsonify({
                'success': True,
                'verifications': [],
                'count': 0
            })
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Load verifications by their IDs
        result = get_verifications_by_ids(
            team_id=team_id,
            verification_ids=verification_ids
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
        print(f"[@server_verifications_routes:load_verifications_by_ids_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_verifications_bp.route('/server/verifications/load-for-tree', methods=['GET'])
def load_verifications_for_tree_endpoint():
    """
    Load verification definitions for a specific navigation tree.
    
    Query parameters:
    - tree_name: Name of the navigation tree (optional)
    - device_model: Device model (e.g., 'android_mobile')
    - tree_id: ID of the navigation tree (optional)
    """
    try:
        # Get query parameters
        tree_name = request.args.get('tree_name')
        tree_id = request.args.get('tree_id')
        device_model = request.args.get('device_model')
        
        if not device_model:
            return jsonify({
                'success': False,
                'error': 'device_model parameter is required'
            }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Get all verifications for the device model
        # We'll filter by tree name/id in the verification names if provided
        result = get_verifications(
            team_id=team_id,
            device_model=device_model
        )
        
        if result['success']:
            verifications = result['verifications']
            
            # If tree_name or tree_id is provided, filter verifications that contain the tree identifier
            if tree_name or tree_id:
                tree_identifier = tree_name or tree_id
                filtered_verifications = []
                
                for verification in verifications:
                    # Check if the verification name contains the tree identifier
                    # This assumes verification names follow the pattern: {tree_name}_{verification_type}_{timestamp}
                    if tree_identifier.lower() in verification.get('name', '').lower():
                        filtered_verifications.append(verification)
                
                verifications = filtered_verifications
            
            return jsonify({
                'success': True,
                'verifications': verifications,
                'count': len(verifications),
                'tree_name': tree_name,
                'tree_id': tree_id,
                'device_model': device_model
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_verifications_routes:load_verifications_for_tree_endpoint] Error: {e}")
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
            '/server/verifications/save-reference',
            '/server/verifications/save-verification',
            '/server/verifications/load-for-tree',
            '/server/verifications/list', 
            '/server/verifications/delete',
            '/server/verifications/all'
        ]
    }) 