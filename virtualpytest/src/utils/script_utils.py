"""
Script execution utilities following existing patterns from adb_utils and appium_utils
"""
import os
import sys
import subprocess
import uuid
from typing import Tuple, Dict, Any, Optional, List

# Add project root to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/utils
src_dir = os.path.dirname(current_dir)  # /src
project_root = os.path.dirname(src_dir)  # /virtualpytest

if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import existing utilities
from .app_utils import load_environment_variables
from .host_utils import get_host_instance, list_available_devices, get_controller
from .lock_utils import is_device_locked, lock_device, unlock_device


def load_navigation_tree(userinterface_name: str, script_name: str = "script") -> Dict[str, Any]:
    """
    Load navigation tree using direct database access (no HTTP requests).
    This populates the cache and is required before calling pathfinding functions.
    
    Args:
        userinterface_name: Name of the userinterface (e.g., 'horizon_android_mobile')
        script_name: Name of the script for logging
        
    Returns:
        Dictionary with success status and tree data or error
    """
    try:
        print(f"🔄 [{script_name}] Loading navigation tree for: {userinterface_name}")
        
        # Use hardcoded team_id (same as other script functions)
        team_id = "7fdeb4bb-3639-4ec3-959f-b54769a219ce"
        
        # Get userinterface by name using direct database access
        from src.lib.supabase.userinterface_db import get_all_userinterfaces
        
        userinterfaces = get_all_userinterfaces(team_id)
        if not userinterfaces:
            return {'success': False, 'error': "No userinterfaces found"}
        
        userinterface = None
        for ui in userinterfaces:
            if ui['name'] == userinterface_name:
                userinterface = ui
                break
        
        if not userinterface:
            return {'success': False, 'error': f"User interface '{userinterface_name}' not found"}
        
        userinterface_id = userinterface['id']
        
        # Load tree by userinterface_id using direct database access
        from src.lib.supabase.navigation_trees_db import get_navigation_trees
        
        success, message, trees = get_navigation_trees(team_id, userinterface_id)
        
        if not success or not trees:
            return {'success': False, 'error': f"Failed to load tree: {message}"}
        
        tree = trees[0]  # Get the first (and should be only) tree for this userinterface
        tree_id = tree['id']
        tree_metadata = tree.get('metadata', {})
        nodes = tree_metadata.get('nodes', [])
        edges = tree_metadata.get('edges', [])
        
        print(f"✅ [{script_name}] Loaded tree with {len(nodes)} nodes and {len(edges)} edges")
        
        return {
            'success': True,
            'tree': tree,
            'tree_id': tree_id,
            'userinterface_id': userinterface_id,
            'nodes': nodes,
            'edges': edges
        }
        
    except Exception as e:
        return {'success': False, 'error': f"Error loading navigation tree: {str(e)}"}


def setup_script_environment(script_name: str = "script") -> Dict[str, Any]:
    """
    Setup script environment by loading configuration and creating host instance.
    Reuses existing host_utils and app_utils infrastructure.
    
    Args:
        script_name: Name of the script for logging
        
    Returns:
        Dictionary containing host, team_id, and other configuration
    """
    print(f"🔧 [{script_name}] Setting up script environment...")
    
    # 1. Load environment variables (reuse app_utils pattern)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '..', 'web', '.env.host')
    
    if os.path.exists(env_path):
        load_environment_variables(mode='host', calling_script_dir=os.path.dirname(env_path))
    
    # 2. Get host instance (reuse host_utils)
    try:
        host = get_host_instance()
        print(f"✅ [{script_name}] Host created: {host.host_name}")
        print(f"📱 [{script_name}] Available devices: {host.get_device_count()}")
        
        # Display available devices
        if host.get_device_count() == 0:
            return {'success': False, 'error': 'No devices configured'}
        
        for device in host.get_devices():
            print(f"  - {device.device_name} ({device.device_model}) [{device.device_id}]")
            
    except Exception as e:
        return {'success': False, 'error': f'Failed to create host: {e}'}
    
    # 3. Get team_id (hardcoded for scripts)
    team_id = "7fdeb4bb-3639-4ec3-959f-b54769a219ce"
    print(f"👥 [{script_name}] Team ID: {team_id}")
    
    # 4. Return configuration
    return {
        'success': True,
        'host': host,
        'team_id': team_id,
        'script_name': script_name
    }


