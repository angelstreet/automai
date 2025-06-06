"""
System routes for client registration and health management
Handles server/client communication and registry
"""

from flask import Blueprint, request, jsonify, current_app
import threading
import time
import requests
import os
import logging
import tempfile
from datetime import datetime
from collections import deque

system_bp = Blueprint('system', __name__)

# In-memory log storage for debug purposes
_debug_logs = deque(maxlen=10000)  # Keep last 10000 log entries

class DebugLogHandler(logging.Handler):
    """Custom log handler to capture logs for debug modal"""
    
    def emit(self, record):
        try:
            log_entry = {
                'timestamp': datetime.fromtimestamp(record.created).isoformat(),
                'level': record.levelname,
                'message': self.format(record),
                'source': record.name
            }
            _debug_logs.append(log_entry)
        except Exception:
            pass  # Ignore errors in logging handler

# Set up debug logging
debug_handler = DebugLogHandler()
debug_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(name)s - %(message)s')
debug_handler.setFormatter(formatter)

# Add handler to root logger to capture all logs
root_logger = logging.getLogger()
root_logger.addHandler(debug_handler)
root_logger.setLevel(logging.DEBUG)

# Also add handler to Flask app logger
flask_logger = logging.getLogger('werkzeug')
flask_logger.addHandler(debug_handler)

def get_connected_clients():
    """Get connected clients from app context"""
    return getattr(current_app, '_connected_clients', {})

def get_health_check_threads():
    """Get health check threads from app context"""
    return getattr(current_app, '_health_check_threads', {})

def set_connected_clients(clients):
    """Set connected clients in app context"""
    current_app._connected_clients = clients

def set_health_check_threads(threads):
    """Set health check threads in app context"""
    current_app._health_check_threads = threads

@system_bp.route('/api/system/logs', methods=['GET'])
def get_logs():
    """Get server logs for debug modal"""
    try:
        lines = request.args.get('lines', 1000, type=int)
        level_filter = request.args.get('level', 'all').upper()
        
        # Convert deque to list and get last N entries
        all_logs = list(_debug_logs)
        
        # Filter by level if specified
        if level_filter != 'ALL':
            filtered_logs = [log for log in all_logs if log['level'] == level_filter]
        else:
            filtered_logs = all_logs
        
        # Get last N lines
        recent_logs = filtered_logs[-lines:] if lines > 0 else filtered_logs
        
        return jsonify({
            'success': True,
            'logs': recent_logs,
            'total_logs': len(all_logs),
            'filtered_logs': len(recent_logs)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/logs/clear', methods=['POST'])
def clear_logs():
    """Clear server logs"""
    try:
        _debug_logs.clear()
        
        # Add a log entry about clearing
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'message': 'Debug logs cleared via API',
            'source': 'system'
        }
        _debug_logs.append(log_entry)
        
        return jsonify({
            'success': True,
            'message': 'Logs cleared successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/register', methods=['POST'])
def register_client():
    """Client registers with server"""
    try:
        client_info = request.get_json()
        
        # Validate required fields
        required_fields = ['client_id', 'local_ip', 'client_port', 'device_model', 'name']
        for field in required_fields:
            if field not in client_info:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Add timestamp
        client_info['registered_at'] = datetime.now().isoformat()
        client_info['last_seen'] = time.time()
        
        # Store client info
        connected_clients = get_connected_clients()
        connected_clients[client_info['client_id']] = client_info
        set_connected_clients(connected_clients)
        
        # Start health check for this client
        start_health_check(client_info['client_id'], client_info['local_ip'], client_info['client_port'])
        
        print(f"✅ Client registered: {client_info['name']} ({client_info['device_model']}) at {client_info['local_ip']}:{client_info['client_port']}")
        
        return jsonify({
            'status': 'success',
            'message': 'Client registered successfully',
            'client_id': client_info['client_id']
        }), 200
        
    except Exception as e:
        print(f"❌ Error registering client: {e}")
        return jsonify({'error': str(e)}), 500

@system_bp.route('/api/system/unregister', methods=['POST'])
def unregister_client():
    """Client unregisters from server"""
    try:
        data = request.get_json()
        client_id = data.get('client_id')
        
        if not client_id:
            return jsonify({'error': 'Missing client_id'}), 400
        
        # Remove client
        connected_clients = get_connected_clients()
        if client_id in connected_clients:
            client_info = connected_clients[client_id]
            del connected_clients[client_id]
            set_connected_clients(connected_clients)
            
            # Stop health check thread
            health_check_threads = get_health_check_threads()
            if client_id in health_check_threads:
                # Thread will stop automatically when client is removed
                del health_check_threads[client_id]
                set_health_check_threads(health_check_threads)
            
            print(f"🔌 Client unregistered: {client_info.get('name', client_id)}")
            
            return jsonify({
                'status': 'success',
                'message': 'Client unregistered successfully'
            }), 200
        else:
            return jsonify({'error': 'Client not found'}), 404
            
    except Exception as e:
        print(f"❌ Error unregistering client: {e}")
        return jsonify({'error': str(e)}), 500

@system_bp.route('/api/system/health', methods=['GET'])
def health_check():
    """Health check endpoint for clients"""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'mode': os.getenv('SERVER_MODE', 'server')
    }), 200

