"""
Script execution utilities following existing patterns from adb_utils and appium_utils
"""
import os
import subprocess
from typing import Tuple, Dict, Any


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
        print(f"[@utils:script_utils:execute_command] Executing: {command}")
        
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
        
        if success:
            print(f"[@utils:script_utils:execute_command] Command successful")
        else:
            print(f"[@utils:script_utils:execute_command] Command failed with exit code {exit_code}: {stderr}")
        
        return success, stdout, stderr, exit_code
        
    except subprocess.TimeoutExpired:
        print(f"[@utils:script_utils:execute_command] Command timed out: {command}")
        return False, "", "Command timed out", -1
    except Exception as e:
        print(f"[@utils:script_utils:execute_command] Command error: {str(e)}")
        return False, "", str(e), -1


def execute_script(script_name: str, device_id: str) -> Dict[str, Any]:
    """Execute script locally on host using existing command execution patterns"""
    try:
        # Get script path
        script_path = get_script_path(script_name)
        
        print(f"[@utils:script_utils:execute_script] Executing script: {script_name} for device: {device_id}")
        print(f"[@utils:script_utils:execute_script] Script path: {script_path}")
        
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
        print(f"[@utils:script_utils:execute_script] Script execution error: {str(e)}")
        return {
            'success': False,
            'stdout': '',
            'stderr': str(e),
            'exit_code': 1,
            'script_name': script_name,
            'device_id': device_id
        } 