def select_device(host, device_id: Optional[str] = None, script_name: str = "script") -> Dict[str, Any]:
    """
    Select a device from the host, either specified or first available.
    
    Args:
        host: Host instance
        device_id: Optional specific device ID to select
        script_name: Name of the script for logging
        
    Returns:
        Dictionary with selected device or error
    """
    if device_id:
        # Use specified device
        selected_device = None
        for device in host.get_devices():
            if device.device_id == device_id:
                selected_device = device
                break
        
        if not selected_device:
            available_devices = [d.device_id for d in host.get_devices()]
            return {'success': False, 'error': f"Device {device_id} not found. Available: {available_devices}"}
    else:
        # Use first available device
        devices = host.get_devices()
        if not devices:
            return {'success': False, 'error': "No devices available"}
        selected_device = devices[0]
    
    print(f"✅ [{script_name}] Selected device: {selected_device.device_name} ({selected_device.device_id})")
    return {'success': True, 'device': selected_device}


def take_device_control(host, device, script_name: str = "script") -> Dict[str, Any]:
    """
    Take control of a device using existing lock_utils.
    
    Args:
        host: Host instance
        device: Device instance
        script_name: Name of the script for logging
        
    Returns:
        Dictionary with session_id or error
    """
    print(f"🔒 [{script_name}] Taking control of device {device.device_id}...")
    
    # Check device lock status
    device_key = f"{host.host_name}:{device.device_id}"
    
    if is_device_locked(device_key):
        return {'success': False, 'error': f"Device {device.device_id} is locked by another process"}
    
    # Take control
    session_id = str(uuid.uuid4())
    
    if not lock_device(device_key, session_id):
        return {'success': False, 'error': f"Failed to take control of device {device.device_id}"}
    
    print(f"✅ [{script_name}] Successfully took control of device {device.device_id}")
    return {'success': True, 'session_id': session_id, 'device_key': device_key}


def release_device_control(device_key: str, session_id: str, script_name: str = "script") -> bool:
    """
    Release control of a device using existing lock_utils.
    
    Args:
        device_key: Device key in format "hostname:device_id"
        session_id: Session ID from take_device_control
        script_name: Name of the script for logging
        
    Returns:
        True if successful, False otherwise
    """
    print(f"🔓 [{script_name}] Releasing control of device...")
    
    try:
        unlock_device(device_key, session_id)
        print(f"✅ [{script_name}] Device control released")
        return True
    except Exception as e:
        return False


def create_host_dict_for_executor(host) -> Dict[str, Any]:
    """
    Create host dictionary for NavigationExecutor (matching expected format).
    
    Args:
        host: Host instance
        
    Returns:
        Dictionary in format expected by NavigationExecutor
    """
    return {
        'host_name': host.host_name,
        'host_url': getattr(host, 'host_url', f"http://{host.host_ip}:{host.host_port}"),
        'host_ip': host.host_ip,
        'host_port': host.host_port,
        'devices': [device.to_dict() for device in host.get_devices()]
    }


def get_script_path(script_name: str) -> str:
    """Get script path using build_url_utils pattern"""
    # Get project root (same pattern as build_url_utils)
    current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/utils
    src_dir = os.path.dirname(current_dir)  # /src
    project_root = os.path.dirname(src_dir)  # /virtualpytest
    
    script_path = os.path.join(project_root, 'scripts', f'{script_name}.py')
    
    if not os.path.exists(script_path):
        raise ValueError(f'Script not found: {script_path}')
    
    return script_path


def execute_command(command: str, timeout: int = 30) -> Tuple[bool, str, str, int]:
    """
    Execute a command using subprocess (following existing patterns from adb_utils and appium_utils).
    
    Args:
        command: Command to execute
        timeout: Command timeout in seconds
        
    Returns:
        Tuple of (success, stdout, stderr, exit_code)
    """
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        success = result.returncode == 0
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        exit_code = result.returncode
        
        return success, stdout, stderr, exit_code
        
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out", -1
    except Exception as e:
        return False, "", str(e), -1


