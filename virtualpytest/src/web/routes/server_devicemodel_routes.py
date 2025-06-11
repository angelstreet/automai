"""
Device Model Routes (Server-Only)

API endpoints for device model management operations.
"""

from flask import Blueprint, request, jsonify
import json

# Import database functions from src/lib/supabase (uses absolute import)
from src.lib.supabase.device_models_db import (
    get_all_device_models as get_all_devicemodels, 
    get_device_model as get_devicemodel, 
    create_device_model as create_devicemodel,
    update_device_model as update_devicemodel, 
    delete_device_model as delete_devicemodel, 
    check_device_model_name_exists as check_devicemodel_name_exists
)

from src.utils.app_utils import check_supabase, get_team_id

# Create blueprint
devicemodel_bp = Blueprint('server_devicemodel', __name__, url_prefix='/server/devicemodel')

# =====================================================
# DEVICE MODELS ENDPOINTS
# =====================================================

@devicemodel_bp.route('/getAllModels', methods=['GET'])
def get_devicemodels():
    """Get all device models for the team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        models = get_all_devicemodels(team_id)
        return jsonify(models)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devicemodel_bp.route('/create-devicemodel', methods=['POST'])
def create_devicemodel_endpoint():
    """Create a new device model"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
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

@devicemodel_bp.route('/get-devicemodel/<model_id>', methods=['GET'])
def get_devicemodel_endpoint(model_id):
    """Get a specific device model by ID"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        model = get_devicemodel(model_id, team_id)
        if model:
            return jsonify(model)
        else:
            return jsonify({'error': 'Device model not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devicemodel_bp.route('/update-devicemodel/<model_id>', methods=['PUT'])
def update_devicemodel_endpoint(model_id):
    """Update a specific device model"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
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
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devicemodel_bp.route('/delete-devicemodel/<model_id>', methods=['DELETE'])
def delete_devicemodel_endpoint(model_id):
    """Delete a specific device model"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        success = delete_devicemodel(model_id, team_id)
        if success:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'error': 'Device model not found or failed to delete'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500 