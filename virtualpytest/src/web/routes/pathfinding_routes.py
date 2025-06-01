"""
Navigation Pathfinding and Automation Routes

This module contains the API endpoints for:
- Navigation pathfinding and execution
- Take control mode management
- Navigation cache management
- Navigation graph statistics
"""

from flask import Blueprint, request, jsonify
import sys
import os

# Add parent directory to path for imports
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, src_dir)

# Import from web utils directory
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)

from .utils import check_supabase, get_team_id

# Import navigation automation services - try/except for graceful fallback
try:
    # Add services directory to path
    services_path = os.path.join(web_dir, 'services')
    sys.path.insert(0, services_path)
    from navigation_service import navigation_service
    NAVIGATION_AUTOMATION_AVAILABLE = True
except ImportError as e:
    print(f"[@pathfinding_routes] Warning: Navigation automation not available: {e}")
    NAVIGATION_AUTOMATION_AVAILABLE = False

# Create blueprint
pathfinding_bp = Blueprint('pathfinding', __name__, url_prefix='/api/navigation')

# =====================================================
# NAVIGATION PATHFINDING & EXECUTION ROUTES
# =====================================================

@pathfinding_bp.route('/navigate/<tree_id>/<node_id>', methods=['POST'])
def navigate_to_node(tree_id, node_id):
    """API endpoint for navigation requests"""
    if not NAVIGATION_AUTOMATION_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Navigation automation system not available',
            'error_code': 'AUTOMATION_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:pathfinding:navigate] Request to navigate to node {node_id} in tree {tree_id}")
        
        # Get team_id from request or use default
        team_id = get_team_id()
        data = request.get_json() or {}
        current_node_id = data.get('current_node_id')
        execute = data.get('execute', True)
        
        result = navigation_service.navigate_to_node(
            tree_id=tree_id,
            target_node_id=node_id,
            team_id=team_id,
            current_node_id=current_node_id,
            execute=execute
        )
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@api:pathfinding:navigate] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

@pathfinding_bp.route('/preview/<tree_id>/<node_id>', methods=['GET'])
def get_navigation_preview(tree_id, node_id):
    """API endpoint for navigation preview"""
    if not NAVIGATION_AUTOMATION_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Navigation automation system not available',
            'error_code': 'AUTOMATION_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:pathfinding:preview] Request for navigation preview to node {node_id} in tree {tree_id}")
        
        # Get team_id from query params or use default
        team_id = get_team_id()
        current_node_id = request.args.get('current_node_id')
        
        steps = navigation_service.get_navigation_preview(
            tree_id=tree_id,
            target_node_id=node_id,
            team_id=team_id,
            current_node_id=current_node_id
        )
        
        return jsonify({
            'success': True,
            'tree_id': tree_id,
            'target_node_id': node_id,
            'steps': steps,
            'total_steps': len(steps)
        })
        
    except Exception as e:
        print(f"[@api:pathfinding:preview] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

@pathfinding_bp.route('/stats/<tree_id>', methods=['GET'])
def get_navigation_stats(tree_id):
    """API endpoint for navigation graph statistics"""
    if not NAVIGATION_AUTOMATION_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Navigation automation system not available',
            'error_code': 'AUTOMATION_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:pathfinding:stats] Request for navigation stats for tree {tree_id}")
        
        # Get team_id from query params or use default
        team_id = get_team_id()
        
        stats = navigation_service.get_navigation_graph_stats(tree_id, team_id)
        
        return jsonify(stats)
        
    except Exception as e:
        print(f"[@api:pathfinding:stats] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

# =====================================================
# CACHE MANAGEMENT ROUTES
# =====================================================

@pathfinding_bp.route('/cache/clear', methods=['POST'])
def clear_navigation_cache():
    """API endpoint for clearing navigation cache"""
    if not NAVIGATION_AUTOMATION_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Navigation automation system not available',
            'error_code': 'AUTOMATION_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:pathfinding:clear_cache] Request to clear navigation cache")
        
        data = request.get_json() or {}
        tree_id = data.get('tree_id')
        team_id = data.get('team_id') or get_team_id()
        
        result = navigation_service.clear_navigation_cache(tree_id, team_id)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@api:pathfinding:clear_cache] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

@pathfinding_bp.route('/cache/stats', methods=['GET'])
def get_cache_stats():
    """API endpoint for navigation cache statistics"""
    if not NAVIGATION_AUTOMATION_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Navigation automation system not available',
            'error_code': 'AUTOMATION_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:pathfinding:cache_stats] Request for cache statistics")
        
        # Import cache functions
        cache_path = os.path.join(web_dir, 'cache')
        sys.path.insert(0, cache_path)
        from navigation_cache import get_cache_stats
        
        stats = get_cache_stats()
        
        return jsonify({
            'success': True,
            'cache_stats': stats
        })
        
    except Exception as e:
        print(f"[@api:pathfinding:cache_stats] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

# =====================================================
# TAKE CONTROL MODE ROUTES
# =====================================================

@pathfinding_bp.route('/take-control/<tree_id>', methods=['POST'])
def toggle_take_control(tree_id):
    """API endpoint for activating/deactivating take control mode"""
    if not NAVIGATION_AUTOMATION_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Navigation automation system not available',
            'error_code': 'AUTOMATION_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:pathfinding:take_control] Request to toggle take control for tree {tree_id}")
        
        team_id = get_team_id()
        data = request.get_json() or {}
        user_id = data.get('user_id', 'default_user')  # In production, get from auth
        action = data.get('action', 'activate')  # activate or deactivate
        
        if action == 'activate':
            result = navigation_service.activate_take_control(tree_id, team_id, user_id)
        else:
            result = navigation_service.deactivate_take_control(tree_id, team_id)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@api:pathfinding:take_control] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

@pathfinding_bp.route('/take-control/<tree_id>/status', methods=['GET'])
def get_take_control_status(tree_id):
    """API endpoint for checking take control mode status"""
    if not NAVIGATION_AUTOMATION_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Navigation automation system not available',
            'error_code': 'AUTOMATION_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:pathfinding:take_control_status] Request for take control status for tree {tree_id}")
        
        team_id = get_team_id()
        
        is_active = navigation_service.is_take_control_active(tree_id, team_id)
        
        return jsonify({
            'success': True,
            'tree_id': tree_id,
            'take_control_active': is_active
        })
        
    except Exception as e:
        print(f"[@api:pathfinding:take_control_status] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

# =====================================================
# ALTERNATIVE PATHS ROUTES
# =====================================================

@pathfinding_bp.route('/alternatives/<tree_id>/<node_id>', methods=['GET'])
def get_alternative_paths(tree_id, node_id):
    """API endpoint for getting alternative navigation paths"""
    if not NAVIGATION_AUTOMATION_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Navigation automation system not available',
            'error_code': 'AUTOMATION_UNAVAILABLE'
        }), 503
        
    try:
        print(f"[@api:pathfinding:alternatives] Request for alternative paths to node {node_id} in tree {tree_id}")
        
        team_id = get_team_id()
        current_node_id = request.args.get('current_node_id')
        max_paths = int(request.args.get('max_paths', 3))
        
        alternative_paths = navigation_service.find_alternative_paths(
            tree_id=tree_id,
            target_node_id=node_id,
            team_id=team_id,
            current_node_id=current_node_id,
            max_paths=max_paths
        )
        
        return jsonify({
            'success': True,
            'tree_id': tree_id,
            'target_node_id': node_id,
            'alternative_paths': alternative_paths,
            'total_paths': len(alternative_paths)
        })
        
    except Exception as e:
        print(f"[@api:pathfinding:alternatives] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500 