def execute_script(script_name: str, device_id: str) -> Dict[str, Any]:
    """Execute script locally on host using existing command execution patterns"""
    try:
        # Get script path
        script_path = get_script_path(script_name)
        
        # Get hostname for venv activation (following existing patterns)
        hostname = os.getenv('HOST_NAME', 'localhost')
        
        # Build command with venv activation using bash explicitly (fixes shell compatibility)
        command = f"bash -c 'source /home/{hostname}/myvenv/bin/activate && python {script_path}'"
        
        # Execute using the same pattern as existing utilities
        success, stdout, stderr, exit_code = execute_command(command, timeout=60)
        
        return {
            'success': success,
            'stdout': stdout,
            'stderr': stderr,
            'exit_code': exit_code,
            'script_name': script_name,
            'device_id': device_id,
            'script_path': script_path
        }
        
    except Exception as e:
        return {
            'success': False,
            'stdout': '',
            'stderr': str(e),
            'exit_code': 1,
            'script_name': script_name,
            'device_id': device_id
        } 


def execute_action_directly(host, device, action: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an action directly using controller-specific abstraction.
    
    Args:
        host: Host instance
        device: Device instance
        action: Action dictionary with 'command' and 'params'
        
    Returns:
        Dictionary with success status and execution details
    """
    try:
        command = action.get('command')
        params = action.get('params', {})
        
        print(f"[@script_utils:execute_action_directly] Executing {command} with params: {params}")
        
        # Get the remote controller for this device
        remote_controller = get_controller(device.device_id, 'remote')
        if not remote_controller:
            return {
                'success': False,
                'error': f'No remote controller found for device {device.device_id}'
            }
        
        # Use controller-specific abstraction - controller handles wait_time internally
        success = remote_controller.execute_command(command, params)
        
        return {
            'success': success,
            'message': f'{"Successfully executed" if success else "Failed to execute"} {command}'
        }
            
    except Exception as e:
        return {'success': False, 'error': f'Action execution error: {str(e)}'}


def execute_verification_directly(host, device, verification: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a verification directly using controller-specific abstraction.
    
    Args:
        host: Host instance
        device: Device instance
        verification: Verification dictionary with 'verification_type' and other params
        
    Returns:
        Dictionary with success status and verification results
    """
    try:
        verification_type = verification.get('verification_type', 'adb')
        
        print(f"[@script_utils:execute_verification_directly] Executing {verification_type} verification")
        
        # Get the verification controller for this device
        verification_controller = get_controller(device.device_id, f'verification_{verification_type}')
        if not verification_controller:
            return {
                'success': False,
                'error': f'No {verification_type} verification controller found for device {device.device_id}'
            }
        
        # Use controller-specific abstraction - single line!
        result = verification_controller.execute_verification(verification)
        
        return {
            'success': result.get('success', False),
            'message': result.get('message', 'Verification completed'),
            'verification_type': verification_type,
            'resultType': 'PASS' if result.get('success') else 'FAIL'
        }
            
    except Exception as e:
        return {'success': False, 'error': f'Verification execution error: {str(e)}'}


def execute_navigation_step_directly(host, device, transition: Dict[str, Any], team_id: str) -> Dict[str, Any]:
    """
    Execute a single navigation step directly using host controllers.
    
    Args:
        host: Host instance
        device: Device instance
        transition: Navigation transition with actions and verifications
        team_id: Team ID for database recording
        
    Returns:
        Dictionary with execution results
    """
    try:
        actions = transition.get('actions', [])
        retry_actions = transition.get('retryActions', [])
        final_wait_time = transition.get('wait_final_time', 0)
        
        # Ensure final_wait_time is an integer (handle string inputs)
        try:
            final_wait_time = int(final_wait_time) if final_wait_time else 0
        except (ValueError, TypeError):
            final_wait_time = 0
        
        print(f"[@script_utils:execute_navigation_step_directly] Executing transition with {len(actions)} actions")
        
        # Get the remote controller for this device
        remote_controller = get_controller(device.device_id, 'remote')
        if not remote_controller:
            return {
                'success': False,
                'error': f'No remote controller found for device {device.device_id}'
            }
        
        # Use controller execute_sequence with retry actions
        success = remote_controller.execute_sequence(actions, retry_actions, final_wait_time)
        
        return {
            'success': success,
            'message': 'Navigation step completed successfully' if success else 'Navigation step failed'
        }
        
    except Exception as e:
        return {'success': False, 'error': f'Navigation step execution error: {str(e)}'} 