"""
Server Images Routes - Unified API for Screenshots and Reference Images

This module provides unified API endpoints for managing images (screenshots and reference images)
using the database instead of JSON files.
"""

from flask import Blueprint, request, jsonify
from src.lib.supabase.images_db import (
    save_image, 
    get_images, 
    delete_image, 
    get_all_images
)
from src.utils.app_utils import DEFAULT_TEAM_ID

# Create blueprint
server_images_bp = Blueprint('server_images', __name__)

@server_images_bp.route('/server/images/save', methods=['POST'])
def save_image_endpoint():
    """
    Save image (screenshot or reference_image) to database.
    
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
        result = save_image(
            name=data['name'],
            device_model=data['device_model'],
            type=data['type'],
            r2_path=data['r2_path'],
            r2_url=data['r2_url'],
            team_id=team_id,
            area=data.get('area')
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Image saved successfully',
                'image_id': result.get('image_id')
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_images_routes:save_image_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_images_bp.route('/server/images/list', methods=['GET'])
def list_images_endpoint():
    """
    List images with optional filtering.
    
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
        
        # Get images from database
        result = get_images(
            team_id=team_id,
            image_type=image_type,
            device_model=device_model,
            name=name
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'images': result['images'],
                'count': len(result['images'])
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_images_routes:list_images_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_images_bp.route('/server/images/delete', methods=['DELETE'])
def delete_image_endpoint():
    """
    Delete image by ID or by name/model/type combination.
    
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
        if 'image_id' in data:
            result = delete_image(team_id=team_id, image_id=data['image_id'])
        elif all(key in data for key in ['name', 'device_model', 'type']):
            result = delete_image(
                team_id=team_id,
                name=data['name'],
                device_model=data['device_model'],
                image_type=data['type']
            )
        else:
            return jsonify({
                'success': False,
                'error': 'Must provide either image_id or name/device_model/type'
            }), 400
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Image deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_images_routes:delete_image_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_images_bp.route('/server/images/all', methods=['GET'])
def get_all_images_endpoint():
    """
    Get all images for the current team.
    """
    try:        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Get all images
        result = get_all_images(team_id=team_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'images': result['images'],
                'count': len(result['images'])
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_images_routes:get_all_images_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

# Health check endpoint
@server_images_bp.route('/server/images/health', methods=['GET'])
def health_check():
    """Health check endpoint for images API."""
    return jsonify({
        'success': True,
        'message': 'Images API is healthy',
        'endpoints': [
            '/server/images/save',
            '/server/images/list', 
            '/server/images/delete',
            '/server/images/all'
        ]
    }) 