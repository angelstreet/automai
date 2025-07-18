"""
Bash Utilities for SSH-based command execution on host machines.

This module provides utilities for executing bash commands on remote hosts via SSH,
similar to how adb_utils.py provides utilities for Android device interaction.
"""

import subprocess
import time
import json
import os
import tempfile
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class BashResult:
    """Result of a bash command execution."""
    success: bool
    output: str
    error: str
    exit_code: int
    execution_time: float


class BashUtils:
    """Utilities for SSH-based bash command execution on host machines."""
    
    def __init__(self):
        """Initialize bash utilities."""
        self.ssh_options = [
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            '-o', 'ConnectTimeout=10',
            '-o', 'ServerAliveInterval=60',
            '-o', 'ServerAliveCountMax=3'
        ]
        
    def test_connection(self, host_ip: str, host_port: int = 22, host_user: str = "root") -> bool:
        """
        Test SSH connection to host machine.
        
        Args:
            host_ip: Host IP address
            host_port: SSH port (default: 22)
            host_user: SSH username (default: root)
            
        Returns:
            bool: True if connection successful
        """
        try:
            # Simple SSH test command
            cmd = [
                'ssh',
                *self.ssh_options,
                '-p', str(host_port),
                f'{host_user}@{host_ip}',
                'echo "SSH connection test"'
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=15
            )
            
            return result.returncode == 0
            
        except Exception as e:
            print(f"[@utils:BashUtils:test_connection] SSH connection test failed: {e}")
            return False
    
    def execute_command(self, host_ip: str, host_port: int, host_user: str, 
                       command: str, working_dir: str = None, timeout: int = 30) -> Dict[str, Any]:
        """
        Execute a bash command on the host machine via SSH.
        
        Args:
            host_ip: Host IP address
            host_port: SSH port
            host_user: SSH username
            command: Bash command to execute
            working_dir: Working directory for command execution
            timeout: Command timeout in seconds
            
        Returns:
            Dict with success, output, error, exit_code, and execution_time
        """
        start_time = time.time()
        
        try:
            # Build SSH command
            ssh_cmd = [
                'ssh',
                *self.ssh_options,
                '-p', str(host_port),
                f'{host_user}@{host_ip}'
            ]
            
            # Add working directory change if specified
            if working_dir:
                full_command = f'cd "{working_dir}" && {command}'
            else:
                full_command = command
            
            ssh_cmd.append(full_command)
            
            print(f"[@utils:BashUtils:execute_command] Executing: {' '.join(ssh_cmd)}")
            
            # Execute command
            result = subprocess.run(
                ssh_cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            execution_time = time.time() - start_time
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'exit_code': result.returncode,
                'execution_time': execution_time
            }
            
        except subprocess.TimeoutExpired:
            execution_time = time.time() - start_time
            return {
                'success': False,
                'output': '',
                'error': f'Command timed out after {timeout} seconds',
                'exit_code': -1,
                'execution_time': execution_time
            }
        except Exception as e:
            execution_time = time.time() - start_time
            return {
                'success': False,
                'output': '',
                'error': f'Command execution error: {str(e)}',
                'exit_code': -1,
                'execution_time': execution_time
            }
    
    def get_file_content(self, host_ip: str, host_port: int, host_user: str, file_path: str) -> Dict[str, Any]:
        """
        Get content of a file on the host machine.
        
        Args:
            host_ip: Host IP address
            host_port: SSH port
            host_user: SSH username
            file_path: Path to the file
            
        Returns:
            Dict with success, content, and error
        """
        try:
            # Use cat command to read file content
            result = self.execute_command(
                host_ip, host_port, host_user,
                f'cat "{file_path}"',
                timeout=60
            )
            
            if result['success']:
                return {
                    'success': True,
                    'content': result['output'],
                    'error': ''
                }
            else:
                return {
                    'success': False,
                    'content': '',
                    'error': result['error']
                }
                
        except Exception as e:
            return {
                'success': False,
                'content': '',
                'error': f'File read error: {str(e)}'
            }
    
    def write_file_content(self, host_ip: str, host_port: int, host_user: str, 
                          file_path: str, content: str) -> Dict[str, Any]:
        """
        Write content to a file on the host machine.
        
        Args:
            host_ip: Host IP address
            host_port: SSH port
            host_user: SSH username
            file_path: Path to the file
            content: Content to write
            
        Returns:
            Dict with success and error
        """
        try:
            # Create temporary file with content
            with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp_file:
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            try:
                # Use scp to copy file to host
                scp_cmd = [
                    'scp',
                    *self.ssh_options,
                    '-P', str(host_port),
                    temp_file_path,
                    f'{host_user}@{host_ip}:{file_path}'
                ]
                
                result = subprocess.run(
                    scp_cmd,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode == 0:
                    return {
                        'success': True,
                        'error': ''
                    }
                else:
                    return {
                        'success': False,
                        'error': result.stderr
                    }
                    
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            return {
                'success': False,
                'error': f'File write error: {str(e)}'
            }
    
    def get_system_info(self, host_ip: str, host_port: int, host_user: str) -> Dict[str, Any]:
        """
        Get system information from the host machine.
        
        Args:
            host_ip: Host IP address
            host_port: SSH port
            host_user: SSH username
            
        Returns:
            Dict with system information
        """
        try:
            # Get OS information
            os_result = self.execute_command(
                host_ip, host_port, host_user,
                'uname -a',
                timeout=10
            )
            
            # Get distribution information (if available)
            distro_result = self.execute_command(
                host_ip, host_port, host_user,
                'cat /etc/os-release 2>/dev/null || echo "Unknown distribution"',
                timeout=10
            )
            
            # Get uptime
            uptime_result = self.execute_command(
                host_ip, host_port, host_user,
                'uptime',
                timeout=10
            )
            
            # Parse system information
            system_info = {
                'os_name': 'Unknown',
                'os_version': 'Unknown',
                'architecture': 'Unknown',
                'uptime': 'Unknown',
                'distribution': 'Unknown'
            }
            
            if os_result['success']:
                os_parts = os_result['output'].strip().split()
                if len(os_parts) >= 3:
                    system_info['os_name'] = os_parts[0]
                    system_info['os_version'] = os_parts[2]
                    if len(os_parts) >= 12:
                        system_info['architecture'] = os_parts[-1]
            
            if distro_result['success'] and 'Unknown distribution' not in distro_result['output']:
                # Parse /etc/os-release
                for line in distro_result['output'].split('\n'):
                    if line.startswith('PRETTY_NAME='):
                        system_info['distribution'] = line.split('=', 1)[1].strip('"')
                        break
            
            if uptime_result['success']:
                system_info['uptime'] = uptime_result['output'].strip()
            
            return system_info
            
        except Exception as e:
            print(f"[@utils:BashUtils:get_system_info] Error getting system info: {e}")
            return {
                'os_name': 'Unknown',
                'os_version': 'Unknown',
                'architecture': 'Unknown',
                'uptime': 'Unknown',
                'distribution': 'Unknown'
            }
    
    def check_file_exists(self, host_ip: str, host_port: int, host_user: str, file_path: str) -> bool:
        """
        Check if a file exists on the host machine.
        
        Args:
            host_ip: Host IP address
            host_port: SSH port
            host_user: SSH username
            file_path: Path to check
            
        Returns:
            bool: True if file exists
        """
        try:
            result = self.execute_command(
                host_ip, host_port, host_user,
                f'test -f "{file_path}" && echo "exists" || echo "not found"',
                timeout=10
            )
            
            return result['success'] and 'exists' in result['output']
            
        except Exception as e:
            print(f"[@utils:BashUtils:check_file_exists] Error checking file: {e}")
            return False
    
    def list_directory(self, host_ip: str, host_port: int, host_user: str, 
                      directory_path: str = ".", detailed: bool = False) -> Dict[str, Any]:
        """
        List contents of a directory on the host machine.
        
        Args:
            host_ip: Host IP address
            host_port: SSH port
            host_user: SSH username
            directory_path: Directory to list (default: current directory)
            detailed: Whether to include detailed information (ls -la)
            
        Returns:
            Dict with success, files list, and error
        """
        try:
            # Use ls command
            ls_command = f'ls -la "{directory_path}"' if detailed else f'ls "{directory_path}"'
            
            result = self.execute_command(
                host_ip, host_port, host_user,
                ls_command,
                timeout=30
            )
            
            if result['success']:
                files = result['output'].strip().split('\n') if result['output'].strip() else []
                return {
                    'success': True,
                    'files': files,
                    'error': ''
                }
            else:
                return {
                    'success': False,
                    'files': [],
                    'error': result['error']
                }
                
        except Exception as e:
            return {
                'success': False,
                'files': [],
                'error': f'Directory listing error: {str(e)}'
            }
    
    def get_environment_variables(self, host_ip: str, host_port: int, host_user: str) -> Dict[str, Any]:
        """
        Get environment variables from the host machine.
        
        Args:
            host_ip: Host IP address
            host_port: SSH port
            host_user: SSH username
            
        Returns:
            Dict with success, environment variables, and error
        """
        try:
            result = self.execute_command(
                host_ip, host_port, host_user,
                'env',
                timeout=15
            )
            
            if result['success']:
                env_vars = {}
                for line in result['output'].strip().split('\n'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key] = value
                
                return {
                    'success': True,
                    'environment': env_vars,
                    'error': ''
                }
            else:
                return {
                    'success': False,
                    'environment': {},
                    'error': result['error']
                }
                
        except Exception as e:
            return {
                'success': False,
                'environment': {},
                'error': f'Environment variables error: {str(e)}'
            } 