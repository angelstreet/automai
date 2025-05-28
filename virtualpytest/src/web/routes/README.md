# Routes Organization

This directory contains the organized Flask route modules for the VirtualPyTest Web API.

## Structure

The routes have been organized into logical categories to improve maintainability and readability:

### Core Routes (`core_routes.py`)
- **Health check**: `/api/health`
- **Test cases**: `/api/testcases`, `/api/testcases/<test_id>`
- **Trees**: `/api/trees`, `/api/trees/<tree_id>`
- **Campaigns**: `/api/campaigns`, `/api/campaigns/<campaign_id>`
- **User interfaces**: `/api/userinterfaces`, `/api/userinterfaces/<interface_id>`

### Device Management Routes (`device_routes.py`)
- **Devices**: `/api/devices`, `/api/devices/<device_id>`
- **Controllers**: `/api/controllers`, `/api/controllers/<controller_id>`
- **Environment profiles**: `/api/environment-profiles`, `/api/environment-profiles/<profile_id>`

### VirtualPyTest Controller Routes (`controller_routes.py`)
- **Controller types**: `/api/virtualpytest/controller-types`
- **Controller instances**: `/api/virtualpytest/controllers`
- **Controller testing**: `/api/virtualpytest/controllers/test`
- **Device sets**: `/api/virtualpytest/device-sets`

### Remote Control Routes (`remote_routes.py`)
- **Android TV**: `/api/virtualpytest/android-tv/*`
- **Android Mobile**: `/api/virtualpytest/android-mobile/*`
- **IR Remote**: `/api/virtualpytest/ir-remote/*`
- **Bluetooth Remote**: `/api/virtualpytest/bluetooth-remote/*`

### Audio/Video Routes (`audiovideo_routes.py`)
- **HDMI Stream**: `/api/virtualpytest/hdmi-stream/*`

### Statistics Routes (`stats_routes.py`)
- **Dashboard stats**: `/api/stats`

## Shared Utilities (`utils.py`)

Common helper functions used across route modules:
- `check_supabase()` - Check if Supabase is available
- `check_controllers_available()` - Check if VirtualPyTest controllers are available
- `get_team_id()` - Get team ID from request headers
- `get_user_id()` - Get user ID from request headers

## Blueprint Registration

All route blueprints are registered in `__init__.py` through the `register_routes(app)` function.

## Benefits of This Organization

1. **Maintainability**: Each file focuses on a specific domain
2. **Readability**: Easier to find and understand related endpoints
3. **Scalability**: Easy to add new routes in the appropriate category
4. **Testing**: Can test each route category independently
5. **Team Development**: Different developers can work on different route files

## Migration from Original app.py

The original `app.py` (2085 lines) has been:
- Backed up as `app_backup.py`
- Replaced with a clean 75-line version that only handles:
  - Imports and configuration
  - Global session storage
  - Blueprint registration
  - Flask app startup

All route definitions have been moved to their respective category files. 