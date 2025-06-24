"""
Device Lock Utilities

Simple and focused device locking system.
Manages device locks for multi-user access control.
"""

import time
import threading
from typing import Dict, Any, Optional

class DeviceLockManager:
    """Simple device locking manager"""
    
    def __init__(self):
        # Thread-safe storage for device locks
        self._locks: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.RLock()
    
    def lock_device(self, host_name: str, session_id: str) -> bool:
        """Lock a device"""
        with self._lock:
            try:
                # Check if already locked
                if host_name in self._locks:
                    locked_by = self._locks[host_name].get('locked_by', 'unknown')
                    
                    # Allow same session to reclaim its own lock
                    if locked_by == session_id:
                        print(f"🔄 [LockManager] Device {host_name} already locked by same session {session_id} - reclaiming lock")
                        self._locks[host_name]['locked_at'] = time.time()
                        return True
                    else:
                        print(f"❌ [LockManager] Device {host_name} already locked by different session: {locked_by}")
                        return False
                
                # Lock the device
                self._locks[host_name] = {
                    'locked_by': session_id,
                    'locked_at': time.time()
                }
                
                print(f"🔒 [LockManager] Successfully locked device {host_name} for session: {session_id}")
                return True
                
            except Exception as e:
                print(f"❌ [LockManager] Error locking device {host_name}: {e}")
                return False
    
    def unlock_device(self, host_name: str, session_id: Optional[str] = None) -> bool:
        """Unlock a device"""
        with self._lock:
            try:
                # Check if device is locked
                if host_name not in self._locks:
                    print(f"ℹ️ [LockManager] Device {host_name} is not locked")
                    return True  # Already unlocked, consider it success
                
                # If session_id provided, check if this session owns the lock
                if session_id and self._locks[host_name].get('locked_by') != session_id:
                    locked_by = self._locks[host_name].get('locked_by', 'unknown')
                    print(f"❌ [LockManager] Device {host_name} locked by {locked_by}, cannot unlock with session {session_id}")
                    return False
                
                # Unlock the device
                del self._locks[host_name]
                
                print(f"🔓 [LockManager] Successfully unlocked device: {host_name}")
                return True
                
            except Exception as e:
                print(f"❌ [LockManager] Error unlocking device {host_name}: {e}")
                return False
    
    def is_device_locked(self, host_name: str) -> bool:
        """Check if a device is locked"""
        with self._lock:
            return host_name in self._locks
    
    def get_device_lock_info(self, host_name: str) -> Optional[Dict[str, Any]]:
        """Get lock information for a device"""
        with self._lock:
            if host_name not in self._locks:
                return None
            
            lock_data = self._locks[host_name]
            return {
                'isLocked': True,
                'lockedBy': lock_data.get('locked_by'),
                'lockedAt': lock_data.get('locked_at'),
                'lockedDuration': time.time() - lock_data.get('locked_at', 0)
            }
    
    def get_all_locked_devices(self) -> Dict[str, Dict[str, Any]]:
        """Get all currently locked devices"""
        with self._lock:
            locked_devices = {}
            
            for host_name, lock_data in self._locks.items():
                locked_devices[host_name] = {
                    'lockedBy': lock_data.get('locked_by'),
                    'lockedAt': lock_data.get('locked_at'),
                    'lockedDuration': time.time() - lock_data.get('locked_at', 0),
                    'hostName': host_name
                }
            
            return locked_devices
    
    def cleanup_expired_locks(self, timeout_seconds: int = 300) -> int:
        """Clean up locks that have expired"""
        with self._lock:
            current_time = time.time()
            expired_hosts = []
            
            for host_name, lock_data in self._locks.items():
                locked_at = lock_data.get('locked_at', 0)
                if current_time - locked_at > timeout_seconds:
                    expired_hosts.append(host_name)
            
            for host_name in expired_hosts:
                print(f"🧹 [LockManager] Cleaning up expired lock for device: {host_name}")
                del self._locks[host_name]
            
            return len(expired_hosts)
    
    def force_unlock_device(self, host_name: str) -> bool:
        """Force unlock a device (admin function)"""
        with self._lock:
            try:
                if host_name in self._locks:
                    del self._locks[host_name]
                    print(f"💪 [LockManager] Force unlocked device: {host_name}")
                    return True
                else:
                    print(f"ℹ️ [LockManager] Device {host_name} was not locked")
                    return True
                
            except Exception as e:
                print(f"❌ [LockManager] Error force unlocking device {host_name}: {e}")
                return False

# Global instance
_device_lock_manager = DeviceLockManager()

def get_device_lock_manager() -> DeviceLockManager:
    """Get the global device lock manager instance"""
    return _device_lock_manager

# Convenience functions
def lock_device(host_name: str, session_id: str) -> bool:
    """Lock a device"""
    return get_device_lock_manager().lock_device(host_name, session_id)

def unlock_device(host_name: str, session_id: Optional[str] = None) -> bool:
    """Unlock a device"""
    return get_device_lock_manager().unlock_device(host_name, session_id)

def is_device_locked(host_name: str) -> bool:
    """Check if a device is locked"""
    return get_device_lock_manager().is_device_locked(host_name)

def get_device_lock_info(host_name: str) -> Optional[Dict[str, Any]]:
    """Get lock information for a device"""
    return get_device_lock_manager().get_device_lock_info(host_name)

def get_all_locked_devices() -> Dict[str, Dict[str, Any]]:
    """Get all currently locked devices"""
    return get_device_lock_manager().get_all_locked_devices()

def cleanup_expired_locks(timeout_seconds: int = 300) -> int:
    """Clean up locks that have expired"""
    return get_device_lock_manager().cleanup_expired_locks(timeout_seconds)

def force_unlock_device(host_name: str) -> bool:
    """Force unlock a device (admin function)"""
    return get_device_lock_manager().force_unlock_device(host_name) 