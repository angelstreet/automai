"""
Bash Desktop Controller Implementation

This controller provides bash command execution functionality on the host machine.
Key difference from mobile controllers: executes bash commands directly on the host via SSH.
Based on the AndroidMobileRemoteController pattern but for desktop automation.
"""

from typing import Dict, Any, List, Optional
import subprocess
import time
import json
import os
from pathlib import Path
from ..base_controller import DesktopControllerInterface

# Use absolute import to avoid conflicts with local utils directory
import sys
src_utils_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'utils')
if src_utils_path not in sys.path:
    sys.path.insert(0, src_utils_path)

from src.utils.bash_utils import BashUtils


class BashDesktopController(DesktopControllerInterface):
    """Bash desktop controller for executing bash commands on the host machine."""
    
    def __init__(self, host_ip: str, host_port: int = 22, host_user: str = "root", **kwargs):
        """
        Initialize the Bash desktop controller.
        
        Args:
            host_ip: Host machine IP address (required)
            host_port: SSH port (default: 22)
            host_user: SSH username (default: root)
        """
        super().__init__("Bash Desktop", "bash")
        
        # Host connection parameters
        self.host_ip = host_ip
        self.host_port = host_port
        self.host_user = host_user
        
        # Validate required parameters
        if not self.host_ip:
            raise ValueError("host_ip is required for BashDesktopController")
            
        self.host_connection_id = f"{self.host_user}@{self.host_ip}:{self.host_port}"
        self.bash_utils = None
        
        # Command execution state
        self.last_command_output = ""
        self.last_command_error = ""
        self.last_exit_code = 0
        
        print(f"[@controller:BashDesktop] Initialized for {self.host_connection_id}")
        self.connect()
    
    def connect(self) -> bool:
        """Connect to host machine via SSH."""
        try:
            print(f"Desktop[{self.desktop_type.upper()}]: Connecting to host {self.host_connection_id}")
            
            # Initialize Bash utilities with SSH connection
            self.bash_utils = BashUtils()
            
            # Test SSH connection to host
            if not self.bash_utils.test_connection(self.host_ip, self.host_port, self.host_user):
                print(f"Desktop[{self.desktop_type.upper()}]: Failed to connect to host {self.host_connection_id}")
                self.disconnect()
                return False
                
            print(f"Desktop[{self.desktop_type.upper()}]: Successfully connected to host {self.host_connection_id}")
            
            # Get host system information
            system_info = self.bash_utils.get_system_info(self.host_ip, self.host_port, self.host_user)
            if system_info:
                print(f"Desktop[{self.desktop_type.upper()}]: Host system: {system_info.get('os_name', 'Unknown')} {system_info.get('os_version', '')}")
            
            self.is_connected = True
            return True
            
        except Exception as e:
            print(f"Desktop[{self.desktop_type.upper()}]: Connection error: {e}")
            self.disconnect()
            return False
            
    def disconnect(self) -> bool:
        """Disconnect from host machine."""
        try:
            print(f"Desktop[{self.desktop_type.upper()}]: Disconnecting from {self.device_name}")
            
            # Clean up SSH connection
            self.bash_utils = None
            self.is_connected = False
            
            print(f"Desktop[{self.desktop_type.upper()}]: Disconnected successfully")
            return True
            
        except Exception as e:
            print(f"Desktop[{self.desktop_type.upper()}]: Disconnect error: {e}")
            self.is_connected = False
            return False
            
    def execute_bash_command(self, command: str, working_dir: str = None, timeout: int = 30) -> Dict[str, Any]:
        """
        Execute a bash command on the host machine.
        
        Args:
            command: Bash command to execute
            working_dir: Working directory for command execution
            timeout: Command timeout in seconds (default: 30)
            
        Returns:
            Dict with success, output, error, exit_code, and execution_time
        """
        if not self.is_connected or not self.bash_utils:
            print(f"Desktop[{self.desktop_type.upper()}]: ERROR - Not connected to host")
            return {
                'success': False,
                'output': '',
                'error': 'Not connected to host',
                'exit_code': -1,
                'execution_time': 0
            }
            
        try:
            print(f"Desktop[{self.desktop_type.upper()}]: Executing bash command: '{command}'")
            
            result = self.bash_utils.execute_command(
                self.host_ip, 
                self.host_port, 
                self.host_user,
                command,
                working_dir=working_dir,
                timeout=timeout
            )
            
            # Store last command results
            self.last_command_output = result.get('output', '')
            self.last_command_error = result.get('error', '')
            self.last_exit_code = result.get('exit_code', 0)
            
            success = result.get('success', False)
            if success:
                print(f"Desktop[{self.desktop_type.upper()}]: Command executed successfully (exit code: {self.last_exit_code})")
                if self.last_command_output:
                    print(f"Desktop[{self.desktop_type.upper()}]: Output: {self.last_command_output[:200]}...")
            else:
                print(f"Desktop[{self.desktop_type.upper()}]: Command failed (exit code: {self.last_exit_code})")
                if self.last_command_error:
                    print(f"Desktop[{self.desktop_type.upper()}]: Error: {self.last_command_error[:200]}...")
                
            return result
            
        except Exception as e:
            error_msg = f"Bash command execution error: {e}"
            print(f"Desktop[{self.desktop_type.upper()}]: {error_msg}")
            return {
                'success': False,
                'output': '',
                'error': error_msg,
                'exit_code': -1,
                'execution_time': 0
            }
            
    def execute_script(self, script_path: str, args: List[str] = None, working_dir: str = None) -> Dict[str, Any]:
        """
        Execute a bash script on the host machine.
        
        Args:
            script_path: Path to the bash script
            args: Script arguments (optional)
            working_dir: Working directory for script execution
            
        Returns:
            Dict with success, output, error, exit_code, and execution_time
        """
        if not self.is_connected or not self.bash_utils:
            print(f"Desktop[{self.desktop_type.upper()}]: ERROR - Not connected to host")
            return {
                'success': False,
                'output': '',
                'error': 'Not connected to host',
                'exit_code': -1,
                'execution_time': 0
            }
            
        try:
            print(f"Desktop[{self.desktop_type.upper()}]: Executing bash script: '{script_path}'")
            
            # Build command with arguments
            command = f"bash {script_path}"
            if args:
                command += " " + " ".join(args)
            
            return self.execute_bash_command(command, working_dir=working_dir)
            
        except Exception as e:
            error_msg = f"Bash script execution error: {e}"
            print(f"Desktop[{self.desktop_type.upper()}]: {error_msg}")
            return {
                'success': False,
                'output': '',
                'error': error_msg,
                'exit_code': -1,
                'execution_time': 0
            }
            
    def get_file_content(self, file_path: str) -> Dict[str, Any]:
        """
        Get content of a file on the host machine.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Dict with success, content, and error
        """
        if not self.is_connected or not self.bash_utils:
            return {
                'success': False,
                'content': '',
                'error': 'Not connected to host'
            }
            
        try:
            print(f"Desktop[{self.desktop_type.upper()}]: Reading file: '{file_path}'")
            
            result = self.bash_utils.get_file_content(
                self.host_ip, 
                self.host_port, 
                self.host_user,
                file_path
            )
            
            if result.get('success'):
                print(f"Desktop[{self.desktop_type.upper()}]: File read successfully ({len(result.get('content', ''))} bytes)")
            else:
                print(f"Desktop[{self.desktop_type.upper()}]: Failed to read file: {result.get('error', 'Unknown error')}")
                
            return result
            
        except Exception as e:
            error_msg = f"File read error: {e}"
            print(f"Desktop[{self.desktop_type.upper()}]: {error_msg}")
            return {
                'success': False,
                'content': '',
                'error': error_msg
            }
            
    def write_file_content(self, file_path: str, content: str) -> Dict[str, Any]:
        """
        Write content to a file on the host machine.
        
        Args:
            file_path: Path to the file
            content: Content to write
            
        Returns:
            Dict with success and error
        """
        if not self.is_connected or not self.bash_utils:
            return {
                'success': False,
                'error': 'Not connected to host'
            }
            
        try:
            print(f"Desktop[{self.desktop_type.upper()}]: Writing file: '{file_path}' ({len(content)} bytes)")
            
            result = self.bash_utils.write_file_content(
                self.host_ip, 
                self.host_port, 
                self.host_user,
                file_path,
                content
            )
            
            if result.get('success'):
                print(f"Desktop[{self.desktop_type.upper()}]: File written successfully")
            else:
                print(f"Desktop[{self.desktop_type.upper()}]: Failed to write file: {result.get('error', 'Unknown error')}")
                
            return result
            
        except Exception as e:
            error_msg = f"File write error: {e}"
            print(f"Desktop[{self.desktop_type.upper()}]: {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
        
    def get_status(self) -> Dict[str, Any]:
        """Get controller status by checking SSH connectivity."""
        if not self.host_ip:
            return {'success': False, 'error': 'No host IP provided'}
            
        try:
            # Test SSH connection
            if self.bash_utils and self.bash_utils.test_connection(self.host_ip, self.host_port, self.host_user):
                return {'success': True, 'host': self.host_connection_id}
            else:
                return {'success': False, 'error': f'SSH connection failed to {self.host_connection_id}'}
            
        except Exception as e:
            return {'success': False, 'error': f'Failed to check SSH status: {str(e)}'}
    
    def get_available_actions(self) -> Dict[str, Any]:
        """Get available actions for this bash desktop controller."""
        return {
            'desktop': [
                {
                    'id': 'execute_bash_command',
                    'label': 'Execute Bash Command',
                    'command': 'execute_bash_command',
                    'action_type': 'desktop',
                    'params': {},
                    'description': 'Execute a bash command on the host machine',
                    'requiresInput': True,
                    'inputLabel': 'Bash Command',
                    'inputPlaceholder': 'ls -la'
                },
                {
                    'id': 'execute_script',
                    'label': 'Execute Script',
                    'command': 'execute_script',
                    'action_type': 'desktop',
                    'params': {},
                    'description': 'Execute a bash script on the host machine',
                    'requiresInput': True,
                    'inputLabel': 'Script Path',
                    'inputPlaceholder': '/path/to/script.sh'
                },
                {
                    'id': 'get_file_content',
                    'label': 'Read File',
                    'command': 'get_file_content',
                    'action_type': 'desktop',
                    'params': {},
                    'description': 'Read content of a file on the host machine',
                    'requiresInput': True,
                    'inputLabel': 'File Path',
                    'inputPlaceholder': '/path/to/file.txt'
                },
                {
                    'id': 'write_file_content',
                    'label': 'Write File',
                    'command': 'write_file_content',
                    'action_type': 'desktop',
                    'params': {},
                    'description': 'Write content to a file on the host machine',
                    'requiresInput': True,
                    'inputLabel': 'File Path and Content',
                    'inputPlaceholder': '/path/to/file.txt'
                }
            ]
        }

    def execute_command(self, command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute bash desktop command with proper abstraction.
        
        Args:
            command: Command to execute ('execute_bash_command', 'execute_script', etc.)
            params: Command parameters
            
        Returns:
            Dict: Command execution result
        """
        if params is None:
            params = {}
        
        print(f"Desktop[{self.desktop_type.upper()}]: Executing command '{command}' with params: {params}")
        
        if command == 'execute_bash_command':
            bash_command = params.get('command') or params.get('bash_command')
            working_dir = params.get('working_dir')
            timeout = params.get('timeout', 30)
            
            if not bash_command:
                return {
                    'success': False,
                    'output': '',
                    'error': 'No bash command provided',
                    'exit_code': -1,
                    'execution_time': 0
                }
                
            return self.execute_bash_command(bash_command, working_dir=working_dir, timeout=timeout)
        
        elif command == 'execute_script':
            script_path = params.get('script_path')
            args = params.get('args', [])
            working_dir = params.get('working_dir')
            
            if not script_path:
                return {
                    'success': False,
                    'output': '',
                    'error': 'No script path provided',
                    'exit_code': -1,
                    'execution_time': 0
                }
                
            return self.execute_script(script_path, args=args, working_dir=working_dir)
        
        elif command == 'get_file_content':
            file_path = params.get('file_path')
            
            if not file_path:
                return {
                    'success': False,
                    'content': '',
                    'error': 'No file path provided'
                }
                
            return self.get_file_content(file_path)
        
        elif command == 'write_file_content':
            file_path = params.get('file_path')
            content = params.get('content', '')
            
            if not file_path:
                return {
                    'success': False,
                    'error': 'No file path provided'
                }
                
            return self.write_file_content(file_path, content)
        
        else:
            print(f"Desktop[{self.desktop_type.upper()}]: Unknown command: {command}")
            return {
                'success': False,
                'output': '',
                'error': f'Unknown command: {command}',
                'exit_code': -1,
                'execution_time': 0
            } 