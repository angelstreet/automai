"""
Host Script Routes - Execute scripts on host device
"""
from flask import Blueprint, request, jsonify
from src.utils.script_utils import execute_script

host_script_bp = Blueprint('host_script', __name__, url_prefix='/host')

@host_script_bp.route('/script/execute', methods=['POST'])
def _execute_script():
    """Execute script on host device"""
    try:
        data = request.get_json()
        
        script_name = data.get('script_name')
        device_id = data.get('device_id')
        
        if not script_name or not device_id:
            return jsonify({
                'success': False,
                'error': 'script_name and device_id required'
            }), 400
        
        # Execute script
        result = execute_script(script_name, device_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 