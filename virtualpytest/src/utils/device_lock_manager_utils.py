"""
Device Lock Manager

Manages device locking in the existing connected clients registry.
No separate database or model needed - just adds lock properties to existing registry.
"""

import time
from flask import current_app
from typing import Optional, Dict, Any


def get_host_registry() -> Dict[str, Any]:
    """Get the connected clients registry from Flask app"""
    if not hasattr(current_app, '_connected_clients'):
        current_app._connected_clients = {}
    return current_app._connected_clients


def lock_device_in_registry(host_name: str, session_id: str) -> bool:
    """
    Lock a host in the connected clients registry
    
    Args:
        host_name: The host name to lock
        session_id: The session ID taking the lock
        
    Returns:
        bool: True if successfully locked, False if host not found or already locked by different session
    """
    try:
        print(f"[@utils:deviceLockManager:lock_device_in_registry] Attempting to lock host: {host_name}")
        
        connected_clients = get_host_registry()
        
        # Find the host by host_name
        device_host = connected_clients.get(host_name)
        
        if not device_host:
            print(f"[@utils:deviceLockManager:lock_device_in_registry] Host {host_name} not found in registry")
            return False
        
        # Check if device is already locked
        if device_host.get('isLocked', False):
            locked_by = device_host.get('lockedBy', 'unknown')
            
            # Allow same session to reclaim its own lock
            if locked_by == session_id:
                print(f"[@utils:deviceLockManager:lock_device_in_registry] Host {host_name} already locked by same session {session_id} - reclaiming lock")
                # Update the lock timestamp to extend the lock
                device_host['lockedAt'] = time.time()
                return True
            else:
                print(f"[@utils:deviceLockManager:lock_device_in_registry] Host {host_name} is already locked by different session: {locked_by}")
                return False
        
        # Lock the device
        device_host['isLocked'] = True
        device_host['lockedBy'] = session_id
        device_host['lockedAt'] = time.time()
        
        print(f"[@utils:deviceLockManager:lock_device_in_registry] Successfully locked host {host_name} for session: {session_id}")
        return True
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:lock_device_in_registry] Error locking host {host_name}: {str(e)}")
        return False


def unlock_device_in_registry(host_name: str, session_id: Optional[str] = None) -> bool:
    """
    Unlock a host in the connected clients registry
    
    Args:
        host_name: The host name to unlock
        session_id: Optional session ID - if provided, only unlock if locked by this session
        
    Returns:
        bool: True if successfully unlocked, False if host not found or not locked
    """
    try:
        print(f"[@utils:deviceLockManager:unlock_device_in_registry] Attempting to unlock host: {host_name}")
        
        connected_clients = get_host_registry()
        
        # Find the host by host_name
        device_host = connected_clients.get(host_name)
        
        if not device_host:
            print(f"[@utils:deviceLockManager:unlock_device_in_registry] Host {host_name} not found in registry")
            return False
        
        # Check if device is locked
        if not device_host.get('isLocked', False):
            print(f"[@utils:deviceLockManager:unlock_device_in_registry] Host {host_name} is not locked")
            return True  # Already unlocked, consider it success
        
        # If session_id provided, check if this session owns the lock
        if session_id and device_host.get('lockedBy') != session_id:
            locked_by = device_host.get('lockedBy', 'unknown')
            print(f"[@utils:deviceLockManager:unlock_device_in_registry] Host {host_name} locked by {locked_by}, cannot unlock with session {session_id}")
            return False
        
        # Unlock the device
        device_host['isLocked'] = False
        device_host.pop('lockedBy', None)
        device_host.pop('lockedAt', None)
        
        print(f"[@utils:deviceLockManager:unlock_device_in_registry] Successfully unlocked host: {host_name}")
        return True
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:unlock_device_in_registry] Error unlocking host {host_name}: {str(e)}")
        return False


def is_device_locked_in_registry(host_name: str) -> bool:
    """
    Check if a host is locked in the registry
    
    Args:
        host_name: The host name to check
        
    Returns:
        bool: True if host is locked, False otherwise
    """
    try:
        connected_clients = get_host_registry()
        
        # Find the host by host_name
        host_data = connected_clients.get(host_name)
        if host_data:
            return host_data.get('isLocked', False)
        
        return False
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:is_device_locked_in_registry] Error checking lock status for {host_name}: {str(e)}")
        return False


