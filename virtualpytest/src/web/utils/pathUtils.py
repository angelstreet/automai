"""
Path Setup Utilities

Centralized path configuration for the VirtualPyTest application.
This ensures consistent import paths across all modules.
"""

import sys
import os

def setup_virtualpytest_paths():
    """
    Set up import paths for VirtualPyTest application.
    
    This function can be called from any module to ensure proper import paths
    are available for utils, controllers, and other core modules.
    
    IMPORTANT: This function temporarily removes the current directory ('') from sys.path
    to prevent import conflicts, then adds the correct paths in priority order.
    
    Returns:
        list: List of paths that were added to sys.path
    """
    # Determine the current file's directory and calculate relative paths
    current_file_dir = os.path.dirname(os.path.abspath(__file__))  # /src/web/utils
    web_dir = os.path.dirname(current_file_dir)                   # /src/web
    src_dir = os.path.dirname(web_dir)                            # /src
    parent_dir = os.path.dirname(src_dir)                         # /
    
    # Temporarily remove current directory from sys.path to prevent conflicts
    current_dir_removed = False
    if '' in sys.path:
        sys.path.remove('')
        current_dir_removed = True
    
    # Define all critical paths in priority order (first = highest priority)
    paths_to_add = [
        os.path.join(src_dir, 'utils'),               # /src/utils (HIGHEST PRIORITY - for adbUtils)
        src_dir,                                      # /src
        os.path.join(parent_dir, 'controllers'),      # /controllers
        os.path.join(web_dir, 'utils'),               # /src/web/utils
        os.path.join(web_dir, 'cache'),               # /src/web/cache
        os.path.join(web_dir, 'services'),            # /src/web/services
    ]
    
    added_paths = []
    
    # Insert paths at the beginning in reverse order to maintain priority
    for path in reversed(paths_to_add):
        if os.path.exists(path) and path not in sys.path:
            sys.path.insert(0, path)
            added_paths.append(path)
    
    # Restore current directory at the end (lowest priority)
    if current_dir_removed:
        sys.path.append('')
    
    return list(reversed(added_paths))  # Return in the order they were processed

def log_path_setup(context_name: str = "Unknown"):
    """
    Set up paths and log the results.
    
    Args:
        context_name: Name of the context calling this function (for logging)
    """
    print(f"[@{context_name}:pathUtils] Setting up VirtualPyTest import paths...")
    
    added_paths = setup_virtualpytest_paths()
    
    for path in added_paths:
        print(f"[@{context_name}:pathUtils] Added to sys.path: {path}")
    
    print(f"[@{context_name}:pathUtils] Path setup completed ({len(added_paths)} paths added)")
    print(f"[@{context_name}:pathUtils] Priority: /src/utils (highest) -> /src -> /controllers -> /src/web/* -> current dir (lowest)")
    
    return added_paths 