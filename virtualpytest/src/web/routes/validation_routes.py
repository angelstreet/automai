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

@validation_bp.route('/optimal-path/<tree_id>', methods=['GET'])
def get_optimal_validation_path(tree_id):
    """API endpoint to get the full NetworkX optimized validation path without executing tests"""
    try:
        print(f"[@api:validation:optimal-path] Request for optimal path for tree {tree_id}")
        
        # Check if tree ID is valid
        if not tree_id or len(tree_id) < 10:
            return jsonify({
                'success': False,
                'error': 'Invalid tree ID format',
                'error_code': 'INVALID_TREE_ID'
            }), 400
        
        team_id = get_team_id()
        
        # Import the NetworkX pathfinding functions
        from navigation_pathfinding import (
            find_optimal_edge_validation_sequence,
            analyze_validation_sequence_efficiency
        )
        
        # First check if the tree exists
        from navigation_cache import get_cached_graph
        graph = get_cached_graph(tree_id, team_id)
        
        if not graph:
            return jsonify({
                'success': False,
                'error': 'Tree not found or could not be loaded',
                'error_code': 'TREE_NOT_FOUND'
            }), 404
            
        # Check if the graph has any edges
        if len(list(graph.edges())) == 0:
            return jsonify({
                'success': False,
                'error': 'The navigation tree has no edges to validate',
                'error_code': 'EMPTY_TREE'
            }), 404
        
        # Get the optimal validation sequence using NetworkX
        validation_sequence = find_optimal_edge_validation_sequence(tree_id, team_id)
        
        print(f"[@api:validation:optimal-path] DEBUG: Got validation sequence with {len(validation_sequence)} steps")
        for i, step in enumerate(validation_sequence):
            print(f"  {i+1:2d}. {step.get('from_node_label', 'NO_FROM')} → {step.get('to_node_label', 'NO_TO')} ({step.get('from_node_id', 'NO_FROM_ID')} → {step.get('to_node_id', 'NO_TO_ID')})")
        
        if not validation_sequence:
            return jsonify({
                'success': False,
                'error': 'Could not generate optimal path - tree not found or no edges',
                'error_code': 'PATH_GENERATION_FAILED'
            }), 404
        
        # Analyze the efficiency of the sequence
        efficiency_analysis = analyze_validation_sequence_efficiency(validation_sequence)
        
        # Format the response to show the full execution sequence
        formatted_sequence = []
        for step in validation_sequence:
            # Get target node information and its verifications
            from navigation_graph import get_node_info
            
            # Get the cached graph to access node data
            G = get_cached_graph(tree_id, team_id)
            target_node_info = get_node_info(G, step['to_node_id']) if G else {}
            
            # Extract target node verifications (these validate that we reached the correct target)
            target_verifications = target_node_info.get('verifications', []) if target_node_info else []
            
            # Also check for retryActions in target node (alternative storage location)
            if not target_verifications:
                target_verifications = target_node_info.get('retryActions', []) if target_node_info else []
            
            step_info = {
                'step_number': step['step_number'],
                'validation_type': step.get('validation_type', 'edge'),
                'from_node_id': step['from_node_id'],
                'to_node_id': step['to_node_id'],
                'from_node_label': step['from_node_label'],
                'to_node_label': step['to_node_label'],
                'actions': step.get('actions', []),
                'retryActions': target_verifications,  # Target node verifications, not edge retryActions
                'description': step['description'],
                'navigation_cost': step.get('navigation_cost', 0),
                'optimization': step.get('optimization', 'unknown'),
                'estimated_time': len(step.get('actions', [])) * 2.5 + step.get('navigation_cost', 0) * 1.5  # Estimate based on action count
            }
            formatted_sequence.append(step_info)
        
        # Create summary information
        summary = {
            'total_steps': len(validation_sequence),
            'edge_validations': efficiency_analysis['edge_validations'],
            'navigation_steps': efficiency_analysis['navigation_steps'],
            'bidirectional_optimizations': efficiency_analysis['bidirectional_optimizations'],
            'efficiency_ratio': efficiency_analysis['efficiency_ratio'],
            'optimizations_used': efficiency_analysis['optimizations_used'],
            'estimated_total_time': sum(step['estimated_time'] for step in formatted_sequence),
            'analysis': efficiency_analysis['analysis']
        }
        
        # Show bidirectional pairs explicitly
        bidirectional_pairs = []
        edge_lookup = {f"{step['from_node_id']}->{step['to_node_id']}": step for step in formatted_sequence if step['validation_type'] == 'edge'}
        
        for step in formatted_sequence:
            if step['validation_type'] == 'edge':
                reverse_key = f"{step['to_node_id']}->{step['from_node_id']}"
                if reverse_key in edge_lookup:
                    reverse_step = edge_lookup[reverse_key]
                    if step['step_number'] < reverse_step['step_number']:  # Only add once
                        bidirectional_pairs.append({
                            'forward': {
                                'step': step['step_number'],
                                'path': f"{step['from_node_label']} → {step['to_node_label']}",
                                'optimization': step['optimization']
                            },
                            'reverse': {
                                'step': reverse_step['step_number'],
                                'path': f"{reverse_step['from_node_label']} → {reverse_step['to_node_label']}",
                                'optimization': reverse_step['optimization']
                            },
                            'consecutive': abs(step['step_number'] - reverse_step['step_number']) == 1
                        })
        
        return jsonify({
            'success': True,
            'tree_id': tree_id,
            'optimal_path': {
                'sequence': formatted_sequence,
                'summary': summary,
                'bidirectional_pairs': bidirectional_pairs,
                'networkx_algorithms_used': [
                    'nx.is_eulerian() - Check if perfect traversal possible',
                    'nx.eulerian_path() - Find optimal path visiting each edge once',
                    'nx.shortest_path() - Navigate between disconnected components',
                    'nx.has_path() - Verify reachability before navigation',
                    'Custom bidirectional edge detection and grouping'
                ]
            }
        })
        
    except Exception as e:
        print(f"[@api:validation:optimal-path] Error: {e}")
        import traceback
        traceback.print_exc()
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
        skipped_edges = data.get('skipped_edges', [])  # Optional list of edges to skip
        
        if skipped_edges:
            print(f"[@api:validation:run] Received {len(skipped_edges)} skipped edges")
        
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
        
        # Run validation with optional skipped edges (this will now call progress callback during execution)
        results = validation_service.run_comprehensive_validation(tree_id, team_id, skipped_edges=skipped_edges)
        
        # Clear progress callback after completion
        validation_service.set_progress_callback(None)
        
        response_data = {
            'success': True,
            'results': results
        }
        
        # Include session_id in response if it was provided
        if session_id:
            response_data['session_id'] = session_id
            
        # Include skipped edges info in response if provided
        if skipped_edges:
            response_data['skipped_edges_count'] = len(skipped_edges)
        
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