@system_bp.route('/api/system/clients', methods=['GET'])
def list_clients():
    """Server lists all connected clients"""
    try:
        connected_clients = get_connected_clients()
        
        # Clean up stale clients (not seen for more than 2 minutes)
        current_time = time.time()
        stale_clients = []
        
        for client_id, client_info in connected_clients.items():
            if current_time - client_info.get('last_seen', 0) > 120:  # 2 minutes
                stale_clients.append(client_id)
        
        # Remove stale clients
        for client_id in stale_clients:
            remove_client(client_id)
        
        # Return current clients
        clients_list = []
        for client_id, client_info in connected_clients.items():
            clients_list.append({
                'client_id': client_id,
                'name': client_info.get('name'),
                'device_model': client_info.get('device_model'),
                'local_ip': client_info.get('local_ip'),
                'client_port': client_info.get('client_port'),
                'public_ip': client_info.get('public_ip'),
                'capabilities': client_info.get('capabilities', []),
                'status': client_info.get('status'),
                'registered_at': client_info.get('registered_at'),
                'last_seen': client_info.get('last_seen')
            })
        
        return jsonify({
            'status': 'success',
            'clients': clients_list,
            'total_clients': len(clients_list)
        }), 200
        
    except Exception as e:
        print(f"❌ Error listing clients: {e}")
        return jsonify({'error': str(e)}), 500

@system_bp.route('/api/system/client/<device_model>', methods=['GET'])
def get_client_by_device_model(device_model):
    """Get available client for specific device model"""
    try:
        connected_clients = get_connected_clients()
        
        # Find client with matching device model
        for client_id, client_info in connected_clients.items():
            if client_info.get('device_model') == device_model and client_info.get('status') == 'online':
                return jsonify({
                    'status': 'success',
                    'client': {
                        'client_id': client_id,
                        'name': client_info.get('name'),
                        'local_ip': client_info.get('local_ip'),
                        'client_port': client_info.get('client_port'),
                        'capabilities': client_info.get('capabilities', [])
                    }
                }), 200
        
        return jsonify({
            'status': 'error',
            'message': f'No available client found for device model: {device_model}'
        }), 404
        
    except Exception as e:
        print(f"❌ Error finding client: {e}")
        return jsonify({'error': str(e)}), 500

def start_health_check(client_id, client_ip, client_port):
    """Start health check thread for a client"""
    def health_worker():
        consecutive_failures = 0
        max_failures = 3
        
        while True:
            connected_clients = get_connected_clients()
            if client_id not in connected_clients:
                print(f"🔌 Health check stopped for {client_id} (client removed)")
                break
            
            try:
                response = requests.get(f"http://{client_ip}:{client_port}/api/system/health", timeout=5)
                if response.status_code == 200:
                    # Update last seen timestamp
                    connected_clients[client_id]['last_seen'] = time.time()
                    connected_clients[client_id]['status'] = 'online'
                    set_connected_clients(connected_clients)
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    
            except Exception as e:
                consecutive_failures += 1
                print(f"⚠️ Health check failed for {client_id}: {e}")
            
            # Remove client after max failures
            if consecutive_failures >= max_failures:
                print(f"❌ Removing client {client_id} after {max_failures} failed health checks")
                remove_client(client_id)
                break
            
            time.sleep(30)  # Check every 30 seconds
    
    # Start health check thread
    health_check_threads = get_health_check_threads()
    if client_id not in health_check_threads:
        thread = threading.Thread(target=health_worker, daemon=True)
        thread.start()
        health_check_threads[client_id] = thread
        set_health_check_threads(health_check_threads)

def remove_client(client_id):
    """Remove a client from the registry"""
    try:
        connected_clients = get_connected_clients()
        if client_id in connected_clients:
            client_info = connected_clients[client_id]
            del connected_clients[client_id]
            set_connected_clients(connected_clients)
            print(f"🗑️ Removed client: {client_info.get('name', client_id)}")
        
        # Clean up health check thread
        health_check_threads = get_health_check_threads()
        if client_id in health_check_threads:
            del health_check_threads[client_id]
            set_health_check_threads(health_check_threads)
            
    except Exception as e:
        print(f"❌ Error removing client {client_id}: {e}")

def find_available_client(device_model):
    """Find an available client for the given device model"""
    connected_clients = get_connected_clients()
    
    for client_id, client_info in connected_clients.items():
        if (client_info.get('device_model') == device_model and 
            client_info.get('status') == 'online'):
            return client_info
    
    return None 