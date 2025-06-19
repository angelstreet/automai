"""
Navigation Config Routes - Database Migration Redirect

DEPRECATED: These routes now redirect to the new database-based navigation tree API.
The old JSON file system has been replaced with a Supabase database for better reliability.
"""

from flask import Blueprint, request, jsonify, redirect, url_for
from src.lib.supabase.navigation_trees_db import get_navigation_trees, get_navigation_tree
from src.utils.app_utils import DEFAULT_TEAM_ID

# Create blueprint
navigation_config_bp = Blueprint('navigation_config', __name__, url_prefix='/server/navigation/config')


@navigation_config_bp.route('/trees', methods=['GET'])
def get_navigation_trees_redirect():
    """
    DEPRECATED: Redirect to new database API
    """
    print("[@route:navigation_config:get_navigation_trees_redirect] DEPRECATED: Redirecting to database API")
    
    # For now, return empty list to avoid breaking existing clients
    return jsonify({
        'success': True,
        'trees': [],
        'total_count': 0,
                    'message': 'Navigation trees migrated to database. Use /server/navigation-trees/list instead.'
    })


@navigation_config_bp.route('/trees/<userinterface_name>', methods=['GET'])
def get_navigation_tree_redirect(userinterface_name):
    """
    DEPRECATED: Redirect to new database API
    """
    print(f"[@route:navigation_config:get_navigation_tree_redirect] DEPRECATED: Looking for tree: {userinterface_name}")
    
    try:
        # Try to find a tree for this userinterface name by searching all trees
        success, message, trees = get_navigation_trees(DEFAULT_TEAM_ID)
        
        if success and trees:
            # Look for a tree that matches this userinterface name
            for tree in trees:
                # Check if this tree's userinterface name matches
                # This is a best-effort mapping from the old system
                if userinterface_name in str(tree.get('name', '')).lower():
                    return jsonify({
                        'success': True,
                        'tree_data': tree.get('metadata', {}),
                        'tree_name': userinterface_name,
                        'userinterface': None,  # Will be set by frontend
                        'is_locked': False,  # Database trees don't use file locking
                        'lock_info': None,
                        'message': 'Tree loaded from database. Consider migrating to new API.'
                    })
        
        # If not found, return empty tree structure
        return jsonify({
            'success': True,
            'tree_data': {'nodes': [], 'edges': []},
            'tree_name': userinterface_name,
            'userinterface': None,
            'is_locked': False,
            'lock_info': None,
            'message': 'No tree found. Use /server/navigation-trees/save to create new tree.'
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:get_navigation_tree_redirect] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@navigation_config_bp.route('/trees/<userinterface_name>/lock', methods=['POST'])
def lock_navigation_tree_redirect(userinterface_name):
    """
    DEPRECATED: Database trees don't require file-based locking
    """
    print(f"[@route:navigation_config:lock_navigation_tree_redirect] DEPRECATED: Database trees don't need locking: {userinterface_name}")
    
    # Always return success for database trees
    return jsonify({
        'success': True,
        'message': f'Database tree {userinterface_name} ready for editing',
        'lock_info': {
            'locked_by': 'database-user',
            'locked_at': '2024-01-01T00:00:00Z',
            'session_id': 'database-session'
        }
    })


@navigation_config_bp.route('/trees/<userinterface_name>/unlock', methods=['POST'])
def unlock_navigation_tree_redirect(userinterface_name):
    """
    DEPRECATED: Database trees don't require file-based locking
    """
    print(f"[@route:navigation_config:unlock_navigation_tree_redirect] DEPRECATED: Database trees don't need unlocking: {userinterface_name}")
    
    # Always return success for database trees
    return jsonify({
        'success': True,
        'message': f'Database tree {userinterface_name} unlocked'
    })


@navigation_config_bp.route('/trees/<userinterface_name>', methods=['POST'])
@navigation_config_bp.route('/saveTree/<userinterface_name>', methods=['PUT'])
def save_navigation_tree_redirect(userinterface_name):
    """
    DEPRECATED: Redirect to new database API
    """
    print(f"[@route:navigation_config:save_navigation_tree_redirect] DEPRECATED: Redirecting save for tree: {userinterface_name}")
    
    return jsonify({
        'success': False,
                    'error': 'Tree saving migrated to database. Use /server/navigation-trees/save instead.',
        'migration_note': 'Please update your client to use the new database API endpoints.'
    }), 410  # Gone


@navigation_config_bp.route('/createEmpty/<userinterface_name>', methods=['POST'])
def create_empty_navigation_config_redirect(userinterface_name):
    """
    DEPRECATED: Redirect to new database API
    """
    print(f"[@route:navigation_config:create_empty_navigation_config_redirect] DEPRECATED: Redirecting create for tree: {userinterface_name}")
    
    return jsonify({
        'success': False,
                    'error': 'Tree creation migrated to database. Use /server/navigation-trees/save instead.',
        'migration_note': 'Please update your client to use the new database API endpoints.'
    }), 410  # Gone


# Health check endpoint
@navigation_config_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for navigation config service"""
    return jsonify({
        'success': True,
        'service': 'navigation_config_deprecated',
        'status': 'redirecting_to_database',
                    'message': 'This service is deprecated. Use /server/navigation-trees/ endpoints instead.'
    }) 