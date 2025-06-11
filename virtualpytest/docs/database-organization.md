# Database Organization

## Overview
Database functions are now organized by table for better maintainability, while keeping a centralized import interface.

## Structure
```
utils/supabase_utils.py          # Single entry point (imports all functions)
├── lib/supabase/
    ├── campaign_db.py           # Campaign operations
    ├── testcase_db.py           # Test case operations
    ├── navigation_trees_db.py   # Navigation tree operations
    ├── userinterface_db.py      # User interface operations
    ├── devices_db.py            # Device operations
    ├── controllers_db.py        # Controller operations
    ├── environment_profiles_db.py # Environment profile operations
    └── device_models_db.py      # Device model operations
```

## Usage
Import from centralized entry point:
```python
# All functions available from single import
from utils.supabase_utils import (
    get_all_campaigns,          # Campaigns
    get_all_test_cases,         # Test cases
    get_all_trees,              # Navigation trees
    get_all_userinterfaces,     # User interfaces
    get_all_devices,            # Devices
    get_all_controllers,        # Controllers
    get_all_environment_profiles, # Environment profiles
    get_all_device_models       # Device models
)
```

## Benefits
- ✅ **Better Organization**: Functions grouped by database table
- ✅ **Maintainability**: Smaller, focused files (70-212 lines vs 822 lines)
- ✅ **Backward Compatibility**: Existing imports unchanged
- ✅ **Clear Separation**: Each table's operations isolated 