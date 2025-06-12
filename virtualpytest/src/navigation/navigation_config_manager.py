"""
Navigation Config Manager

Handles reading and writing navigation trees to JSON config files.
Simple mapping: userinterface name -> {userinterface_name}.json
"""

import os
import json
from typing import Dict, Any, List, Optional
from pathlib import Path

# Config directory path - point to src/config/navigation
CONFIG_DIR = Path(__file__).parent.parent / "config" / "navigation"

def ensure_config_directory() -> bool:
    """
    Ensure the navigation config directory exists
    
    Returns:
        bool: True if directory exists or was created successfully
    """
    try:
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        print(f"[@utils:navigationConfigManager:ensure_config_directory] Config directory ensured: {CONFIG_DIR}")
        return True
    except Exception as e:
        print(f"[@utils:navigationConfigManager:ensure_config_directory] Error creating config directory: {str(e)}")
        return False


def get_config_file_path(userinterface_name: str) -> Path:
    """
    Get the full path for a navigation tree config file based on userinterface name
    
    Args:
        userinterface_name: The userinterface name (e.g., 'horizon_mobile_android')
        
    Returns:
        Path: Full path to the config file
    """
    return CONFIG_DIR / f"{userinterface_name}.json"


def load_navigation_tree_from_config(userinterface_name: str) -> Optional[Dict[str, Any]]:
    """
    Load a navigation tree from JSON config file based on userinterface name
    
    Args:
        userinterface_name: The userinterface name to load (e.g., 'horizon_mobile_android')
        
    Returns:
        dict: Navigation tree data with 'nodes' and 'edges' keys, or None if not found
    """
    try:
        print(f"[@utils:navigationConfigManager:load_navigation_tree_from_config] Loading tree for userinterface: {userinterface_name}")
        
        config_file = get_config_file_path(userinterface_name)
        
        if not config_file.exists():
            print(f"[@utils:navigationConfigManager:load_navigation_tree_from_config] Config file not found: {config_file}")
            return None
        
        with open(config_file, 'r', encoding='utf-8') as f:
            tree_data = json.load(f)
        
        # Validate structure
        if not isinstance(tree_data, dict) or 'nodes' not in tree_data or 'edges' not in tree_data:
            print(f"[@utils:navigationConfigManager:load_navigation_tree_from_config] Invalid tree structure in {config_file}")
            return None
        
        print(f"[@utils:navigationConfigManager:load_navigation_tree_from_config] Successfully loaded tree for {userinterface_name} with {len(tree_data.get('nodes', []))} nodes and {len(tree_data.get('edges', []))} edges")
        return tree_data
        
    except Exception as e:
        print(f"[@utils:navigationConfigManager:load_navigation_tree_from_config] Error loading tree for {userinterface_name}: {str(e)}")
        return None


def save_navigation_tree_to_config(userinterface_name: str, tree_data: Dict[str, Any]) -> bool:
    """
    Save a navigation tree to JSON config file based on userinterface name
    
    Args:
        userinterface_name: The userinterface name (e.g., 'horizon_mobile_android')
        tree_data: Navigation tree data with 'nodes' and 'edges' keys
        
    Returns:
        bool: True if saved successfully, False otherwise
    """
    try:
        print(f"[@utils:navigationConfigManager:save_navigation_tree_to_config] Saving tree for userinterface: {userinterface_name}")
        
        # Ensure config directory exists
        if not ensure_config_directory():
            return False
        
        # Validate tree data structure
        if not isinstance(tree_data, dict) or 'nodes' not in tree_data or 'edges' not in tree_data:
            print(f"[@utils:navigationConfigManager:save_navigation_tree_to_config] Invalid tree data structure for {userinterface_name}")
            return False
        
        config_file = get_config_file_path(userinterface_name)
        
        # Write to file with proper formatting
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(tree_data, f, indent=2, ensure_ascii=False)
        
        print(f"[@utils:navigationConfigManager:save_navigation_tree_to_config] Successfully saved tree for {userinterface_name} to {config_file}")
        return True
        
    except Exception as e:
        print(f"[@utils:navigationConfigManager:save_navigation_tree_to_config] Error saving tree for {userinterface_name}: {str(e)}")
        return False


