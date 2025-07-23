"""
Heatmap Management Routes

This module contains the heatmap management API endpoints for:
- Heatmap data retrieval (images, incidents, hosts)
- Heatmap generation (async job-based)
- Job status monitoring
"""

from flask import Blueprint, request, jsonify

# Import database functions and utilities
from src.lib.supabase.heatmap_db import (
    get_heatmap_data
)
from src.utils.heatmap_utils import (
    create_heatmap_job,
    get_job_status,
    cancel_job,
    start_heatmap_generation
)

from src.utils.app_utils import check_supabase, get_team_id

# Create blueprint
server_heatmap_bp = Blueprint('server_heatmap', __name__, url_prefix='/server/heatmap')

# =====================================================
# HEATMAP ENDPOINTS
# =====================================================

@server_heatmap_bp.route('/getData', methods=['GET'])
def get_data():
    """Get heatmap data (hosts, recent images, incidents) for the team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Get heatmap data from database
        result = get_heatmap_data(team_id, timeframe_minutes=1)
        
        if result['success']:
            return jsonify(result['data'])
        else:
            return jsonify({'error': result.get('error', 'Failed to fetch heatmap data')}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_heatmap_bp.route('/generate', methods=['POST'])
def generate():
    """Start heatmap generation job"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Get request data
        data = request.get_json() or {}
        timeframe_minutes = data.get('timeframe_minutes', 1)
        
        # Create new job
        job_id = create_heatmap_job(timeframe_minutes)
        
        # Get heatmap data for processing
        data_result = get_heatmap_data(team_id, timeframe_minutes)
        
        if not data_result['success']:
            return jsonify({'error': data_result.get('error', 'Failed to fetch heatmap data')}), 500
        
        heatmap_data = data_result['data']
        
        # Start background generation
        start_heatmap_generation(
            job_id, 
            heatmap_data.get('images_by_timestamp', {}),
            heatmap_data.get('incidents', []),
            heatmap_data  # Pass the complete heatmap data
        )
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': 'Heatmap generation started'
        })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_heatmap_bp.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    """Get heatmap generation job status"""
    try:
        status = get_job_status(job_id)
        
        if status:
            return jsonify(status)
        else:
            return jsonify({'error': 'Job not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_heatmap_bp.route('/cancel/<job_id>', methods=['POST'])
def cancel(job_id):
    """Cancel heatmap generation job"""
    try:
        success = cancel_job(job_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Job cancelled successfully'
            })
        else:
            return jsonify({'error': 'Job not found or cannot be cancelled'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500 