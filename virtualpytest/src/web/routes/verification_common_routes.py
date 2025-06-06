"""
Verification Common Routes

This module contains the common verification API endpoints that:
- Handle verification execution coordination
- Manage reference lists and status
- Provide shared verification utilities
"""

from flask import Blueprint, request, jsonify
import requests
import json
import os

# Create blueprint
verification_common_bp = Blueprint('verification_common', __name__)

# =====================================================
# COMMON VERIFICATION ENDPOINTS
# =====================================================

@verification_common_bp.route('/api/virtualpytest/reference/list', methods=['GET'])
def list_references():
    """Get list of available references from host."""
    try:
        model = request.args.get('model', 'default')
        
        print(f"[@route:list_references] Getting reference list for model: {model}")
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        print(f"[@route:list_references] Using hardcoded host: {host_ip}:{host_port}")
        
        # Forward request to host
        host_response = requests.get(
            f'http://{host_ip}:{host_port}/stream/references',
            params={'model': model},
            timeout=30
        )
        
        if host_response.status_code == 200:
            host_result = host_response.json()
            print(f"[@route:list_references] Host response: {len(host_result.get('references', []))} references")
            return jsonify(host_result)
        else:
            print(f"[@route:list_references] Host request failed: {host_response.status_code}")
            return jsonify({
                'success': False,
                'error': f'Host request failed: {host_response.status_code}'
            }), host_response.status_code
            
    except requests.exceptions.RequestException as e:
        print(f"[@route:list_references] Request error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to connect to host: {str(e)}'
        }), 500
    except Exception as e:
        print(f"[@route:list_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@verification_common_bp.route('/api/virtualpytest/verification/actions', methods=['POST'])
def verification_actions():
    """Handle verification actions like delete, update, etc."""
    try:
        data = request.get_json()
        action = data.get('action')
        reference_name = data.get('reference_name')
        model = data.get('model')
        
        print(f"[@route:verification_actions] Action: {action} for reference: {reference_name} (model: {model})")
        
        # Validate required parameters
        if not action or not reference_name or not model:
            return jsonify({
                'success': False,
                'error': 'action, reference_name, and model are required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Forward action request to host
        host_response = requests.post(
            f'http://{host_ip}:{host_port}/stream/reference-actions',
            json={
                'action': action,
                'reference_name': reference_name,
                'model': model
            },
            timeout=30
        )
        
        if host_response.status_code == 200:
            host_result = host_response.json()
            print(f"[@route:verification_actions] Host response: {host_result.get('success')}")
            return jsonify(host_result)
        else:
            print(f"[@route:verification_actions] Host request failed: {host_response.status_code}")
            return jsonify({
                'success': False,
                'error': f'Host request failed: {host_response.status_code}'
            }), host_response.status_code
            
    except requests.exceptions.RequestException as e:
        print(f"[@route:verification_actions] Request error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to connect to host: {str(e)}'
        }), 500
    except Exception as e:
        print(f"[@route:verification_actions] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@verification_common_bp.route('/api/virtualpytest/verification/status', methods=['GET'])
def verification_status():
    """Get verification system status."""
    try:
        print(f"[@route:verification_status] Getting verification system status")
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Forward status request to host
        host_response = requests.get(
            f'http://{host_ip}:{host_port}/stream/verification-status',
            timeout=30
        )
        
        if host_response.status_code == 200:
            host_result = host_response.json()
            print(f"[@route:verification_status] Host response: {host_result.get('status')}")
            return jsonify(host_result)
        else:
            print(f"[@route:verification_status] Host request failed: {host_response.status_code}")
            return jsonify({
                'success': False,
                'error': f'Host request failed: {host_response.status_code}'
            }), host_response.status_code
            
    except requests.exceptions.RequestException as e:
        print(f"[@route:verification_status] Request error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to connect to host: {str(e)}'
        }), 500
    except Exception as e:
        print(f"[@route:verification_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500 