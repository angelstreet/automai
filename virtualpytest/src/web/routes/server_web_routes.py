"""
Server Web Routes

Server-side web automation proxy endpoints that forward requests to host web controllers.
"""

from flask import Blueprint, request, jsonify, current_app
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request
from src.utils.task_manager import task_manager
import threading
import uuid

# Create blueprint
server_web_bp = Blueprint('server_web', __name__, url_prefix='/server/web')

# =====================================================
# WEB CONTROLLER ENDPOINTS
# =====================================================

@server_web_bp.route('/executeCommand', methods=['POST'])
def execute_command():
    """Proxy execute web command request to selected host"""
    try:
        print("[@route:server_web:execute_command] Proxying execute command request")
        
        # Get request data
        request_data = request.get_json() or {}
        command = request_data.get('command', '')
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Handle browser_use_task asynchronously
        if command == 'browser_use_task':
            # Create task and return immediately
            task_id = task_manager.create_task(command, request_data.get('params', {}))
            
            # Add callback URL to host request
            callback_url = f"{request.host_url.rstrip('/')}/server/web/taskComplete"
            host_request_data['callback_url'] = callback_url
            host_request_data['task_id'] = task_id
            
            # Execute in background thread
            def execute_async():
                try:
                    response_data, status_code = proxy_to_host('/host/web/executeCommand', 'POST', host_request_data, timeout=600)
                    if status_code != 200:
                        # Host execution failed, complete task with error
                        task_manager.complete_task(task_id, {}, error=response_data.get('error', 'Host execution failed'))
                except Exception as e:
                    task_manager.complete_task(task_id, {}, error=str(e))
            
            threading.Thread(target=execute_async, daemon=True).start()
            
            return jsonify({
                'success': True,
                'task_id': task_id,
                'status': 'started',
                'message': 'Browser-use task started in background'
            }), 202
        
        else:
            # Handle other commands synchronously as before
            timeout = 30
            response_data, status_code = proxy_to_host('/host/web/executeCommand', 'POST', host_request_data, timeout=timeout)
            return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/taskComplete', methods=['POST'])
def task_complete():
    """Receive task completion callback from host and notify frontend via WebSocket"""
    try:
        print("[@route:server_web:task_complete] Received task completion callback")
        
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
        task_manager.complete_task(task_id, result, error)
        
        # Emit WebSocket notification to frontend
        if hasattr(current_app, 'socketio'):
            current_app.socketio.emit('task_complete', {
                'task_id': task_id,
                'success': not bool(error),
                'result': result,
                'error': error,
                'execution_time': result.get('execution_time', 0)
            })
            print(f"[@route:server_web:task_complete] WebSocket notification sent for task {task_id}")
        
        return jsonify({
            'success': True,
            'message': 'Task completion processed'
        }), 200
        
    except Exception as e:
        print(f"[@route:server_web:task_complete] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/navigateToUrl', methods=['POST'])
def navigate_to_url():
    """Proxy navigate to URL request to selected host"""
    try:
        print("[@route:server_web:navigate_to_url] Proxying navigate to URL request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/navigateToUrl', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/getPageInfo', methods=['POST'])
def get_page_info():
    """Proxy get page info request to selected host"""
    try:
        print("[@route:server_web:get_page_info] Proxying get page info request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/getPageInfo', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/openBrowser', methods=['POST'])
def open_browser():
    """Proxy open browser request to selected host"""
    try:
        print("[@route:server_web:open_browser] Proxying open browser request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/openBrowser', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/closeBrowser', methods=['POST'])
def close_browser():
    """Proxy close browser request to selected host"""
    try:
        print("[@route:server_web:close_browser] Proxying close browser request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/closeBrowser', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/getStatus', methods=['POST'])
def get_status():
    """Proxy get web controller status request to selected host"""
    try:
        print("[@route:server_web:get_status] Proxying get status request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/getStatus', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 