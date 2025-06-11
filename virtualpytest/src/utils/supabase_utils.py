import os
from supabase import create_client, Client

# Initialize Supabase client using the simple pattern
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def get_supabase_client() -> Client:
    """Get the Supabase client instance."""
    return supabase

# Import all database functions from the organized lib/supabase structure
# This maintains backward compatibility while providing better organization

# Campaign operations
from lib.supabase.campaign_db import (
    save_campaign,
    get_campaign,
    get_all_campaigns,
    delete_campaign
)

# Test case operations  
from lib.supabase.testcase_db import (
    save_test_case,
    get_test_case,
    get_all_test_cases,
    delete_test_case,
    save_result,
    get_failure_rates
)

# Navigation tree operations
from lib.supabase.navigation_trees_db import (
    get_all_trees,
    get_tree,
    save_tree,
    update_tree,
    delete_tree,
    check_navigation_tree_name_exists,
    get_root_tree_for_interface
)

# User interface operations
from lib.supabase.userinterface_db import (
    get_all_userinterfaces,
    get_userinterface,
    create_userinterface,
    update_userinterface,
    delete_userinterface,
    check_userinterface_name_exists
)

# Device operations
from lib.supabase.devices_db import (
    save_device,
    get_device,
    get_all_devices,
    delete_device
)

# Controller operations
from lib.supabase.controllers_db import (
    save_controller,
    get_controller,
    get_all_controllers,
    delete_controller
)

# Environment profile operations
from lib.supabase.environment_profiles_db import (
    save_environment_profile,
    get_environment_profile,
    get_all_environment_profiles,
    delete_environment_profile
)

# Device model operations
from lib.supabase.device_models_db import (
    get_all_device_models,
    get_device_model,
    create_device_model,
    update_device_model,
    delete_device_model,
    check_device_model_name_exists
) 