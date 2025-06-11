"""
Supabase Database Layer

This package provides organized database operations for all tables.
Functions are split by table type for better maintainability.
"""

# Core Supabase client
from src.utils.supabase_utils import get_supabase_client

# Campaign operations
from .campaign_db import (
    save_campaign,
    get_campaign, 
    get_all_campaigns,
    delete_campaign
)

# Test case operations
from .testcase_db import (
    save_test_case,
    get_test_case,
    get_all_test_cases,
    delete_test_case,
    save_result,
    get_failure_rates
)

# Navigation tree operations
from .navigation_trees_db import (
    get_all_trees,
    get_tree,
    save_tree,
    update_tree,
    delete_tree,
    check_navigation_tree_name_exists,
    get_root_tree_for_interface
)

# User interface operations
from .userinterface_db import (
    get_all_userinterfaces,
    get_userinterface,
    create_userinterface,
    update_userinterface,
    delete_userinterface,
    check_userinterface_name_exists
)

# Device operations
from .devices_db import (
    save_device,
    get_device,
    get_all_devices,
    delete_device
)

# Controller operations
from .controllers_db import (
    save_controller,
    get_controller,
    get_all_controllers,
    delete_controller
)

# Environment profile operations
from .environment_profiles_db import (
    save_environment_profile,
    get_environment_profile,
    get_all_environment_profiles,
    delete_environment_profile
)

# Device model operations
from .device_models_db import (
    get_all_device_models,
    get_device_model,
    create_device_model,
    update_device_model,
    delete_device_model,
    check_device_model_name_exists
)

__all__ = [
    # Core
    'get_supabase_client',
    
    # Campaigns
    'save_campaign',
    'get_campaign',
    'get_all_campaigns', 
    'delete_campaign',
    
    # Test Cases
    'save_test_case',
    'get_test_case',
    'get_all_test_cases',
    'delete_test_case',
    'save_result',
    'get_failure_rates',
    
    # Navigation Trees
    'get_all_trees',
    'get_tree',
    'save_tree',
    'update_tree',
    'delete_tree',
    'check_navigation_tree_name_exists',
    'get_root_tree_for_interface',
    
    # User Interfaces
    'get_all_userinterfaces',
    'get_userinterface',
    'create_userinterface',
    'update_userinterface',
    'delete_userinterface',
    'check_userinterface_name_exists',
    
    # Devices
    'save_device',
    'get_device',
    'get_all_devices',
    'delete_device',
    
    # Controllers
    'save_controller',
    'get_controller',
    'get_all_controllers',
    'delete_controller',
    
    # Environment Profiles
    'save_environment_profile',
    'get_environment_profile',
    'get_all_environment_profiles',
    'delete_environment_profile',
    
    # Device Models
    'get_all_device_models',
    'get_device_model',
    'create_device_model',
    'update_device_model',
    'delete_device_model',
    'check_device_model_name_exists'
]
 