def list_available_navigation_trees() -> List[str]:
    """
    List all available navigation trees in the config directory
    
    Returns:
        list: List of userinterface names (without .json extension)
    """
    try:
        print(f"[@utils:navigationConfigManager:list_available_navigation_trees] Listing trees in {CONFIG_DIR}")
        
        if not CONFIG_DIR.exists():
            print(f"[@utils:navigationConfigManager:list_available_navigation_trees] Config directory does not exist")
            return []
        
        tree_names = []
        for file_path in CONFIG_DIR.glob("*.json"):
            if file_path.name != '.gitignore':  # Skip gitignore
                userinterface_name = file_path.stem  # Get filename without extension
                tree_names.append(userinterface_name)
        
        tree_names.sort()  # Sort alphabetically
        
        print(f"[@utils:navigationConfigManager:list_available_navigation_trees] Found {len(tree_names)} trees: {tree_names}")
        return tree_names
        
    except Exception as e:
        print(f"[@utils:navigationConfigManager:list_available_navigation_trees] Error listing trees: {str(e)}")
        return []


def delete_navigation_tree_config(userinterface_name: str) -> bool:
    """
    Delete a navigation tree config file based on userinterface name
    
    Args:
        userinterface_name: The userinterface name to delete
        
    Returns:
        bool: True if deleted successfully or file didn't exist, False on error
    """
    try:
        print(f"[@utils:navigationConfigManager:delete_navigation_tree_config] Deleting tree for userinterface: {userinterface_name}")
        
        config_file = get_config_file_path(userinterface_name)
        
        if not config_file.exists():
            print(f"[@utils:navigationConfigManager:delete_navigation_tree_config] Config file does not exist: {config_file}")
            return True  # Consider it success if file doesn't exist
        
        config_file.unlink()
        
        print(f"[@utils:navigationConfigManager:delete_navigation_tree_config] Successfully deleted tree config for: {userinterface_name}")
        return True
        
    except Exception as e:
        print(f"[@utils:navigationConfigManager:delete_navigation_tree_config] Error deleting tree for {userinterface_name}: {str(e)}")
        return False


def backup_navigation_tree_config(userinterface_name: str, backup_suffix: str = None) -> Optional[str]:
    """
    Create a backup of a navigation tree config file
    
    Args:
        userinterface_name: The userinterface name to backup
        backup_suffix: Optional suffix for backup file (default: timestamp)
        
    Returns:
        str: Backup file path if successful, None otherwise
    """
    try:
        import time
        
        print(f"[@utils:navigationConfigManager:backup_navigation_tree_config] Creating backup for userinterface: {userinterface_name}")
        
        config_file = get_config_file_path(userinterface_name)
        
        if not config_file.exists():
            print(f"[@utils:navigationConfigManager:backup_navigation_tree_config] Config file does not exist: {config_file}")
            return None
        
        # Generate backup filename
        if backup_suffix is None:
            timestamp = int(time.time())
            backup_suffix = f"backup_{timestamp}"
        
        backup_file = config_file.parent / f"{userinterface_name}_{backup_suffix}.json"
        
        # Copy file
        import shutil
        shutil.copy2(config_file, backup_file)
        
        print(f"[@utils:navigationConfigManager:backup_navigation_tree_config] Successfully created backup: {backup_file}")
        return str(backup_file)
        
    except Exception as e:
        print(f"[@utils:navigationConfigManager:backup_navigation_tree_config] Error creating backup for {userinterface_name}: {str(e)}")
        return None


def validate_navigation_tree_structure(tree_data: Dict[str, Any]) -> bool:
    """
    Validate that tree data has the required structure
    
    Args:
        tree_data: Navigation tree data to validate
        
    Returns:
        bool: True if structure is valid, False otherwise
    """
    try:
        if not isinstance(tree_data, dict):
            return False
        
        # Must have nodes and edges arrays
        if 'nodes' not in tree_data or 'edges' not in tree_data:
            return False
        
        if not isinstance(tree_data['nodes'], list) or not isinstance(tree_data['edges'], list):
            return False
        
        return True
        
    except Exception as e:
        print(f"[@utils:navigationConfigManager:validate_navigation_tree_structure] Error validating structure: {str(e)}")
        return False 