import os
from supabase import create_client, Client
from typing import Optional

# Global variable to hold the lazily-loaded client
_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """Get the Supabase client instance with lazy loading and HTTP options."""
    global _supabase_client
    
    if _supabase_client is None:
        try:
            # Only try to create client when actually needed
            url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
            key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            
            if url and key:
                # Create Supabase client with HTTP options to prevent connection issues
                _supabase_client = create_client(
                    url, 
                    key,
                    options={
                        'postgrest': {
                            'timeout': 30,
                            'headers': {
                                'Connection': 'keep-alive',
                                'Keep-Alive': 'timeout=30, max=100'
                            }
                        },
                        'auth': {
                            'timeout': 30
                        },
                        'global': {
                            'headers': {
                                'User-Agent': 'virtualpytest-server/1.0'
                            }
                        }
                    }
                )
                print(f"[@supabase_utils] Supabase client initialized with HTTP options")
            else:
                print(f"[@supabase_utils] Supabase environment variables not set, client not available")
                return None
        except Exception as e:
            print(f"[@supabase_utils] Failed to initialize Supabase client: {e}")
            return None
    
    return _supabase_client

# Lazy loading functions that will be called when the modules are actually imported
def _lazy_import_campaign_functions():
    """Lazy import campaign operations"""
    try:
        from lib.supabase.campaign_db import (
            save_campaign,
            get_campaign,
            get_all_campaigns,
            delete_campaign
        )
        return {
            'save_campaign': save_campaign,
            'get_campaign': get_campaign,
            'get_all_campaigns': get_all_campaigns,
            'delete_campaign': delete_campaign
        }
    except ImportError as e:
        print(f"[@supabase_utils] Campaign operations not available: {e}")
        return {}

def _lazy_import_testcase_functions():
    """Lazy import test case operations"""
    try:
        from lib.supabase.testcase_db import (
            save_test_case,
            get_test_case,
            get_all_test_cases,
            delete_test_case,
            save_result,
            get_failure_rates
        )
        return {
            'save_test_case': save_test_case,
            'get_test_case': get_test_case,
            'get_all_test_cases': get_all_test_cases,
            'delete_test_case': delete_test_case,
            'save_result': save_result,
            'get_failure_rates': get_failure_rates
        }
    except ImportError as e:
        print(f"[@supabase_utils] Test case operations not available: {e}")
        return {}

def _lazy_import_navigation_functions():
    """Lazy import navigation tree operations"""
    try:
        from lib.supabase.navigation_trees_db import (
            get_all_trees,
            get_tree,
            save_tree,
            update_tree,
            delete_tree,
            check_navigation_tree_name_exists,
            get_root_tree_for_interface
        )
        return {
            'get_all_trees': get_all_trees,
            'get_tree': get_tree,
            'save_tree': save_tree,
            'update_tree': update_tree,
            'delete_tree': delete_tree,
            'check_navigation_tree_name_exists': check_navigation_tree_name_exists,
            'get_root_tree_for_interface': get_root_tree_for_interface
        }
    except ImportError as e:
        print(f"[@supabase_utils] Navigation operations not available: {e}")
        return {}

def _lazy_import_userinterface_functions():
    """Lazy import user interface operations"""
    try:
        from lib.supabase.userinterface_db import (
            get_all_userinterfaces,
            get_userinterface,
            create_userinterface,
            update_userinterface,
            delete_userinterface,
            check_userinterface_name_exists
        )
        return {
            'get_all_userinterfaces': get_all_userinterfaces,
            'get_userinterface': get_userinterface,
            'create_userinterface': create_userinterface,
            'update_userinterface': update_userinterface,
            'delete_userinterface': delete_userinterface,
            'check_userinterface_name_exists': check_userinterface_name_exists
        }
    except ImportError as e:
        print(f"[@supabase_utils] User interface operations not available: {e}")
        return {}

# Cache for lazy-loaded functions
_function_cache = {}

def _lazy_import_device_functions():
    """Lazy import device operations"""
    try:
        from lib.supabase.devices_db import (
            save_device,
            get_device,
            get_all_devices,
            delete_device
        )
        return {
            'save_device': save_device,
            'get_device': get_device,
            'get_all_devices': get_all_devices,
            'delete_device': delete_device
        }
    except ImportError as e:
        print(f"[@supabase_utils] Device operations not available: {e}")
        return {}

def _lazy_import_controller_functions():
    """Lazy import controller operations"""
    try:
        from lib.supabase.controllers_db import (
            save_controller,
            get_controller,
            get_all_controllers,
            delete_controller
        )
        return {
            'save_controller': save_controller,
            'get_controller': get_controller,
            'get_all_controllers': get_all_controllers,
            'delete_controller': delete_controller
        }
    except ImportError as e:
        print(f"[@supabase_utils] Controller operations not available: {e}")
        return {}

def _lazy_import_environment_profile_functions():
    """Lazy import environment profile operations"""
    try:
        from lib.supabase.environment_profiles_db import (
            save_environment_profile,
            get_environment_profile,
            get_all_environment_profiles,
            delete_environment_profile
        )
        return {
            'save_environment_profile': save_environment_profile,
            'get_environment_profile': get_environment_profile,
            'get_all_environment_profiles': get_all_environment_profiles,
            'delete_environment_profile': delete_environment_profile
        }
    except ImportError as e:
        print(f"[@supabase_utils] Environment profile operations not available: {e}")
        return {}

def _lazy_import_device_model_functions():
    """Lazy import device model operations"""
    try:
        from lib.supabase.device_models_db import (
            get_all_device_models,
            get_device_model,
            create_device_model,
            update_device_model,
            delete_device_model,
            check_device_model_name_exists
        )
        return {
            'get_all_device_models': get_all_device_models,
            'get_device_model': get_device_model,
            'create_device_model': create_device_model,
            'update_device_model': update_device_model,
            'delete_device_model': delete_device_model,
            'check_device_model_name_exists': check_device_model_name_exists
        }
    except ImportError as e:
        print(f"[@supabase_utils] Device model operations not available: {e}")
        return {}

def __getattr__(name: str):
    """
    Dynamic attribute access for lazy loading of database functions.
    This allows backward compatibility while implementing lazy loading.
    """
    # Check if function is already cached
    if name in _function_cache:
        return _function_cache[name]
    
    # Try to load from different modules
    for loader_name, loader_func in [
        ('campaign', _lazy_import_campaign_functions),
        ('testcase', _lazy_import_testcase_functions),
        ('navigation', _lazy_import_navigation_functions),
        ('userinterface', _lazy_import_userinterface_functions),
        ('device', _lazy_import_device_functions),
        ('controller', _lazy_import_controller_functions),
        ('environment_profile', _lazy_import_environment_profile_functions),
        ('device_model', _lazy_import_device_model_functions),
    ]:
        functions = loader_func()
        if name in functions:
            _function_cache.update(functions)  # Cache all functions from this module
            return functions[name]
    
    # If function not found in any module, raise AttributeError
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'") 