def get_device_lock_info(host_name: str) -> Optional[Dict[str, Any]]:
    """
    Get lock information for a host
    
    Args:
        host_name: The host name to check
        
    Returns:
        dict: Lock information or None if host not found/not locked
    """
    try:
        connected_clients = get_host_registry()
        
        # Find the host by host_name
        host_data = connected_clients.get(host_name)
        if not host_data:
            return None
            
        if not host_data.get('isLocked', False):
            return None
        
        return {
            'isLocked': True,
            'lockedBy': host_data.get('lockedBy'),
            'lockedAt': host_data.get('lockedAt'),
            'lockedDuration': time.time() - host_data.get('lockedAt', 0) if host_data.get('lockedAt') else 0
        }
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:get_device_lock_info] Error getting lock info for {host_name}: {str(e)}")
        return None


def cleanup_expired_locks(timeout_seconds: int = 300) -> int:
    """
    Clean up locks that have expired (older than timeout_seconds)
    
    Args:
        timeout_seconds: Lock timeout in seconds (default: 5 minutes)
        
    Returns:
        int: Number of locks cleaned up
    """
    try:
        print(f"[@utils:deviceLockManager:cleanup_expired_locks] Cleaning up locks older than {timeout_seconds} seconds")
        
        connected_clients = get_host_registry()
        current_time = time.time()
        cleaned_count = 0
        
        for host_name, host_data in connected_clients.items():
            if host_data.get('isLocked', False):
                locked_at = host_data.get('lockedAt', 0)
                if current_time - locked_at > timeout_seconds:
                    print(f"[@utils:deviceLockManager:cleanup_expired_locks] Cleaning up expired lock for host: {host_name}")
                    host_data['isLocked'] = False
                    host_data.pop('lockedBy', None)
                    host_data.pop('lockedAt', None)
                    cleaned_count += 1
        
        if cleaned_count > 0:
            print(f"[@utils:deviceLockManager:cleanup_expired_locks] Cleaned up {cleaned_count} expired locks")
        
        return cleaned_count
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:cleanup_expired_locks] Error during cleanup: {str(e)}")
        return 0


def force_unlock_device(host_name: str) -> bool:
    """
    Force unlock a host (admin function)
    
    Args:
        host_name: The host name to force unlock
        
    Returns:
        bool: True if successfully unlocked
    """
    try:
        print(f"[@utils:deviceLockManager:force_unlock_device] Force unlocking host: {host_name}")
        
        connected_clients = get_host_registry()
        
        # Find the host by host_name
        host_data = connected_clients.get(host_name)
        if not host_data:
            print(f"[@utils:deviceLockManager:force_unlock_device] Host {host_name} not found in registry")
            return False
        
        # Force unlock regardless of who locked it
        host_data['isLocked'] = False
        host_data.pop('lockedBy', None)
        host_data.pop('lockedAt', None)
        
        print(f"[@utils:deviceLockManager:force_unlock_device] Successfully force unlocked host: {host_name}")
        return True
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:force_unlock_device] Error force unlocking host {host_name}: {str(e)}")
        return False


def get_all_locked_devices() -> Dict[str, Dict[str, Any]]:
    """
    Get all currently locked devices
    
    Returns:
        dict: Dictionary of locked devices with their lock info
    """
    try:
        connected_clients = get_host_registry()
        locked_devices = {}
        
        for host_name, host_data in connected_clients.items():
            if host_data.get('isLocked', False):
                device_id = host_data.get('device_id', host_name)
                locked_devices[device_id] = {
                    'lockedBy': host_data.get('lockedBy'),
                    'lockedAt': host_data.get('lockedAt'),
                    'lockedDuration': time.time() - host_data.get('lockedAt', 0) if host_data.get('lockedAt') else 0,
                    'deviceName': host_data.get('name', 'Unknown'),
                    'deviceModel': host_data.get('model', 'Unknown'),
                    'hostName': host_name
                }
        
        return locked_devices
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:get_all_locked_devices] Error getting locked devices: {str(e)}")
        return {} 