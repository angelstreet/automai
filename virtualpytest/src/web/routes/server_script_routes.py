"""
Server Script Routes - Script management and execution proxy
"""
import os
import re
from flask import Blueprint, request, jsonify
import requests
from src.utils.host_utils import get_host_manager
from src.utils.build_url_utils import buildHostUrl

server_script_bp = Blueprint('server_script', __name__, url_prefix='/server')

def analyze_script_parameters(script_path):
    """
    Analyze a Python script to extract parameter information from argparse
    Returns dict with parameter details including required/optional status
    """
    try:
        if not os.path.exists(script_path):
            return {'success': False, 'error': f'Script not found: {script_path}'}
        
        with open(script_path, 'r', encoding='utf-8') as f:
            # Read first 100 lines to analyze parameters
            lines = []
            for i, line in enumerate(f):
                if i >= 100:
                    break
                lines.append(line.strip())
        
        script_content = '\n'.join(lines)
        
        # Look for argparse patterns
        parameters = []
        
        # Find argument parser creation and add_argument calls
        parser_patterns = [
            r"parser\.add_argument\(['\"]([^'\"]+)['\"][^)]*\)",
            r"parser\.add_argument\(['\"]--([^'\"]+)['\"][^)]*\)",
            r"parser\.add_argument\(['\"]([^'\"]+)['\"].*help=['\"]([^'\"]*)['\"]",
        ]
        
        # Extract positional arguments (required)
        positional_pattern = r"parser\.add_argument\(['\"]([^-][^'\"]*)['\"](?:[^)]*help=['\"]([^'\"]*)['\"])?[^)]*\)"
        positional_matches = re.findall(positional_pattern, script_content, re.MULTILINE)
        
        for match in positional_matches:
            param_name = match[0]
            help_text = match[1] if len(match) > 1 else ''
            parameters.append({
                'name': param_name,
                'type': 'positional',
                'required': True,
                'help': help_text or f'Required parameter: {param_name}',
                'default': None
            })
        
        # Extract optional arguments
        optional_pattern = r"parser\.add_argument\(['\"]--([^'\"]+)['\"](?:[^)]*help=['\"]([^'\"]*)['\"])?(?:[^)]*default=([^,)]+))?[^)]*\)"
        optional_matches = re.findall(optional_pattern, script_content, re.MULTILINE)
        
        for match in optional_matches:
            param_name = match[0]
            help_text = match[1] if len(match) > 1 else ''
            default_value = match[2].strip() if len(match) > 2 and match[2].strip() else None
            
            parameters.append({
                'name': param_name,
                'type': 'optional',
                'required': False,
                'help': help_text or f'Optional parameter: --{param_name}',
                'default': default_value
            })
        
        # Special handling for common patterns
        if 'userinterface_name' in [p['name'] for p in parameters]:
            # Add suggestions for userinterface_name based on common patterns
            ui_param = next(p for p in parameters if p['name'] == 'userinterface_name')
            ui_param['suggestions'] = [
                'horizon_android_mobile',
                'horizon_android_tv',
                'vz_android_mobile',
                'vz_android_tv'
            ]
        
        return {
            'success': True,
            'parameters': parameters,
            'script_name': os.path.basename(script_path),
            'has_parameters': len(parameters) > 0
        }
        
    except Exception as e:
        return {'success': False, 'error': f'Error analyzing script: {str(e)}'}

def suggest_parameter_value(param_name, device_model=None, device_id=None):
    """
    Suggest parameter values based on parameter name and device context
    """
    suggestions = {}
    
    if param_name == 'userinterface_name' and device_model:
        # Map device model to userinterface_name
        model_lower = device_model.lower()
        if 'mobile' in model_lower or 'phone' in model_lower:
            if 'horizon' in model_lower:
                suggestions['suggested'] = 'horizon_android_mobile'
            elif 'vz' in model_lower or 'verizon' in model_lower:
                suggestions['suggested'] = 'vz_android_mobile'
            else:
                suggestions['suggested'] = 'horizon_android_mobile'  # default
        elif 'tv' in model_lower or 'android_tv' in model_lower:
            if 'horizon' in model_lower:
                suggestions['suggested'] = 'horizon_android_tv'
            elif 'vz' in model_lower or 'verizon' in model_lower:
                suggestions['suggested'] = 'vz_android_tv'
            else:
                suggestions['suggested'] = 'horizon_android_tv'  # default
        else:
            # Default fallback
            suggestions['suggested'] = 'horizon_android_mobile'
        
        suggestions['confidence'] = 'high' if any(keyword in model_lower for keyword in ['horizon', 'vz', 'mobile', 'tv']) else 'medium'
    
    elif param_name == 'device' and device_id:
        suggestions['suggested'] = device_id
        suggestions['confidence'] = 'high'
    
    elif param_name == 'host':
        # Will be filled by the frontend based on selected host
        suggestions['suggested'] = ''
        suggestions['confidence'] = 'low'
    
    return suggestions

