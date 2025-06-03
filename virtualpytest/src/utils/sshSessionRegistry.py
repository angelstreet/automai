"""
SSH Session Registry

This module provides a centralized registry for sharing SSH sessions between
remote control and verification systems to avoid multiple connections to the same device.
"""

from typing import Optional
from utils.sshUtils import SSHConnection


class SSHSessionRegistry:
    """Registry to share SSH sessions between remote control and verification"""
    _active_session: Optional[SSHConnection] = None
    _session_info: dict = {}
    
    @classmethod
    def register_session(cls, ssh_connection: SSHConnection, session_info: dict = None):
        """
        Register the active SSH session.
        
        Args:
            ssh_connection: Active SSH connection object
            session_info: Optional info about the session (device_ip, etc.)
        """
        cls._active_session = ssh_connection
        cls._session_info = session_info or {}
        print(f"[@SSHSessionRegistry:register_session] Registered active SSH session")
        if session_info:
            print(f"[@SSHSessionRegistry:register_session] Session info: {session_info}")
    
    @classmethod
    def get_session(cls) -> Optional[SSHConnection]:
        """
        Get the active SSH session.
        
        Returns:
            SSH connection if available, None otherwise
        """
        if cls._active_session:
            print(f"[@SSHSessionRegistry:get_session] Retrieved active SSH session")
        else:
            print(f"[@SSHSessionRegistry:get_session] No active SSH session found")
        return cls._active_session
    
    @classmethod
    def remove_session(cls):
        """Remove the active SSH session when disconnected."""
        if cls._active_session:
            print(f"[@SSHSessionRegistry:remove_session] Removed active SSH session")
            cls._active_session = None
            cls._session_info = {}
        else:
            print(f"[@SSHSessionRegistry:remove_session] No session to remove")
    
    @classmethod
    def get_session_info(cls) -> dict:
        """Get information about the active session."""
        return cls._session_info.copy()
    
    @classmethod
    def is_session_active(cls) -> bool:
        """Check if there's an active session."""
        if cls._active_session and hasattr(cls._active_session, 'is_connected'):
            return cls._active_session.is_connected
        return cls._active_session is not None
    
    @classmethod
    def cleanup_inactive_session(cls):
        """Remove inactive SSH session from registry."""
        if cls._active_session and hasattr(cls._active_session, 'is_connected'):
            if not cls._active_session.is_connected:
                print(f"[@SSHSessionRegistry:cleanup_inactive_session] Cleaning up inactive session")
                cls._active_session = None
                cls._session_info = {} 