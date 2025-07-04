"""
Navigation Lock Manager

Simple in-memory lock management for navigation trees.
Only prevents editing conflicts - reading and execution always allowed.
"""

import time
from typing import Optional, Dict, Any

# Simple global lock registry
navigation_locks: Dict[str, Dict[str, Any]] = {}

class NavigationLockManager:
    """
    Navigation Lock Manager class for managing navigation tree locks
    """
    
    def __init__(self):
        """Initialize the lock manager"""
        pass
    
    def acquire_lock(self, tree_name: str, session_id: str) -> bool:
        """
        Acquire a lock on a navigation tree
        
        Args:
            tree_name: The navigation tree name to lock
            session_id: Session ID of the user locking the tree
            
        Returns:
            bool: True if successfully locked, False if already locked
        """
        return lock_navigation_tree(tree_name, session_id)
    
    def release_lock(self, tree_name: str, session_id: str) -> bool:
        """
        Release a lock on a navigation tree
        
        Args:
            tree_name: The navigation tree name to unlock
            session_id: Session ID of the user unlocking the tree
            
        Returns:
            bool: True if successfully unlocked, False if not owned by session
        """
        return unlock_navigation_tree(tree_name, session_id)
    
    def is_locked(self, tree_name: str) -> bool:
        """
        Check if a navigation tree is locked
        
        Args:
            tree_name: The navigation tree name to check
            
        Returns:
            bool: True if tree is locked, False otherwise
        """
        return is_navigation_tree_locked(tree_name)
    
    def get_lock_info(self, tree_name: str) -> Optional[Dict[str, Any]]:
        """
        Get lock information for a navigation tree
        
        Args:
            tree_name: The navigation tree name to check
            
        Returns:
            dict: Lock information with session_id, locked_at, etc. or None if not locked
        """
        lock_info = get_navigation_tree_lock_info(tree_name)
        if lock_info:
            # Rename 'locked_by' to 'session_id' for consistency
            return {
                'session_id': lock_info.get('locked_by'),
                'locked_at': lock_info.get('locked_at'),
                'locked_duration': lock_info.get('locked_duration')
            }
        return None
    
    def cleanup_expired_locks(self, timeout_seconds: int = 1800) -> int:
        """
        Clean up expired locks
        
        Args:
            timeout_seconds: Lock timeout in seconds (default: 30 minutes)
            
        Returns:
            int: Number of locks cleaned up
        """
        return cleanup_expired_navigation_locks(timeout_seconds)
    
    def get_all_locks(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all currently locked navigation trees
        
        Returns:
            dict: Dictionary of locked trees with their lock info
        """
        return get_all_locked_navigation_trees()


def lock_navigation_tree(tree_name: str, session_id: str = "default-session") -> bool:
    """
    Lock a navigation tree for editing
    
    Args:
        tree_name: The navigation tree name to lock
        session_id: Session ID of the user locking the tree
        
    Returns:
        bool: True if successfully locked, False if already locked
    """
    try:
        print(f"[@utils:navigationLockManager:lock_navigation_tree] Attempting to lock tree: {tree_name}")
        
        # Check if already locked
        if tree_name in navigation_locks:
            locked_by = navigation_locks[tree_name].get('locked_by', 'unknown')
            print(f"[@utils:navigationLockManager:lock_navigation_tree] Tree {tree_name} already locked by: {locked_by}")
            return False
        
        # Lock the tree
        navigation_locks[tree_name] = {
            'locked_by': session_id,
            'locked_at': time.time()
        }
        
        print(f"[@utils:navigationLockManager:lock_navigation_tree] Successfully locked tree {tree_name} for session: {session_id}")
        return True
        
    except Exception as e:
        print(f"[@utils:navigationLockManager:lock_navigation_tree] Error locking tree {tree_name}: {str(e)}")
        return False


def unlock_navigation_tree(tree_name: str, session_id: Optional[str] = None) -> bool:
    """
    Unlock a navigation tree
    
    Args:
        tree_name: The navigation tree name to unlock
        session_id: Optional session ID - if provided, only unlock if locked by this session
        
    Returns:
        bool: True if successfully unlocked, False if tree not found or not locked by session
    """
    try:
        print(f"[@utils:navigationLockManager:unlock_navigation_tree] Attempting to unlock tree: {tree_name}")
        
        # Check if tree is locked
        if tree_name not in navigation_locks:
            print(f"[@utils:navigationLockManager:unlock_navigation_tree] Tree {tree_name} is not locked")
            return True  # Already unlocked, consider it success
        
        # If session_id provided, check if this session owns the lock
        if session_id and navigation_locks[tree_name].get('locked_by') != session_id:
            locked_by = navigation_locks[tree_name].get('locked_by', 'unknown')
            print(f"[@utils:navigationLockManager:unlock_navigation_tree] Tree {tree_name} locked by {locked_by}, cannot unlock with session {session_id}")
            return False
        
        # Unlock the tree
        del navigation_locks[tree_name]
        
        print(f"[@utils:navigationLockManager:unlock_navigation_tree] Successfully unlocked tree: {tree_name}")
        return True
        
    except Exception as e:
        print(f"[@utils:navigationLockManager:unlock_navigation_tree] Error unlocking tree {tree_name}: {str(e)}")
        return False


def is_navigation_tree_locked(tree_name: str) -> bool:
    """
    Check if a navigation tree is locked
    
    Args:
        tree_name: The navigation tree name to check
        
    Returns:
        bool: True if tree is locked, False otherwise
    """
    return tree_name in navigation_locks


def get_navigation_tree_lock_info(tree_name: str) -> Optional[Dict[str, Any]]:
    """
    Get lock information for a navigation tree
    
    Args:
        tree_name: The navigation tree name to check
        
    Returns:
        dict: Lock information or None if tree not locked
    """
    if tree_name not in navigation_locks:
        return None
    
    lock_info = navigation_locks[tree_name]
    return {
        'locked_by': lock_info.get('locked_by'),
        'locked_at': lock_info.get('locked_at'),
        'locked_duration': time.time() - lock_info.get('locked_at', 0)
    }


def cleanup_expired_navigation_locks(timeout_seconds: int = 1800) -> int:
    """
    Clean up navigation locks that have expired (older than timeout_seconds)
    
    Args:
        timeout_seconds: Lock timeout in seconds (default: 30 minutes)
        
    Returns:
        int: Number of locks cleaned up
    """
    try:
        print(f"[@utils:navigationLockManager:cleanup_expired_navigation_locks] Cleaning up locks older than {timeout_seconds} seconds")
        
        current_time = time.time()
        expired_trees = []
        
        for tree_name, lock_info in navigation_locks.items():
            locked_at = lock_info.get('locked_at', 0)
            if current_time - locked_at > timeout_seconds:
                expired_trees.append(tree_name)
        
        # Remove expired locks
        for tree_name in expired_trees:
            print(f"[@utils:navigationLockManager:cleanup_expired_navigation_locks] Cleaning up expired lock for tree: {tree_name}")
            del navigation_locks[tree_name]
        
        if len(expired_trees) > 0:
            print(f"[@utils:navigationLockManager:cleanup_expired_navigation_locks] Cleaned up {len(expired_trees)} expired locks")
        
        return len(expired_trees)
        
    except Exception as e:
        print(f"[@utils:navigationLockManager:cleanup_expired_navigation_locks] Error during cleanup: {str(e)}")
        return 0


def get_all_locked_navigation_trees() -> Dict[str, Dict[str, Any]]:
    """
    Get all currently locked navigation trees
    
    Returns:
        dict: Dictionary of locked trees with their lock info
    """
    try:
        locked_trees = {}
        
        for tree_name, lock_info in navigation_locks.items():
            locked_trees[tree_name] = {
                'locked_by': lock_info.get('locked_by'),
                'locked_at': lock_info.get('locked_at'),
                'locked_duration': time.time() - lock_info.get('locked_at', 0)
            }
        
        return locked_trees
        
    except Exception as e:
        print(f"[@utils:navigationLockManager:get_all_locked_navigation_trees] Error getting locked trees: {str(e)}")
        return {} 