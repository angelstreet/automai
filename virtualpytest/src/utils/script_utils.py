"""
Script execution utilities following build_url_utils pattern
"""
import os
import subprocess

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

def execute_script(script_name: str, device_id: str):
    """Execute script locally on host"""
    try:
        # Get script path
        script_path = get_script_path(script_name)
        
        # Get hostname for venv activation
        hostname = os.getenv('HOST_NAME', 'localhost')
        
        # Build command with venv activation
        command = f"source /home/{hostname}/myvenv/bin/activate && python {script_path}"
        
        # Execute
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        return {
            'success': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'exit_code': result.returncode
        }
        
    except Exception as e:
        return {
            'success': False,
            'stdout': '',
            'stderr': str(e),
            'exit_code': 1
        } 