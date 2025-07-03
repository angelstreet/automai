"""
Server Actions Routes - Unified API for Action Definitions

This module provides unified API endpoints for managing action definitions
using the database instead of JSON files.
"""

from flask import Blueprint, request, jsonify
import os
import sys

# Add the parent directory to the path so we can import from src
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from src.lib.supabase.actions_db import save_action, get_actions as db_get_actions, delete_action, get_all_actions, get_edges_using_action, update_action

# Import default team ID from app utils (same as verifications)
from src.utils.app_utils import DEFAULT_TEAM_ID

from src.web.utils.routeUtils import proxy_to_host
import time
import requests

# Create blueprint
server_actions_bp = Blueprint('server_actions', __name__, url_prefix='/server/action')

# =====================================================
# BATCH ACTION EXECUTION (MIRRORS VERIFICATION WORKFLOW)
# =====================================================

@server_actions_bp.route('/executeBatch', methods=['POST'])
def action_execute_batch():
    """Execute batch of actions - mirrors verification batch execution"""
    try:
        print("[@route:server_actions:action_execute_batch] Starting batch action execution")
        
        # Get request data (same structure as verification)
        data = request.get_json() or {}
        actions = data.get('actions', [])  # Array of EdgeAction objects
        host = data.get('host', {})
        final_wait_time = data.get('final_wait_time', 0)
        retry_actions = data.get('retry_actions', [])
        
        print(f"[@route:server_actions:action_execute_batch] Processing {len(actions)} main actions, {len(retry_actions)} retry actions")
        print(f"[@route:server_actions:action_execute_batch] Host: {host.get('host_name')}, Device: {host.get('device_model')}")
        
        # Validate
        if not actions:
            return jsonify({'success': False, 'error': 'actions are required'}), 400
        
        if not host or not host.get('host_name'):
            return jsonify({'success': False, 'error': 'host information is required'}), 400
        
        results = []
        passed_count = 0
        execution_records = []
        execution_order = 1
        
        # Execute main actions
        print(f"[@route:server_actions:action_execute_batch] Executing {len(actions)} main actions")
        for i, action in enumerate(actions):
            result = execute_single_action(action, host, execution_order, i+1, 'main')
            results.append(result)
            if result.get('success'):
                passed_count += 1
            if result.get('execution_record'):
                execution_records.append(result.get('execution_record'))
            execution_order += 1
            
            # Small delay between actions
            if i < len(actions) - 1:
                time.sleep(0.5)
        
        # Execute retry actions if main actions failed
        main_actions_failed = passed_count < len(actions)
        if main_actions_failed and retry_actions:
            print(f"[@route:server_actions:action_execute_batch] Main actions failed, executing {len(retry_actions)} retry actions")
            for i, retry_action in enumerate(retry_actions):
                result = execute_single_action(retry_action, host, execution_order, i+1, 'retry')
                results.append(result)
                if result.get('success'):
                    passed_count += 1
                if result.get('execution_record'):
                    execution_records.append(result.get('execution_record'))
                execution_order += 1
                
                # Small delay between retry actions
                if i < len(retry_actions) - 1:
                    time.sleep(0.5)
        
        # Record to database (like verification)
        if execution_records:
            print(f"[@route:server_actions:action_execute_batch] Recording {len(execution_records)} executions to database")
            record_executions_to_database(execution_records)
        
        # Return aggregated results (same format as verification)
        overall_success = passed_count >= len(actions)  # Main actions must pass
        
        print(f"[@route:server_actions:action_execute_batch] Batch completed: {passed_count}/{len(actions)} main actions passed, overall success: {overall_success}")
        
        return jsonify({
            'success': overall_success,
            'total_count': len(actions),
            'passed_count': passed_count,
            'failed_count': len(actions) - passed_count,
            'results': results,
            'message': f'Batch action execution completed: {passed_count}/{len(actions)} passed'
        })
        
    except Exception as e:
        print(f"[@route:server_actions:action_execute_batch] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

def execute_single_action(action, host, execution_order, action_number, action_category):
    """Execute single action and return standardized result"""
    start_time = time.time()
    
    try:
        print(f"[@route:server_actions:execute_single_action] Executing {action_category} action {action_number}: {action.get('command')} with params {action.get('params', {})}")
        
        # Proxy to existing remote command endpoint
        response_data, status_code = proxy_to_host('/host/remote/executeCommand', 'POST', {
            'command': action.get('command'),
            'params': action.get('params', {}),
            'wait_time': action.get('waitTime', 0)
        })
        
        execution_time = int((time.time() - start_time) * 1000)
        success = status_code == 200 and response_data.get('success', False)
        
        print(f"[@route:server_actions:execute_single_action] Action {action_number} result: success={success}, time={execution_time}ms")
        
        # Create execution record for database
        execution_record = {
            'execution_category': 'action',
            'execution_type': 'remote_action',
            'initiator_type': 'edge',
            'initiator_id': action.get('id', 'unknown'),
            'initiator_name': action.get('label', action.get('command', 'Unknown Action')),
            'host_name': host.get('host_name'),
            'device_model': host.get('device_model'),
            'command': action.get('command'),
            'parameters': action.get('params', {}),
            'execution_order': execution_order,
            'success': success,
            'execution_time_ms': execution_time,
            'message': response_data.get('message') if success else response_data.get('error'),
            'error_details': None if success else {'error': response_data.get('error')}
        }
        
        # Return standardized result (same format as verification)
        return {
            'success': success,
            'message': f"{action.get('label', action.get('command'))}",
            'error': response_data.get('error') if not success else None,
            'resultType': 'PASS' if success else 'FAIL',
            'execution_time_ms': execution_time,
            'action_category': action_category,
            'execution_record': execution_record
        }
        
    except Exception as e:
        execution_time = int((time.time() - start_time) * 1000)
        print(f"[@route:server_actions:execute_single_action] Action {action_number} error: {str(e)}")
        
        return {
            'success': False,
            'message': f"{action.get('label', action.get('command'))}",
            'error': str(e),
            'resultType': 'FAIL',
            'execution_time_ms': execution_time,
            'action_category': action_category,
            'execution_record': {
                'execution_category': 'action',
                'execution_type': 'remote_action',
                'initiator_type': 'edge',
                'initiator_id': action.get('id', 'unknown'),
                'initiator_name': action.get('label', action.get('command', 'Unknown Action')),
                'host_name': host.get('host_name'),
                'device_model': host.get('device_model'),
                'command': action.get('command'),
                'parameters': action.get('params', {}),
                'execution_order': execution_order,
                'success': False,
                'execution_time_ms': execution_time,
                'message': str(e),
                'error_details': {'error': str(e)}
            }
        }

def record_executions_to_database(execution_records):
    """Record action executions to database (same as verification)"""
    try:
        print(f"[@route:server_actions:record_executions_to_database] Recording {len(execution_records)} executions")
        
        from src.utils.build_url_utils import buildServerUrl
        url = buildServerUrl('server/execution-results/record-batch')
        response = requests.post(url, 
                               json={'executions': execution_records},
                               timeout=10)
        
        result = response.json()
        if result.get('success'):
            print(f"[@route:server_actions:record_executions_to_database] Successfully recorded executions")
        else:
            print(f"[@route:server_actions:record_executions_to_database] Database recording failed: {result.get('error')}")
        
        return result
    except Exception as e:
        print(f"[@route:server_actions:record_executions_to_database] Database recording error: {e}")
        return {'success': False, 'error': str(e)}

# =====================================================
# EXISTING ENDPOINTS
# =====================================================

@server_actions_bp.route('/save', methods=['POST'])
def save_action_endpoint():
    """
    Save action definition to database.
    
    Expected JSON payload:
    {
        "name": "action_name",
        "device_model": "android_mobile",
        "action_type": "remote" | "av" | "power" | "ui",
        "command": "action_command",
        "params": {
            "key": "value",        // Action-specific parameters
            "wait_time": 0,      // Wait time in ms (now inside params)
            // ... other action-specific parameters
        },
        "requires_input": false    // Optional requires input flag
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'device_model', 'action_type', 'command']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate action_type
        valid_types = ['remote', 'av', 'power', 'ui']
        if data['action_type'] not in valid_types:
            return jsonify({
                'success': False,
                'error': f'action_type must be one of: {", ".join(valid_types)}'
            }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Save to database using actions table
        result = save_action(
            name=data['name'],
            device_model=data['device_model'],
            action_type=data['action_type'],
            command=data['command'],
            team_id=team_id,
            params=data.get('params', {}),
            requires_input=data.get('requires_input', False)
        )
        
        if result['success']:
            message = 'Action reused from existing' if result.get('reused') else 'Action saved successfully'
            return jsonify({
                'success': True,
                'message': message,
                'action_id': result.get('action_id'),
                'reused': result.get('reused', False)
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_actions_routes:save_action_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_actions_bp.route('/saveActions', methods=['POST'])
def save_navigation_actions_batch():
    """
    Batch save navigation actions to database.
    
    Expected JSON payload:
    {
        "actions": [
            {
                "name": "action_description",
                "device_model": "android_mobile",
                "command": "action_command",
                "params": {...}
            }
        ],
        "retry_actions": [
            {
                "name": "retry_action_description", 
                "device_model": "android_mobile",
                "command": "retry_action_command",
                "params": {...}
            }
        ]
    }
    """
    try:
        data = request.get_json()
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Save main actions
        action_ids = []
        actions = data.get('actions', [])
        for action in actions:
            # Validate required fields
            required_fields = ['name', 'device_model', 'command']
            for field in required_fields:
                if field not in action:
                    return jsonify({
                        'success': False,
                        'error': f'Missing required field: {field} in action'
                    }), 400
            
            # Save to database (this will reuse existing actions with same command/params)
            result = save_action(
                name=action['name'],
                device_model=action['device_model'],
                action_type='remote',  # Navigation actions are remote type
                command=action['command'],
                team_id=team_id,
                params=action.get('params', {}),
                requires_input=False
            )
            
            if result['success']:
                action_ids.append(result['action_id'])
            else:
                return jsonify({
                    'success': False,
                    'error': f'Failed to save action: {result.get("error", "Unknown error")}'
                }), 500
        
        # Save retry actions
        retry_action_ids = []
        retry_actions = data.get('retry_actions', [])
        for action in retry_actions:
            # Validate required fields
            required_fields = ['name', 'device_model', 'command']
            for field in required_fields:
                if field not in action:
                    return jsonify({
                        'success': False,
                        'error': f'Missing required field: {field} in retry action'
                    }), 400
            
            # Save to database (this will reuse existing actions with same command/params)
            result = save_action(
                name=action['name'],
                device_model=action['device_model'],
                action_type='remote',  # Navigation actions are remote type
                command=action['command'],
                team_id=team_id,
                params=action.get('params', {}),
                requires_input=False
            )
            
            if result['success']:
                retry_action_ids.append(result['action_id'])
            else:
                return jsonify({
                    'success': False,
                    'error': f'Failed to save retry action: {result.get("error", "Unknown error")}'
                }), 500
        
        return jsonify({
            'success': True,
            'action_ids': action_ids,
            'retry_action_ids': retry_action_ids,
            'message': f'Successfully saved {len(action_ids)} actions and {len(retry_action_ids)} retry actions'
        })
            
    except Exception as e:
        print(f"[@server_actions_routes:save_navigation_actions_batch] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_actions_bp.route('/getActions', methods=['GET'])
def get_actions():
    """
    List actions with optional filtering.
    
    Query parameters:
    - type: Filter by action type (remote, av, power, ui)
    - device_model: Filter by device model
    - name: Filter by name (partial match)
    """
    try:
        # Get query parameters
        action_type = request.args.get('type')
        device_model = request.args.get('device_model')
        name = request.args.get('name')
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Get actions from database
        result = db_get_actions(
            team_id=team_id,
            action_type=action_type,
            device_model=device_model,
            name=name
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'actions': result['actions'],
                'count': len(result['actions'])
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_actions_routes:get_actions] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_actions_bp.route('/delete', methods=['DELETE'])
def delete_action_endpoint():
    """
    Delete action by ID or by name/model/type combination.
    
    Expected JSON payload (option 1 - by ID):
    {
        "action_id": "uuid"
    }
    
    Expected JSON payload (option 2 - by identifiers):
    {
        "name": "action_name",
        "device_model": "android_mobile", 
        "action_type": "remote" | "av" | "power" | "ui"
    }
    """
    try:
        data = request.get_json()
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        
        # Delete by ID or by identifiers
        if 'action_id' in data:
            result = delete_action(team_id=team_id, action_id=data['action_id'])
        elif all(key in data for key in ['name', 'device_model', 'action_type']):
            result = delete_action(
                team_id=team_id,
                name=data['name'],
                device_model=data['device_model'],
                action_type=data['action_type']
            )
        else:
            return jsonify({
                'success': False,
                'error': 'Must provide either action_id or name/device_model/action_type'
            }), 400
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Action deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        print(f"[@server_actions_routes:delete_action_endpoint] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@server_actions_bp.route('/checkDependencies', methods=['POST'])
def check_action_dependencies():
    """
    Check which edges use a specific action.
    
    Expected JSON payload:
    {
        "action_id": "uuid"
    }
    """
    try:
        data = request.get_json()
        
        if 'action_id' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: action_id'
            }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        action_id = data['action_id']
        
        # Get edges using this action
        result = get_edges_using_action(team_id, action_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'edges': result['edges'],
                'count': len(result['edges'])
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_actions_bp.route('/checkDependenciesBatch', methods=['POST'])
def check_action_dependencies_batch():
    """
    Check which edges use multiple actions in a single request.
    
    Expected JSON payload:
    {
        "action_ids": ["uuid1", "uuid2", "uuid3"]
    }
    """
    try:
        data = request.get_json()
        
        if 'action_ids' not in data or not isinstance(data['action_ids'], list):
            return jsonify({
                'success': False,
                'error': 'Missing required field: action_ids (array)'
            }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        action_ids = data['action_ids']
        
        all_edges = []
        has_shared_actions = False
        
        # Check dependencies for all actions
        for action_id in action_ids:
            result = get_edges_using_action(team_id, action_id)
            if result['success'] and len(result['edges']) > 1:
                has_shared_actions = True
                all_edges.extend(result['edges'])
        
        # Remove duplicates by tree_name
        unique_edges = []
        seen_names = set()
        for edge in all_edges:
            if edge['tree_name'] not in seen_names:
                unique_edges.append(edge)
                seen_names.add(edge['tree_name'])
        
        return jsonify({
            'success': True,
            'edges': unique_edges,
            'count': len(unique_edges),
            'has_shared_actions': has_shared_actions
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_actions_bp.route('/update', methods=['PUT'])
def update_action_endpoint():
    """
    Update an action (called after user confirms dependency warning).
    
    Expected JSON payload:
    {
        "action_id": "uuid",
        "updates": {
            "command": "new_command",
            "params": {...}
        }
    }
    """
    try:
        data = request.get_json()
        
        if 'action_id' not in data or 'updates' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: action_id, updates'
            }), 400
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        action_id = data['action_id']
        updates = data['updates']
        
        # Update the action
        result = update_action(team_id, action_id, updates)
        
        if result['success']:
            return jsonify({
                'success': True,
                'updated_action': result['updated_action']
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_actions_bp.route('/getActionsByIds', methods=['POST'])
def get_actions_by_ids():
    """
    Get multiple actions by their IDs in a single batch request.
    
    Expected JSON payload:
    {
        "action_ids": ["uuid1", "uuid2", "uuid3"]
    }
    """
    try:
        data = request.get_json()
        
        if 'action_ids' not in data or not isinstance(data['action_ids'], list):
            return jsonify({
                'success': False,
                'error': 'Missing required field: action_ids (array)'
            }), 400
        
        if not data['action_ids']:
            return jsonify({
                'success': True,
                'actions': [],
                'count': 0
            })
        
        # Use default team ID
        team_id = DEFAULT_TEAM_ID
        action_ids = data['action_ids']
        
        # Get all actions first
        all_actions_result = db_get_actions(team_id=team_id)
        
        if not all_actions_result['success']:
            return jsonify({
                'success': False,
                'error': all_actions_result.get('error', 'Failed to retrieve actions')
            }), 500
        
        all_actions = all_actions_result['actions']
        
        # Filter actions by requested IDs
        requested_actions = []
        found_ids = set()
        
        for action in all_actions:
            if action.get('id') in action_ids:
                requested_actions.append(action)
                found_ids.add(action.get('id'))
        
        # Log any missing IDs
        missing_ids = set(action_ids) - found_ids
        if missing_ids:
            print(f"[@server_actions_routes:get_actions_by_ids] Warning: {len(missing_ids)} action IDs not found: {missing_ids}")
        
        print(f"[@server_actions_routes:get_actions_by_ids] Found {len(requested_actions)}/{len(action_ids)} requested actions")
        
        return jsonify({
            'success': True,
            'actions': requested_actions,
            'count': len(requested_actions),
            'requested_count': len(action_ids),
            'missing_ids': list(missing_ids)
        })
        
    except Exception as e:
        print(f"[@server_actions_routes:get_actions_by_ids] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


 