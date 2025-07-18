"""
Bash Desktop Controller Implementation

This controller provides bash command execution functionality on the host machine.
Simple local command execution only - no SSH, no connection checks.
"""

from typing import Dict, Any, List, Optional
import subprocess
import time
import json
import os
from pathlib import Path
from ..base_controller import DesktopControllerInterface


class BashDesktopController(DesktopControllerInterface):
    """Bash desktop controller for executing bash commands locally on the host machine."""
    
    def __init__(self, **kwargs):
        """Initialize the Bash desktop controller."""
        super().__init__("Bash Desktop", "bash")
        
        # Command execution state
        self.last_command_output = ""
        self.last_command_error = ""
        self.last_exit_code = 0
        
        print(f"[@controller:BashDesktop] Initialized for local execution")
    
    def connect(self) -> bool:
        """Connect to host machine (always true for local execution)."""
        print(f"Desktop[{self.desktop_type.upper()}]: Local execution ready")
        return True
            
    def disconnect(self) -> bool:
        """Disconnect from host machine (always true for local execution)."""
        print(f"Desktop[{self.desktop_type.upper()}]: Local execution disconnected")
        return True
            
    def execute_command(self, command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute bash command directly on local host.
        
        Args:
            command: Command type ('execute_bash_command')
            params: Command parameters containing the actual bash command
            
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
            
            # Execute the bash command directly using subprocess
            start_time = time.time()
            
            try:
                print(f"Desktop[{self.desktop_type.upper()}]: Executing local command: '{bash_command}'")
                
                # Use shell=True to execute bash commands with proper shell interpretation
                process = subprocess.Popen(
                    bash_command,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    cwd=working_dir
                )
                
                # Wait for command completion with timeout
                try:
                    stdout, stderr = process.communicate(timeout=timeout)
                    exit_code = process.returncode
                except subprocess.TimeoutExpired:
                    process.kill()
                    stdout, stderr = process.communicate()
                    exit_code = -1
                    stderr = f"Command timed out after {timeout} seconds\n{stderr}"
                
                execution_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds
                success = exit_code == 0
                
                # Store last command results
                self.last_command_output = stdout or ''
                self.last_command_error = stderr or ''
                self.last_exit_code = exit_code
                
                if success:
                    print(f"Desktop[{self.desktop_type.upper()}]: Command executed successfully (exit code: {exit_code})")
                    if stdout:
                        print(f"Desktop[{self.desktop_type.upper()}]: Output: {stdout[:200]}...")
                else:
                    print(f"Desktop[{self.desktop_type.upper()}]: Command failed (exit code: {exit_code})")
                    if stderr:
                        print(f"Desktop[{self.desktop_type.upper()}]: Error: {stderr[:200]}...")
                
                return {
                    'success': success,
                    'output': stdout or '',
                    'error': stderr or '',
                    'exit_code': exit_code,
                    'execution_time': execution_time
                }
                
            except Exception as e:
                execution_time = int((time.time() - start_time) * 1000)
                error_msg = f"Local command execution error: {e}"
                print(f"Desktop[{self.desktop_type.upper()}]: {error_msg}")
                
                return {
                    'success': False,
                    'output': '',
                    'error': error_msg,
                    'exit_code': -1,
                    'execution_time': execution_time
                }
        
        else:
            print(f"Desktop[{self.desktop_type.upper()}]: Unknown command: {command}")
            return {
                'success': False,
                'output': '',
                'error': f'Unknown command: {command}',
                'exit_code': -1,
                'execution_time': 0
            } 