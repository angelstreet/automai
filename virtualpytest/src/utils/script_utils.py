"""
Script execution utilities following existing patterns from adb_utils and appium_utils
"""
import os
import sys
import subprocess
import uuid
import time  # Add missing time import
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
        userinterface_name: trface (e.g., 'horizon_android_mobile')
        script_name: Name of the script for logging
        
    Returns:
        Dictionary with success status and tree data or error
    """
    try:
        team_id = "7fdeb4bb-3639-4ec3-959f-b54769a219ce"
        
        from src.lib.supabase.userinterface_db import get_all_userinterfaces
        
        userinterfaces = get_all_userinterfaces(team_id)
        if not userinterfaces:
            return {'success': False, 'error': "No userinterfaces found"}
        
        userinterface = next((ui for ui in userinterfaces if ui['name'] == userinterface_name), None)
        if not userinterface:
            return {'success': False, 'error': f"User interface '{userinterface_name}' not found"}
        
        userinterface_id = userinterface['id']
        
        from src.lib.supabase.navigation_trees_db import get_navigation_trees
        
        success, message, trees = get_navigation_trees(team_id, userinterface_id)
        
        if not success or not trees:
            return {'success': False, 'error': f"Failed to load tree: {message}"}
        
        tree = trees[0]
        tree_id = tree['id']
        tree_metadata = tree.get('metadata', {})
        nodes = tree_metadata.get('nodes', [])
        edges = tree_metadata.get('edges', [])
        
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
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '..', 'web', '.env.host')
    
    if os.path.exists(env_path):
        load_environment_variables(mode='host', calling_script_dir=os.path.dirname(env_path))
    
    try:
        host = get_host_instance()
        
        if host.get_device_count() == 0:
            return {'success': False, 'error': 'No devices configured'}
        
    except Exception as e:
        return {'success': False, 'error': f'Failed to create host: {e}'}
    
    team_id = "7fdeb4bb-3639-4ec3-959f-b54769a219ce"
    
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
        selected_device = next((d for d in host.get_devices() if d.device_id == device_id), None)
        if not selected_device:
            available_devices = [d.device_id for d in host.get_devices()]
            return {'success': False, 'error': f"Device {device_id} not found. Available: {available_devices}"}
    else:
        devices = host.get_devices()
        if not devices:
            return {'success': False, 'error': "No devices available"}
        selected_device = devices[0]
    
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
    device_key = f"{host.host_name}:{device.device_id}"
    
    if is_device_locked(device_key):
        return {'success': False, 'error': f"Device {device.device_id} is locked by another process"}
    
    session_id = str(uuid.uuid4())
    
    if not lock_device(device_key, session_id):
        return {'success': False, 'error': f"Failed to take control of device {device.device_id}"}
    
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
    try:
        unlock_device(device_key, session_id)
        return True
    except Exception:
        return False


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
        
        remote_controller = get_controller(device.device_id, 'remote')
        if not remote_controller:
            return {
                'success': False,
                'error': f'No remote controller found for device {device.device_id}'
            }
        
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
        
        verification_controller = get_controller(device.device_id, f'verification_{verification_type}')
        if not verification_controller:
            return {
                'success': False,
                'error': f'No {verification_type} verification controller found for device {device.device_id}'
            }
        
        result = verification_controller.execute_verification(verification)
        
        return {
            'success': result.get('success', False),
            'message': result.get('message', 'Verification completed'),
            'verification_type': verification_type,
            'resultType': 'PASS' if result.get('success') else 'FAIL'
        }
            
    except Exception as e:
        import traceback
        print(f"[@script_utils:execute_verification_directly] ERROR: {str(e)}")
        print(f"[@script_utils:execute_verification_directly] TRACEBACK: {traceback.format_exc()}")
        return {'success': False, 'error': f'Verification execution error: {str(e)}'}


def execute_navigation_with_verifications(host, device, transition: Dict[str, Any], team_id: str, tree_id: str = None, script_result_id: str = None, script_context: str = 'script') -> Dict[str, Any]:
    """
    Execute a single navigation step with verifications following NavigationExecutor pattern.
    
    This function mimics the NavigationExecutor.execute_navigation() behavior:
    1. Execute navigation actions using ActionExecutor pattern
    2. Execute target node verifications using VerificationExecutor pattern
    3. Record execution results to database (same as server-side NavigationExecutor)
    
    Args:
        host: Host instance
        device: Device instance
        transition: Navigation transition with actions and verifications
        team_id: Team ID for database recording
        tree_id: Tree ID for database recording (should be UUID)
        
    Returns:
        Dictionary with execution results including verification results
    """
    try:
        start_time = time.time()
        
        actions = transition.get('actions', [])
        retry_actions = transition.get('retryActions', [])
        
        remote_controller = get_controller(device.device_id, 'remote')
        if not remote_controller:
            return {
                'success': False,
                'error': f'No remote controller found for device {device.device_id}',
                'verification_results': []
            }
        
        action_start_time = time.time()
        actions_success = remote_controller.execute_sequence(actions, retry_actions)
        action_execution_time = int((time.time() - action_start_time) * 1000)
        
        if tree_id and actions:
            try:
                from src.lib.supabase.execution_results_db import record_edge_execution
                edge_id = transition.get('edge_id', 'unknown')
                record_edge_execution(
                    team_id=team_id,
                    tree_id=tree_id,
                    edge_id=edge_id,
                    host_name=host.host_name,
                    device_model=device.device_model,
                    success=actions_success,
                    execution_time_ms=action_execution_time,
                    message='Navigation actions completed' if actions_success else 'Navigation actions failed',
                    error_details={'error': 'Action execution failed'} if not actions_success else None,
                    script_result_id=script_result_id,
                    script_context=script_context
                )
            except Exception:
                pass  # Silent fail as per optimization
        
        if not actions_success:
            return {
                'success': False,
                'error': 'Navigation actions failed',
                'message': 'Navigation step failed during action execution',
                'verification_results': []
            }
        
        verifications = transition.get('verifications', [])
        verification_results = []
        
        for i, verification in enumerate(verifications):
            verification_start_time = time.time()
            verify_result = execute_verification_directly(host, device, verification)
            verification_execution_time = int((time.time() - verification_start_time) * 1000)
            
            if tree_id:
                try:
                    from src.lib.supabase.execution_results_db import record_node_execution
                    node_id = transition.get('to_node_id', 'unknown')
                    record_node_execution(
                        team_id=team_id,
                        tree_id=tree_id,
                        node_id=node_id,
                        host_name=host.host_name,
                        device_model=device.device_model,
                        success=verify_result.get('success', False),
                        execution_time_ms=verification_execution_time,
                        message=verify_result.get('message', 'Verification completed'),
                        error_details={'error': verify_result.get('error')} if verify_result.get('error') else None,
                        script_result_id=script_result_id,
                        script_context=script_context
                    )
                except Exception:
                    pass
            
            verification_result = {
                'verification_number': i + 1,
                'verification_type': verification.get('verification_type', 'adb'),
                'success': verify_result.get('success', False),
                'message': verify_result.get('message', 'Verification completed'),
                'resultType': 'PASS' if verify_result.get('success') else 'FAIL',
                'error': verify_result.get('error') if not verify_result.get('success') else None
            }
            verification_results.append(verification_result)
            
            if not verify_result['success']:
                return {
                    'success': False,
                    'error': f'Verification {i+1} failed: {verify_result.get("error", "Unknown error")}',
                    'message': 'Navigation step failed during verification',
                    'verification_results': verification_results
                }
        
        execution_time = time.time() - start_time
        
        return {
            'success': True,
            'message': 'Navigation step with verifications completed successfully',
            'verification_results': verification_results,
            'verifications_executed': len(verifications),
            'execution_time': execution_time
        }
        
    except Exception as e:
        import traceback
        print(f"[@script_utils:execute_navigation_with_verifications] ERROR: {str(e)}")
        print(f"[@script_utils:execute_navigation_with_verifications] TRACEBACK: {traceback.format_exc()}")
        return {
            'success': False, 
            'error': f'Navigation step with verifications execution error: {str(e)}',
            'verification_results': []
        }

def capture_validation_screenshot(host, device: Any, step_name: str, script_name: str = "validation") -> str:
    """
    Capture screenshot for validation reporting using AV controller directly.
    No HTTP requests needed - uses controller abstraction.
    
    Args:
        host: Host instance (not dict)
        device: Device object
        step_name: Name of the step (e.g., "initial_state", "step_1", "final_state")
        script_name: Name of the script for logging
        
    Returns:
        Local path to captured screenshot or empty string if failed
    """
    try:
        av_controller = get_controller(device.device_id, 'av')
        
        screenshot_path = av_controller.take_screenshot()
        
        
        return screenshot_path
            
    except Exception:
        return "" 

# Script folder configuration - single source of truth
def get_scripts_directory() -> str:
    """Get the scripts directory path - single source of truth"""
    current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/utils
    src_dir = os.path.dirname(current_dir)  # /src
    project_root = os.path.dirname(src_dir)  # /virtualpytest
    
    # Use test-scripts folder as the primary scripts location
    return os.path.join(project_root, 'test-scripts')

def get_script_path(script_name: str) -> str:
    """Get full path to a script file"""
    scripts_dir = get_scripts_directory()
    script_path = os.path.join(scripts_dir, f'{script_name}.py')
    
    if not os.path.exists(script_path):
        raise ValueError(f'Script not found: {script_path}')
    
    return script_path

def list_available_scripts() -> list:
    """List all available Python scripts in the scripts directory"""
    import glob
    
    scripts_dir = get_scripts_directory()
    
    if not os.path.exists(scripts_dir):
        return []
    
    # Find all Python files in the scripts directory
    script_pattern = os.path.join(scripts_dir, '*.py')
    script_files = glob.glob(script_pattern)
    
    # Extract just the filenames without path and extension
    available_scripts = []
    for script_file in script_files:
        filename = os.path.basename(script_file)
        script_name = os.path.splitext(filename)[0]  # Remove .py extension
        available_scripts.append(script_name)
    
    # Sort alphabetically
    available_scripts.sort()
    
    return available_scripts

# Add back simplified execute_command
def execute_command(command: str, timeout: int = 30) -> Tuple[bool, str, str, int]:
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

# Enhanced execute_script with report generation using shared report_utils function
def execute_script(script_name: str, device_id: str, parameters: str = "") -> Dict[str, Any]:
    start_time = time.time()
    
    try:
        script_path = get_script_path(script_name)
        
        hostname = os.getenv('HOST_NAME', 'localhost')
        
        # Build command with parameters
        base_command = f"bash -c 'source /home/{hostname}/myvenv/bin/activate && python {script_path}"
        
        if parameters and parameters.strip():
            # Add parameters to the command
            command = f"{base_command} {parameters.strip()}'"
        else:
            command = f"{base_command}'"
        
        success, stdout, stderr, exit_code = execute_command(command, timeout=300)  # Increased timeout
        
        total_execution_time = int((time.time() - start_time) * 1000)
        
        # Generate and upload report using shared function
        report_url = ""
        try:
            # Get device and host info
            device_info = get_device_info_for_report(device_id)
            host_info = get_host_info_for_report()
            
            # Use shared report generation function (same as validation.py)
            from .report_utils import generate_and_upload_script_report
            
            report_url = generate_and_upload_script_report(
                script_name=f'{script_name}.py',
                device_info=device_info,
                host_info=host_info,
                execution_time=total_execution_time,
                success=success,
                step_results=None,  # Simple script execution, no steps
                screenshot_paths=None,  # No screenshots for simple scripts
                error_message=stderr if not success else "",
                userinterface_name="",
                stdout=stdout,
                stderr=stderr,
                exit_code=exit_code,
                parameters=parameters
            )
            
        except Exception as e:
            print(f"[@utils:script_utils:execute_script] Report generation error: {str(e)}")
        
        return {
            'success': success,
            'stdout': stdout,
            'stderr': stderr,
            'exit_code': exit_code,
            'script_name': script_name,
            'device_id': device_id,
            'script_path': script_path,
            'parameters': parameters,
            'execution_time_ms': total_execution_time,
            'report_url': report_url  # Add report URL to response
        }
        
    except Exception as e:
        total_execution_time = int((time.time() - start_time) * 1000)
        
        return {
            'success': False,
            'stdout': '',
            'stderr': str(e),
            'exit_code': 1,
            'script_name': script_name,
            'device_id': device_id,
            'parameters': parameters,
            'execution_time_ms': total_execution_time,
            'report_url': ""
        }

def get_device_info_for_report(device_id: str) -> Dict[str, Any]:
    """Get device information for report generation"""
    try:
        from .host_utils import get_device_by_id
        device = get_device_by_id(device_id)
        
        if device:
            return {
                'device_name': device.device_name,
                'device_model': device.device_model,
                'device_id': device.device_id
            }
        else:
            return {
                'device_name': f'Device {device_id}',
                'device_model': 'Unknown Model',
                'device_id': device_id
            }
    except Exception:
        return {
            'device_name': f'Device {device_id}',
            'device_model': 'Unknown Model', 
            'device_id': device_id
        }

def get_host_info_for_report() -> Dict[str, Any]:
    """Get host information for report generation"""
    try:
        from .host_utils import get_host_instance
        host = get_host_instance()
        
        if host:
            return {
                'host_name': host.host_name
            }
        else:
            hostname = os.getenv('HOST_NAME', 'localhost')
            return {
                'host_name': hostname
            }
    except Exception:
        hostname = os.getenv('HOST_NAME', 'localhost')
        return {
            'host_name': hostname
        }