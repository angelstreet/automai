"""
Centralized Path Setup Utility

This module provides a single function to set up all necessary Python paths
for the VirtualPyTest web application. Import this at the top of any module
that needs access to utils, controllers, or other project directories.

Usage:
    from utils.path_setup import setup_all_paths
    setup_all_paths()
"""

import sys
import os

def setup_all_paths():
    """
    Setup all necessary Python paths for VirtualPyTest web application
    
    This function adds all required directories to sys.path in the correct order:
    1. Current web/utils directory (highest priority)
    2. Parent src/utils directory 
    3. Parent src directory
    4. Controllers directory
    5. Web cache directory
    6. Web services directory
    
    Call this function at the top of any module that needs imports.
    """
    # Get the current file's directory (web/utils)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Calculate all the paths we need
    web_dir = os.path.dirname(current_dir)  # web directory
    src_dir = os.path.dirname(web_dir)      # src directory
    parent_dir = os.path.dirname(src_dir)   # parent directory
    
    paths_to_add = [
        current_dir,                                    # web/utils (highest priority)
        os.path.join(parent_dir, 'utils'),             # parent/utils
        src_dir,                                        # src
        os.path.join(parent_dir, 'controllers'),       # controllers
        os.path.join(web_dir, 'cache'),                # web/cache
        os.path.join(web_dir, 'services'),             # web/services
    ]
    
    # Add each path to sys.path if it's not already there
    for path in paths_to_add:
        if path not in sys.path:
            sys.path.insert(0, path)
    
    # Debug logging (can be disabled in production)
    if os.getenv('DEBUG_PATH_SETUP', 'false').lower() == 'true':
        print(f"[@path_setup] Added {len(paths_to_add)} paths to sys.path:")
        for i, path in enumerate(paths_to_add):
            print(f"  {i+1}. {path}")

def get_web_dir():
    """Get the web directory path"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(current_dir)

def get_src_dir():
    """Get the src directory path"""
    return os.path.dirname(get_web_dir())

def get_parent_dir():
    """Get the parent directory path"""
    return os.path.dirname(get_src_dir())

def get_utils_dir():
    """Get the parent utils directory path"""
    return os.path.join(get_parent_dir(), 'utils')

def get_controllers_dir():
    """Get the controllers directory path"""
    return os.path.join(get_parent_dir(), 'controllers')

def get_cache_dir():
    """Get the web cache directory path"""
    return os.path.join(get_web_dir(), 'cache')

def get_services_dir():
    """Get the web services directory path"""
    return os.path.join(get_web_dir(), 'services') 