"""
Host Script Routes - Execute scripts on host device
"""
from flask import Blueprint, request, jsonify
from src.utils.script_utils import execute_script

host_script_bp = Blueprint('host_script', __name__, url_prefix='/host')

@host_script_bp.route('/script/execute', methods=['POST'])
def _execute_script():
    """Execute script on host device with async support"""
    try:
        data = request.get_json()
        
        script_name = data.get('script_name')
        device_id = data.get('device_id')
        parameters = data.get('parameters', '')
        callback_url = data.get('callback_url')
        task_id = data.get('task_id')
        
        if not script_name or not device_id:
            return jsonify({
                'success': False,
                'error': 'script_name and device_id required'
            }), 400
        
        # Handle async execution with callback
        if callback_url and task_id:
            import threading
            import requests
            
            def execute_async():
                try:
                    print(f"[@route:host_script:_execute_script] Starting async script execution for task {task_id}")
                    result = execute_script(script_name, device_id, parameters)
                    
                    # Send callback with result
                    callback_data = {
                        'task_id': task_id,
                        'result': result,
                        'error': None if result.get('success') else result.get('stderr', 'Script execution failed')
                    }
                    
                    try:
                        print(f"[@route:host_script:_execute_script] Sending callback to: {callback_url}")
                        callback_response = requests.post(
                            callback_url, 
                            json=callback_data, 
                            timeout=30, 
                            verify=False
                        )
                        print(f"[@route:host_script:_execute_script] Callback sent for task {task_id}, status: {callback_response.status_code}")
                    except Exception as callback_error:
                        print(f"[@route:host_script:_execute_script] Callback failed for task {task_id}: {callback_error}")
                        
                except Exception as e:
                    print(f"[@route:host_script:_execute_script] Async execution failed for task {task_id}: {e}")
                    # Send callback with error
                    callback_data = {
                        'task_id': task_id,
                        'result': {},
                        'error': str(e)
                    }
                    
                    try:
                        requests.post(callback_url, json=callback_data, timeout=30, verify=False)
                    except:
                        pass  # Ignore callback errors when already handling an error
            
            # Start background execution
            threading.Thread(target=execute_async, daemon=True).start()
            
            return jsonify({
                'success': True,
                'message': f'Script {script_name} started in background',
                'task_id': task_id
            }), 202
        
        else:
            # Execute synchronously as before for backward compatibility
            result = execute_script(script_name, device_id, parameters)
            return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 