"""
Validation Routes for Navigation Trees

This module contains the API endpoints for:
- Validation preview (what will be tested)
- Running comprehensive validation
- Exporting validation reports
- Real-time validation progress (Server-Sent Events)
"""

from flask import Blueprint, request, jsonify, Response
import sys
import os
import json
import threading
import time
from queue import Queue, Empty

# Add parent directory to path for imports
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, src_dir)

# Import from web utils directory
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)

from .utils import check_supabase, get_team_id

# Import validation services
try:
    services_path = os.path.join(web_dir, 'services')
    sys.path.insert(0, services_path)
    from validation_service import validation_service
    VALIDATION_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"[@validation_routes] Warning: Validation service not available: {e}")
    VALIDATION_SERVICE_AVAILABLE = False

# Create blueprint
validation_bp = Blueprint('validation', __name__, url_prefix='/api/validation')

# Global dictionary to store progress queues for each validation session
progress_queues = {}

def create_progress_callback(session_id: str):
    """Create a progress callback function for a specific validation session"""
    def progress_callback(progress_data):
        if session_id in progress_queues:
            try:
                progress_queues[session_id].put(progress_data, timeout=1)
                print(f"[@validation_routes] Progress update for session {session_id}: Step {progress_data.get('currentStep', 0)}/{progress_data.get('totalSteps', 0)}")
            except Exception as e:
                print(f"[@validation_routes] Error sending progress update: {e}")
    return progress_callback

# =====================================================
# VALIDATION PREVIEW ROUTES
# =====================================================

@validation_bp.route('/preview/<tree_id>', methods=['GET'])
def get_validation_preview(tree_id):
    """API endpoint for validation preview"""
    if not VALIDATION_SERVICE_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Validation service not available',
            'error_code': 'SERVICE_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:validation:preview] Request for validation preview for tree {tree_id}")
        
        team_id = get_team_id()
        
        preview = validation_service.get_validation_preview(tree_id, team_id)
        
        return jsonify({
            'success': True,
            'preview': preview
        })
        
    except Exception as e:
        print(f"[@api:validation:preview] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

# =====================================================
# VALIDATION EXECUTION ROUTES
# =====================================================

@validation_bp.route('/progress/<session_id>')
def validation_progress(session_id):
    """Server-Sent Events endpoint for real-time validation progress"""
    def event_stream():
        # Create a queue for this session
        if session_id not in progress_queues:
            progress_queues[session_id] = Queue(maxsize=100)
        
        print(f"[@validation_routes] Starting SSE stream for session: {session_id}")
        
        try:
            while True:
                try:
                    # Get progress update from queue (wait up to 1 second)
                    progress_data = progress_queues[session_id].get(timeout=1.0)
                    
                    # Send progress data as SSE event
                    yield f"data: {json.dumps(progress_data)}\n\n"
                    
                    # If validation is completed, break the loop
                    if progress_data.get('currentEdgeStatus') == 'completed':
                        print(f"[@validation_routes] Validation completed for session: {session_id}")
                        break
                        
                except Empty:
                    # Send heartbeat to keep connection alive
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                    
        except GeneratorExit:
            print(f"[@validation_routes] SSE connection closed for session: {session_id}")
        finally:
            # Clean up the queue when stream ends
            if session_id in progress_queues:
                del progress_queues[session_id]
                print(f"[@validation_routes] Cleaned up progress queue for session: {session_id}")
    
    return Response(event_stream(), mimetype='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    })

@validation_bp.route('/run/<tree_id>', methods=['POST'])
def run_validation(tree_id):
    """API endpoint for running comprehensive validation with optional progress tracking"""
    if not VALIDATION_SERVICE_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Validation service not available',
            'error_code': 'SERVICE_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:validation:run] Request to run validation for tree {tree_id}")
        
        team_id = get_team_id()
        data = request.get_json() or {}
        session_id = data.get('session_id')  # Optional session ID for progress tracking
        
        # If session_id is provided, set up progress callback
        if session_id:
            print(f"[@api:validation:run] Setting up progress tracking for session: {session_id}")
            # Create progress queue for this session
            if session_id not in progress_queues:
                progress_queues[session_id] = Queue(maxsize=100)
            
            # Set up progress callback
            progress_callback = create_progress_callback(session_id)
            validation_service.set_progress_callback(progress_callback)
        else:
            # Clear any existing progress callback
            validation_service.set_progress_callback(None)
        
        # Run validation (this will now call progress callback during execution)
        results = validation_service.run_comprehensive_validation(tree_id, team_id)
        
        # Clear progress callback after completion
        validation_service.set_progress_callback(None)
        
        response_data = {
            'success': True,
            'results': results
        }
        
        # Include session_id in response if it was provided
        if session_id:
            response_data['session_id'] = session_id
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"[@api:validation:run] Error: {e}")
        # Clear progress callback on error
        validation_service.set_progress_callback(None)
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

# =====================================================
# VALIDATION EXPORT ROUTES
# =====================================================

@validation_bp.route('/export/<tree_id>', methods=['GET'])
def export_validation_report(tree_id):
    """API endpoint for exporting validation reports"""
    if not VALIDATION_SERVICE_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Validation service not available',
            'error_code': 'SERVICE_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:validation:export] Request to export validation report for tree {tree_id}")
        
        team_id = get_team_id()
        format_type = request.args.get('format', 'json')
        
        report_data = validation_service.export_validation_report(tree_id, team_id, format_type)
        
        # Set appropriate content type based on format
        if format_type == 'csv':
            content_type = 'text/csv'
            filename = f'validation-{tree_id}.csv'
        else:
            content_type = 'application/json'
            filename = f'validation-{tree_id}.json'
        
        return jsonify({
            'success': True,
            'report': report_data,
            'filename': filename,
            'content_type': content_type
        })
        
    except Exception as e:
        print(f"[@api:validation:export] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500 