"""
Server Execution Results Routes

This module provides API endpoints for recording and retrieving execution results.
Used by React components to track verifications, actions, and navigation executions.
"""

from flask import Blueprint, request, jsonify
from src.lib.supabase.execution_results_db import (
    record_execution,
    record_batch_executions,
    get_execution_confidence,
    get_execution_history,
    get_team_execution_stats,
    record_verification,
    record_action
)

# Create blueprint for execution results routes
server_execution_results_bp = Blueprint('execution_results', __name__)

# TODO: Get team_id from authentication context
DEFAULT_TEAM_ID = "2211d930-8f20-4654-a0ca-699084e7917f"

@server_execution_results_bp.route('/executionResults/record', methods=['POST'])
def record_execution_result():
    """Record a single execution result."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['execution_category', 'execution_type', 'initiator_type', 'host_name', 'command', 'success']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        team_id = data.get('team_id', DEFAULT_TEAM_ID)
        execution_id = record_execution(data, team_id)
        
        if execution_id:
            return jsonify({'success': True, 'id': execution_id})
        else:
            return jsonify({'success': False, 'error': 'Failed to record execution'}), 500
            
    except Exception as e:
        print(f"[@routes:execution_results:record_execution_result] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@server_execution_results_bp.route('/executionResults/recordBatch', methods=['POST'])
def record_batch_execution_results():
    """Record multiple execution results in a batch."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        executions = data.get('executions', [])
        if not executions:
            return jsonify({'success': False, 'error': 'No executions provided'}), 400
        
        team_id = data.get('team_id', DEFAULT_TEAM_ID)
        execution_ids = record_batch_executions(executions, team_id)
        
        if execution_ids:
            return jsonify({'success': True, 'ids': execution_ids})
        else:
            return jsonify({'success': False, 'error': 'Failed to record batch executions'}), 500
            
    except Exception as e:
        print(f"[@routes:execution_results:record_batch_execution_results] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@server_execution_results_bp.route('/executionResults/confidence', methods=['GET'])
def get_confidence():
    """Get confidence score for a specific context."""
    try:
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        execution_category = request.args.get('execution_category')
        initiator_type = request.args.get('initiator_type')
        initiator_id = request.args.get('initiator_id')
        execution_type = request.args.get('execution_type')
        limit = int(request.args.get('limit', 10))
        
        if not all([execution_category, initiator_type, initiator_id]):
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
        
        confidence_data = get_execution_confidence(
            team_id, execution_category, initiator_type, initiator_id, execution_type, limit
        )
        
        return jsonify({'success': True, 'data': confidence_data})
        
    except Exception as e:
        print(f"[@routes:execution_results:get_confidence] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@server_execution_results_bp.route('/executionResults/history', methods=['GET'])
def get_history():
    """Get recent execution history for a context."""
    try:
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        execution_category = request.args.get('execution_category')
        initiator_type = request.args.get('initiator_type')
        initiator_id = request.args.get('initiator_id')
        limit = int(request.args.get('limit', 20))
        
        if not all([execution_category, initiator_type, initiator_id]):
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
        
        history_data = get_execution_history(
            team_id, execution_category, initiator_type, initiator_id, limit
        )
        
        return jsonify({'success': True, 'data': history_data})
        
    except Exception as e:
        print(f"[@routes:execution_results:get_history] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@server_execution_results_bp.route('/executionResults/teamStats', methods=['GET'])
def get_team_stats():
    """Get team execution statistics."""
    try:
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        days = int(request.args.get('days', 7))
        
        stats_data = get_team_execution_stats(team_id, days)
        
        return jsonify({'success': True, 'data': stats_data})
        
    except Exception as e:
        print(f"[@routes:execution_results:get_team_stats] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Convenience endpoints for specific execution types
@server_execution_results_bp.route('/executionResults/recordVerification', methods=['POST'])
def execution_results_record_verification():
    """Convenience endpoint for recording verification executions."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate required fields for verification
        required_fields = [
            'initiator_type', 'initiator_id', 'initiator_name', 'host_name', 'device_model',
            'verification_type', 'command', 'parameters', 'image_source_url', 'success',
            'execution_time_ms', 'message'
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        team_id = data.get('team_id', DEFAULT_TEAM_ID)
        execution_id = record_verification(
            team_id=team_id,
            initiator_type=data['initiator_type'],
            initiator_id=data['initiator_id'],
            initiator_name=data['initiator_name'],
            host_name=data['host_name'],
            device_model=data['device_model'],
            verification_type=data['verification_type'],
            command=data['command'],
            parameters=data['parameters'],

            image_source_url=data.get('image_source_url'),
            success=data['success'],
            execution_time_ms=data['execution_time_ms'],
            message=data['message'],
            error_details=data.get('error_details'),
            confidence_score=data.get('confidence_score'),
            execution_order=data.get('execution_order')
        )
        
        if execution_id:
            return jsonify({'success': True, 'id': execution_id})
        else:
            return jsonify({'success': False, 'error': 'Failed to record verification'}), 500
            
    except Exception as e:
        print(f"[@routes:execution_results:execution_results_record_verification] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@server_execution_results_bp.route('/executionResults/recordAction', methods=['POST'])
def execution_results_record_action():
    """Convenience endpoint for recording action executions."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate required fields for action
        required_fields = [
            'initiator_type', 'initiator_id', 'initiator_name', 'host_name', 'device_model',
            'action_type', 'command', 'parameters', 'success', 'execution_time_ms', 'message'
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        team_id = data.get('team_id', DEFAULT_TEAM_ID)
        execution_id = record_action(
            team_id=team_id,
            initiator_type=data['initiator_type'],
            initiator_id=data['initiator_id'],
            initiator_name=data['initiator_name'],
            host_name=data['host_name'],
            device_model=data['device_model'],
            action_type=data['action_type'],
            command=data['command'],
            parameters=data['parameters'],
            success=data['success'],
            execution_time_ms=data['execution_time_ms'],
            message=data['message'],
            error_details=data.get('error_details'),
            execution_order=data.get('execution_order')
        )
        
        if execution_id:
            return jsonify({'success': True, 'id': execution_id})
        else:
            return jsonify({'success': False, 'error': 'Failed to record action'}), 500
            
    except Exception as e:
        print(f"[@routes:execution_results:execution_results_record_action] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500 