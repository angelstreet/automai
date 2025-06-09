"""
Server Remote Routes

This module contains the server-side remote control API endpoints.
These endpoints provide abstract remote control functionality that works
with any remote controller type through the abstract controller pattern.
"""

from flask import Blueprint, request, jsonify, current_app

# Create blueprint with abstract prefix
remote_bp = Blueprint('remote', __name__, url_prefix='/server/remote')

# =====================================================
# ABSTRACT REMOTE CONTROL ENDPOINTS
# =====================================================

@remote_bp.route('/actions', methods=['GET'])
def get_remote_actions():
    """Get available remote control actions for the abstract remote controller."""
    try:
        print(f"[@route:get_remote_actions] Getting available remote actions")
        
        # Define available remote actions following the same pattern as verification actions
        # These are abstract actions that work with any remote controller type
        remote_actions = {
            "navigation": [
                {
                    "id": "navigate_up",
                    "label": "Navigate Up",
                    "command": "navigate",
                    "params": {"direction": "up"},
                    "description": "Navigate up in the interface",
                    "requiresInput": False
                },
                {
                    "id": "navigate_down", 
                    "label": "Navigate Down",
                    "command": "navigate",
                    "params": {"direction": "down"},
                    "description": "Navigate down in the interface",
                    "requiresInput": False
                },
                {
                    "id": "navigate_left",
                    "label": "Navigate Left", 
                    "command": "navigate",
                    "params": {"direction": "left"},
                    "description": "Navigate left in the interface",
                    "requiresInput": False
                },
                {
                    "id": "navigate_right",
                    "label": "Navigate Right",
                    "command": "navigate", 
                    "params": {"direction": "right"},
                    "description": "Navigate right in the interface",
                    "requiresInput": False
                }
            ],
            "interaction": [
                {
                    "id": "select",
                    "label": "Select/OK",
                    "command": "select",
                    "params": {},
                    "description": "Select current item or press OK",
                    "requiresInput": False
                },
                {
                    "id": "back",
                    "label": "Back",
                    "command": "back", 
                    "params": {},
                    "description": "Go back or press back button",
                    "requiresInput": False
                },
                {
                    "id": "home",
                    "label": "Home",
                    "command": "home",
                    "params": {},
                    "description": "Go to home screen",
                    "requiresInput": False
                },
                {
                    "id": "menu",
                    "label": "Menu",
                    "command": "menu",
                    "params": {},
                    "description": "Open menu",
                    "requiresInput": False
                }
            ],
            "input": [
                {
                    "id": "send_text",
                    "label": "Send Text",
                    "command": "send_text",
                    "params": {"text": ""},
                    "description": "Send text input to the device",
                    "requiresInput": True,
                    "inputLabel": "Text to send",
                    "inputPlaceholder": "Enter text..."
                },
                {
                    "id": "send_key",
                    "label": "Send Key",
                    "command": "send_key", 
                    "params": {"key": ""},
                    "description": "Send specific key press to the device",
                    "requiresInput": True,
                    "inputLabel": "Key name",
                    "inputPlaceholder": "e.g. ENTER, SPACE, etc."
                }
            ],
            "media": [
                {
                    "id": "play_pause",
                    "label": "Play/Pause",
                    "command": "play_pause",
                    "params": {},
                    "description": "Toggle play/pause for media",
                    "requiresInput": False
                },
                {
                    "id": "volume_up",
                    "label": "Volume Up",
                    "command": "volume_up",
                    "params": {},
                    "description": "Increase volume",
                    "requiresInput": False
                },
                {
                    "id": "volume_down",
                    "label": "Volume Down", 
                    "command": "volume_down",
                    "params": {},
                    "description": "Decrease volume",
                    "requiresInput": False
                }
            ]
        }
        
        print(f"[@route:get_remote_actions] Returning {len(remote_actions)} action categories")
        return jsonify({
            'success': True,
            'actions': remote_actions
        })
        
    except Exception as e:
        print(f"[@route:get_remote_actions] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error getting remote actions: {str(e)}'
        }), 500

@remote_bp.route('/execute-action', methods=['POST'])
def execute_remote_action():
    """Execute a remote control action using the abstract remote controller."""
    try:
        data = request.get_json()
        action = data.get('action')
        
        print(f"[@route:execute_remote_action] Executing remote action: {action}")
        
        if not action:
            return jsonify({
                'success': False,
                'error': 'Action is required'
            }), 400
        
        # Get the host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the abstract remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Extract action details
        command = action.get('command')
        params = action.get('params', {})
        
        print(f"[@route:execute_remote_action] Command: {command}, Params: {params}")
        
        # Execute the action using the abstract remote controller
        result = None
        success = False
        
        if command == 'navigate':
            direction = params.get('direction')
            result = remote_controller.navigate(direction)
            success = True
        elif command == 'select':
            result = remote_controller.select()
            success = True
        elif command == 'back':
            result = remote_controller.back()
            success = True
        elif command == 'home':
            result = remote_controller.home()
            success = True
        elif command == 'menu':
            result = remote_controller.menu()
            success = True
        elif command == 'send_text':
            text = params.get('text', '')
            result = remote_controller.send_text(text)
            success = True
        elif command == 'send_key':
            key = params.get('key', '')
            result = remote_controller.send_key(key)
            success = True
        elif command == 'play_pause':
            result = remote_controller.play_pause()
            success = True
        elif command == 'volume_up':
            result = remote_controller.volume_up()
            success = True
        elif command == 'volume_down':
            result = remote_controller.volume_down()
            success = True
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
        
        print(f"[@route:execute_remote_action] Action executed successfully: {success}")
        return jsonify({
            'success': success,
            'result': result,
            'message': f'Remote action {command} executed successfully'
        })
        
    except Exception as e:
        print(f"[@route:execute_remote_action] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error executing remote action: {str(e)}'
        }), 500

# NOTE: Navigation actions (navigate, click, swipe, key-press) are typically
# handled by navigation/pathfinding routes or direct controller calls.
# 
# If additional specific remote control endpoints are needed, they should be added here
# using the abstract remote controller pattern:
#
# @remote_bp.route('/navigate', methods=['POST'])
# def navigate():
#     """Navigate using abstract remote controller."""
#     try:
#         host_device = getattr(current_app, 'my_host_device', None)
#         if not host_device:
#             return jsonify({'success': False, 'error': 'Host device not initialized'}), 500
#         
#         remote_controller = host_device.get('controller_objects', {}).get('remote')
#         if not remote_controller:
#             return jsonify({'success': False, 'error': 'Remote controller not available'}), 400
#         
#         data = request.get_json()
#         result = remote_controller.navigate(data.get('direction'))
#         return jsonify({'success': True, 'result': result})
#     except Exception as e:
#         return jsonify({'success': False, 'error': str(e)}), 500

# DELETED: All device-specific /android-tv/* and /android-mobile/* endpoints
# - /config endpoints: Configuration happens at registration
# - /defaults endpoints: Controllers are pre-configured
# 
# Controllers are instantiated and configured during host registration.
# Routes should use the abstract controller methods only. 