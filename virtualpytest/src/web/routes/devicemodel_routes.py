'''
Device Model API Routes

This module contains the API endpoints for managing device models.
'''

from flask import Blueprint, request, jsonify

# Use centralized path setup
from path_setup import setup_all_paths
setup_all_paths()

from devicemodel_utils import (
    get_all_devicemodels, get_devicemodel, create_devicemodel, 
    update_devicemodel, delete_devicemodel, check_devicemodel_name_exists
)

from .utils import check_supabase, get_team_id

# Create blueprint
devicemodel_bp = Blueprint('devicemodel', __name__, url_prefix='/api')

# =====================================================
# DEVICE MODELS ENDPOINTS
# =====================================================

@devicemodel_bp.route('/devicemodels', methods=['GET', 'POST'])
def devicemodels():
    """Device Models management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            models = get_all_devicemodels(team_id)
            return jsonify(models)
        elif request.method == 'POST':
            model_data = request.json
            
            # Validate required fields
            if not model_data.get('name'):
                return jsonify({'error': 'Name is required'}), 400
            
            if not model_data.get('types') or len(model_data.get('types', [])) == 0:
                return jsonify({'error': 'At least one type must be selected'}), 400
            
            # Check for duplicate names
            if check_devicemodel_name_exists(model_data['name'], team_id):
                return jsonify({'error': 'A device model with this name already exists'}), 400
            
            # Create the device model
            created_model = create_devicemodel(model_data, team_id)
            if created_model:
                return jsonify({'status': 'success', 'model': created_model}), 201
            else:
                return jsonify({'error': 'Failed to create device model'}), 500
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devicemodel_bp.route('/devicemodels/<model_id>', methods=['GET', 'PUT', 'DELETE'])
def devicemodel(model_id):
    """Individual device model management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            model = get_devicemodel(model_id, team_id)
            if model:
                return jsonify(model)
            else:
                return jsonify({'error': 'Device model not found'}), 404
                
        elif request.method == 'PUT':
            model_data = request.json
            
            # Validate required fields
            if not model_data.get('name'):
                return jsonify({'error': 'Name is required'}), 400
            
            if not model_data.get('types') or len(model_data.get('types', [])) == 0:
                return jsonify({'error': 'At least one type must be selected'}), 400
            
            # Check for duplicate names (excluding current model)
            if check_devicemodel_name_exists(model_data['name'], team_id, model_id):
                return jsonify({'error': 'A device model with this name already exists'}), 400
            
            # Update the device model
            updated_model = update_devicemodel(model_id, model_data, team_id)
            if updated_model:
                return jsonify({'status': 'success', 'model': updated_model})
            else:
                return jsonify({'error': 'Device model not found or failed to update'}), 404
                
        elif request.method == 'DELETE':
            success = delete_devicemodel(model_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Device model not found or failed to delete'}), 404
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500 