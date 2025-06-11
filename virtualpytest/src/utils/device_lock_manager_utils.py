"""
Device Lock Manager

Manages device locking in the existing connected clients registry.
No separate database or model needed - just adds lock properties to existing registry.
"""

import time
from flask import current_app
from typing import Optional, Dict, Any


def get_connected_clients() -> Dict[str, Any]:
    """Get the connected clients registry from Flask app"""
    if not hasattr(current_app, '_connected_clients'):
        current_app._connected_clients = {}
    return current_app._connected_clients


def lock_device_in_registry(device_id: str, session_id: str) -> bool:
    """
    Lock a device in the connected clients registry
    
    Args:
        device_id: The device ID to lock
        session_id: The session ID taking the lock
        
    Returns:
        bool: True if successfully locked, False if device not found or already locked
    """
    try:
        print(f"[@utils:deviceLockManager:lock_device_in_registry] Attempting to lock device: {device_id}")
        
        connected_clients = get_connected_clients()
        
        # Find the host that owns this device (search by device_id)
        host_name = None
        device_host = None
        for host_key, host_data in connected_clients.items():
            if host_data.get('device_id') == device_id:
                host_name = host_key
                device_host = host_data
                break
        
        if not device_host:
            print(f"[@utils:deviceLockManager:lock_device_in_registry] Device {device_id} not found in registry")
            return False
        
        # Check if device is already locked
        if device_host.get('isLocked', False):
            locked_by = device_host.get('lockedBy', 'unknown')
            print(f"[@utils:deviceLockManager:lock_device_in_registry] Device {device_id} is already locked by: {locked_by}")
            return False
        
        # Lock the device
        device_host['isLocked'] = True
        device_host['lockedBy'] = session_id
        device_host['lockedAt'] = time.time()
        
        print(f"[@utils:deviceLockManager:lock_device_in_registry] Successfully locked device {device_id} for session: {session_id}")
        return True
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:lock_device_in_registry] Error locking device {device_id}: {str(e)}")
        return False


def unlock_device_in_registry(device_id: str, session_id: Optional[str] = None) -> bool:
    """
    Unlock a device in the connected clients registry
    
    Args:
        device_id: The device ID to unlock
        session_id: Optional session ID - if provided, only unlock if locked by this session
        
    Returns:
        bool: True if successfully unlocked, False if device not found or not locked
    """
    try:
        print(f"[@utils:deviceLockManager:unlock_device_in_registry] Attempting to unlock device: {device_id}")
        
        connected_clients = get_connected_clients()
        
        # Find the host that owns this device (search by device_id)
        host_name = None
        device_host = None
        for host_key, host_data in connected_clients.items():
            if host_data.get('device_id') == device_id:
                host_name = host_key
                device_host = host_data
                break
        
        if not device_host:
            print(f"[@utils:deviceLockManager:unlock_device_in_registry] Device {device_id} not found in registry")
            return False
        
        # Check if device is locked
        if not device_host.get('isLocked', False):
            print(f"[@utils:deviceLockManager:unlock_device_in_registry] Device {device_id} is not locked")
            return True  # Already unlocked, consider it success
        
        # If session_id provided, check if this session owns the lock
        if session_id and device_host.get('lockedBy') != session_id:
            locked_by = device_host.get('lockedBy', 'unknown')
            print(f"[@utils:deviceLockManager:unlock_device_in_registry] Device {device_id} locked by {locked_by}, cannot unlock with session {session_id}")
            return False
        
        # Unlock the device
        device_host['isLocked'] = False
        device_host.pop('lockedBy', None)
        device_host.pop('lockedAt', None)
        
        print(f"[@utils:deviceLockManager:unlock_device_in_registry] Successfully unlocked device: {device_id}")
        return True
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:unlock_device_in_registry] Error unlocking device {device_id}: {str(e)}")
        return False


def is_device_locked_in_registry(device_id: str) -> bool:
    """
    Check if a device is locked in the registry
    
    Args:
        device_id: The device ID to check
        
    Returns:
        bool: True if device is locked, False otherwise
    """
    try:
        connected_clients = get_connected_clients()
        
        # Find the host that owns this device (search by device_id)
        for host_key, host_data in connected_clients.items():
            if host_data.get('device_id') == device_id:
                return host_data.get('isLocked', False)
        
        return False
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:is_device_locked_in_registry] Error checking lock status for {device_id}: {str(e)}")
        return False


def get_device_lock_info(device_id: str) -> Optional[Dict[str, Any]]:
    """
    Get lock information for a device
    
    Args:
        device_id: The device ID to check
        
    Returns:
        dict: Lock information or None if device not found/not locked
    """
    try:
        connected_clients = get_connected_clients()
        
        # Find the host that owns this device
        for host_key, host_data in connected_clients.items():
            if host_data.get('device_id') == device_id:
                if not host_data.get('isLocked', False):
                    return None
                
                return {
                    'isLocked': True,
                    'lockedBy': host_data.get('lockedBy'),
                    'lockedAt': host_data.get('lockedAt'),
                    'lockedDuration': time.time() - host_data.get('lockedAt', 0) if host_data.get('lockedAt') else 0
                }
        
        return None
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:get_device_lock_info] Error getting lock info for {device_id}: {str(e)}")
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
        
        connected_clients = get_connected_clients()
        current_time = time.time()
        cleaned_count = 0
        
        for host_name, host_data in connected_clients.items():
            if host_data.get('isLocked', False):
                locked_at = host_data.get('lockedAt', 0)
                if current_time - locked_at > timeout_seconds:
                    device_id = host_data.get('device_id', host_name)
                    print(f"[@utils:deviceLockManager:cleanup_expired_locks] Cleaning up expired lock for device: {device_id}")
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


def force_unlock_device(device_id: str) -> bool:
    """
    Force unlock a device (admin function)
    
    Args:
        device_id: The device ID to force unlock
        
    Returns:
        bool: True if successfully unlocked
    """
    try:
        print(f"[@utils:deviceLockManager:force_unlock_device] Force unlocking device: {device_id}")
        
        connected_clients = get_connected_clients()
        
        # Find the host that owns this device
        for host_key, host_data in connected_clients.items():
            if host_data.get('device_id') == device_id:
                # Force unlock regardless of who locked it
                host_data['isLocked'] = False
                host_data.pop('lockedBy', None)
                host_data.pop('lockedAt', None)
                
                print(f"[@utils:deviceLockManager:force_unlock_device] Successfully force unlocked device: {device_id}")
                return True
        
        print(f"[@utils:deviceLockManager:force_unlock_device] Device {device_id} not found in registry")
        return False
        
    except Exception as e:
        print(f"[@utils:deviceLockManager:force_unlock_device] Error force unlocking device {device_id}: {str(e)}")
        return False


def get_all_locked_devices() -> Dict[str, Dict[str, Any]]:
    """
    Get all currently locked devices
    
    Returns:
        dict: Dictionary of locked devices with their lock info
    """
    try:
        connected_clients = get_connected_clients()
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