@server_script_bp.route('/script/analyze', methods=['POST'])
def analyze_script():
    """Analyze script parameters"""
    try:
        data = request.get_json()
        script_name = data.get('script_name')
        device_model = data.get('device_model')
        device_id = data.get('device_id')
        
        if not script_name:
            return jsonify({
                'success': False,
                'error': 'script_name is required'
            }), 400
        
        # Use centralized script path logic
        from src.utils.script_utils import get_script_path
        
        try:
            script_path = get_script_path(script_name)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 404
        
        print(f"[@analyze_script] Looking for script at: {script_path}")
        print(f"[@analyze_script] Script exists: {os.path.exists(script_path)}")
        
        # Analyze parameters
        analysis = analyze_script_parameters(script_path)
        
        if not analysis['success']:
            return jsonify(analysis), 404
        
        # Add parameter suggestions based on device context
        for param in analysis.get('parameters', []):
            param['suggestions'] = suggest_parameter_value(
                param['name'], 
                device_model=device_model, 
                device_id=device_id
            )
        
        return jsonify(analysis)
        
    except Exception as e:
        print(f"[@analyze_script] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_script_bp.route('/script/list', methods=['GET'])
def list_scripts():
    """List all available Python scripts using centralized script utils"""
    try:
        # Use centralized script listing logic
        from src.utils.script_utils import list_available_scripts, get_scripts_directory
        
        available_scripts = list_available_scripts()
        scripts_dir = get_scripts_directory()
        
        if not available_scripts:
            return jsonify({
                'success': False,
                'error': f'No scripts found in directory: {scripts_dir}'
            }), 404
        
        return jsonify({
            'success': True,
            'scripts': available_scripts,
            'count': len(available_scripts),
            'scripts_directory': scripts_dir
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_script_bp.route('/script/execute', methods=['POST'])
def execute_script():
    """Execute script asynchronously to prevent timeouts"""
    try:
        data = request.get_json()
        
        host_name = data.get('host_name')
        device_id = data.get('device_id')
        script_name = data.get('script_name')
        parameters = data.get('parameters', '')
        
        if not all([host_name, device_id, script_name]):
            return jsonify({
                'success': False,
                'error': 'host_name, device_id, and script_name required'
            }), 400
        
        # Get host info from registry
        host_manager = get_host_manager()
        host_info = host_manager.get_host(host_name)
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'Host not found: {host_name}'
            }), 404
        
        # Create task for async execution
        from src.utils.task_manager import task_manager
        task_id = task_manager.create_task('script_execute', {
            'script_name': script_name,
            'host_name': host_name,
            'device_id': device_id,
            'parameters': parameters
        })
        
        # Prepare request payload with callback
        payload = {
            'script_name': script_name,
            'device_id': device_id,
            'task_id': task_id
        }
        
        # Add parameters if provided
        if parameters and parameters.strip():
            payload['parameters'] = parameters.strip()
        
        # Add callback URL for async completion
        from src.utils.build_url_utils import buildServerUrl
        callback_url = buildServerUrl('server/script/taskComplete')
        payload['callback_url'] = callback_url
        
        # Execute in background thread
        import threading
        def execute_async():
            try:
                print(f"[@route:server_script:execute_script] Starting background execution for task {task_id}")
                
                # Build host URL
                host_url = buildHostUrl(host_info, '/host/script/execute')
                
                # Make request to host with extended timeout
                response = requests.post(
                    host_url,
                    json=payload,
                    timeout=300  # 5 minutes timeout for long-running scripts
                )
                
                result = response.json()
                
                if response.status_code != 200:
                    # Host execution failed, complete task with error
                    print(f"[@route:server_script:execute_script] Host execution failed for task {task_id}")
                    task_manager.complete_task(task_id, {}, error=result.get('error', 'Host execution failed'))
                else:
                    print(f"[@route:server_script:execute_script] Host execution completed for task {task_id}")
                    # Task will be completed by the host's callback or directly here if no callback
                    if 'callback_url' not in payload:
                        task_manager.complete_task(task_id, result)
                        
            except Exception as e:
                print(f"[@route:server_script:execute_script] Background execution error for task {task_id}: {e}")
                task_manager.complete_task(task_id, {}, error=str(e))
        
        threading.Thread(target=execute_async, daemon=True).start()
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'status': 'started',
            'message': f'Script "{script_name}" started in background'
        }), 202
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_script_bp.route('/script/taskComplete', methods=['POST'])
def task_complete():
    """Receive script execution completion callback from host"""
    try:
        print("[@route:server_script:task_complete] Received script completion callback")
        
        # Get callback data
        callback_data = request.get_json() or {}
        task_id = callback_data.get('task_id')
        result = callback_data.get('result', {})
        error = callback_data.get('error')
        
        if not task_id:
            return jsonify({
                'success': False,
                'error': 'task_id required'
            }), 400
        
        # Update task in manager
        from src.utils.task_manager import task_manager
        task_manager.complete_task(task_id, result, error)
        
        print(f"[@route:server_script:task_complete] Task {task_id} marked as {'failed' if error else 'completed'}")
        
        return jsonify({
            'success': True,
            'message': 'Script completion processed'
        }), 200
        
    except Exception as e:
        print(f"[@route:server_script:task_complete] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_script_bp.route('/script/status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """Get status of an async script execution task"""
    try:
        from src.utils.task_manager import task_manager
        task = task_manager.get_task(task_id)
        
        if not task:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        return jsonify({
            'success': True,
            'task': task
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500