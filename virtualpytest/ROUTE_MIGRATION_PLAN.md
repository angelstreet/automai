# VirtualPyTest Route Migration Plan

## Overview
This document outlines the systematic migration from inconsistent route naming to a standardized convention without modifying any business logic or UI functionality.

## New Route Convention

### Structure: `/{context}/{domain}/{action}`

**Contexts:**
- `host/` - Routes executing on host devices (direct hardware control)
- `server/` - Routes executing on central server (coordination, orchestration)
- `api/` - Common/shared routes (health, data management)

**Domains:**
- `control` - Device control and session management
- `remote` - Remote controller operations
- `av` - Audio/Video operations
- `verification` - All verification types
- `navigation` - UI navigation and pathfinding
- `power` - Power management
- `system` - System management
- `data` - Data management

## Route Migration Mapping

### 1. Control Routes

#### Server Control Routes (server_control_routes.py)
```
OLD: /take-control
NEW: /server/control/take-control

OLD: /release-control  
NEW: /server/control/release-control

OLD: /navigate
NEW: /server/control/navigate
```

#### Host Control Routes (host_control_routes.py)
```
OLD: /take-control
NEW: /host/control/take-control

OLD: /release-control
NEW: /host/control/release-control

OLD: /controller-status
NEW: /host/control/status
```

### 2. Remote Controller Routes

#### Server Remote Routes (server_remote_routes.py)
```
OLD: /api/virtualpytest/android-tv/take-control
NEW: /server/remote/android-tv/take-control

OLD: /api/virtualpytest/android-tv/release-control
NEW: /server/remote/android-tv/release-control

OLD: /api/virtualpytest/android-tv/command
NEW: /server/remote/android-tv/command

OLD: /api/virtualpytest/android-tv/status
NEW: /server/remote/android-tv/status

OLD: /api/virtualpytest/android-tv/defaults
NEW: /server/remote/android-tv/defaults

OLD: /api/virtualpytest/android-tv/config
NEW: /server/remote/android-tv/config

OLD: /api/virtualpytest/android-tv/screenshot
NEW: /server/remote/android-tv/screenshot

OLD: /api/virtualpytest/android-mobile/config
NEW: /server/remote/android-mobile/config

OLD: /api/virtualpytest/android-mobile/defaults
NEW: /server/remote/android-mobile/defaults

OLD: /api/virtualpytest/android-mobile/take-control
NEW: /server/remote/android-mobile/take-control

OLD: /api/virtualpytest/android-mobile/release-control
NEW: /server/remote/android-mobile/release-control

OLD: /api/virtualpytest/android-mobile/execute-action
NEW: /server/remote/android-mobile/execute-action

OLD: /api/virtualpytest/android-mobile/dump-ui
NEW: /server/remote/android-mobile/dump-ui

OLD: /api/virtualpytest/android-mobile/click-element
NEW: /server/remote/android-mobile/click-element

OLD: /api/virtualpytest/android-mobile/get-apps
NEW: /server/remote/android-mobile/get-apps

OLD: /api/virtualpytest/android-mobile/screenshot
NEW: /server/remote/android-mobile/screenshot

OLD: /api/virtualpytest/android-mobile/screenshot-and-dump-ui
NEW: /server/remote/android-mobile/screenshot-and-dump-ui

OLD: /api/virtualpytest/android-mobile/actions
NEW: /server/remote/android-mobile/actions

OLD: /api/virtualpytest/android-mobile/command
NEW: /server/remote/android-mobile/command

OLD: /api/virtualpytest/ir-remote/connect
NEW: /server/remote/ir/connect

OLD: /api/virtualpytest/ir-remote/disconnect
NEW: /server/remote/ir/disconnect

OLD: /api/virtualpytest/ir-remote/command
NEW: /server/remote/ir/command

OLD: /api/virtualpytest/ir-remote/status
NEW: /server/remote/ir/status

OLD: /api/virtualpytest/ir-remote/config
NEW: /server/remote/ir/config

OLD: /api/virtualpytest/bluetooth-remote/connect
NEW: /server/remote/bluetooth/connect

OLD: /api/virtualpytest/bluetooth-remote/disconnect
NEW: /server/remote/bluetooth/disconnect

OLD: /api/virtualpytest/bluetooth-remote/command
NEW: /server/remote/bluetooth/command

OLD: /api/virtualpytest/bluetooth-remote/status
NEW: /server/remote/bluetooth/status

OLD: /api/virtualpytest/bluetooth-remote/config
NEW: /server/remote/bluetooth/config
```

### 3. Audio/Video Routes

#### Common Audio/Video Routes (common_audiovideo_routes.py)
```
OLD: /api/virtualpytest/av/connect
NEW: /host/av/connect

OLD: /api/virtualpytest/av/disconnect
NEW: /host/av/disconnect

OLD: /api/virtualpytest/av/get_status
NEW: /host/av/status

OLD: /api/virtualpytest/av/start_capture
NEW: /host/av/start-capture

OLD: /api/virtualpytest/av/stop_capture
NEW: /host/av/stop-capture

OLD: /api/virtualpytest/av/take_screenshot
NEW: /host/av/screenshot

OLD: /api/virtualpytest/av/debug
NEW: /host/av/debug
```

#### Server Screen Definition Routes (server_screen_definition_routes.py)
```
OLD: /screenshot
NEW: /server/av/screenshot

OLD: /capture/start
NEW: /server/av/start-capture

OLD: /capture/stop
NEW: /server/av/stop-capture

OLD: /capture/status
NEW: /server/av/capture-status

OLD: /capture/latest-frame
NEW: /server/av/latest-frame

OLD: /images/screenshot/<filename>
NEW: /server/av/images/screenshot/<filename>

OLD: /images
NEW: /server/av/images

OLD: /stream/status
NEW: /server/av/stream-status

OLD: /stream/stop
NEW: /server/av/stream-stop

OLD: /stream/restart
NEW: /server/av/stream-restart
```

### 4. Verification Routes

#### Server Verification Routes
```
# server_verification_common_routes.py
OLD: /api/virtualpytest/verification/actions
NEW: /server/verification/actions

OLD: /api/virtualpytest/reference/list
NEW: /server/verification/references

OLD: /api/virtualpytest/verification/status
NEW: /server/verification/status

# server_verification_execution_routes.py
OLD: /api/virtualpytest/verification/execute
NEW: /server/verification/execute

OLD: /api/virtualpytest/verification/execute-batch
NEW: /server/verification/execute-batch

# server_verification_image_routes.py
OLD: /api/virtualpytest/reference/capture
NEW: /server/verification/image/capture

OLD: /api/virtualpytest/reference/process-area
NEW: /server/verification/image/process-area

OLD: /api/virtualpytest/reference/save
NEW: /server/verification/image/save

OLD: /api/virtualpytest/reference/ensure-stream-availability
NEW: /server/verification/image/ensure-availability

# server_verification_text_routes.py
OLD: /api/virtualpytest/reference/text/auto-detect
NEW: /server/verification/text/auto-detect

OLD: /api/virtualpytest/reference/text/save
NEW: /server/verification/text/save

# server_verification_adb_routes.py
OLD: /api/virtualpytest/verification/adb/element-lists
NEW: /server/verification/adb/element-lists

OLD: /api/virtualpytest/verification/adb/wait-element-appear
NEW: /server/verification/adb/wait-element-appear

OLD: /api/virtualpytest/verification/adb/wait-element-disappear
NEW: /server/verification/adb/wait-element-disappear
```

#### Host Verification Routes
```
# host_verification_execution_routes.py
OLD: /stream/execute-verification
NEW: /host/verification/execute

OLD: /stream/execute-batch-verification
NEW: /host/verification/execute-batch

# host_verification_image_routes.py
OLD: /image/crop-area
NEW: /host/verification/image/crop-area

OLD: /image/process-area
NEW: /host/verification/image/process-area

OLD: /image/save-resource
NEW: /host/verification/image/save-resource

OLD: /image/ensure-reference-availability
NEW: /host/verification/image/ensure-availability

# host_verification_text_routes.py
OLD: /text/auto-detect
NEW: /host/verification/text/auto-detect

OLD: /text/save-resource
NEW: /host/verification/text/save-resource

# host_verification_adb_routes.py
OLD: /adb/element-lists
NEW: /host/verification/adb/element-lists

OLD: /adb/wait-element-appear
NEW: /host/verification/adb/wait-element-appear

OLD: /adb/wait-element-disappear
NEW: /host/verification/adb/wait-element-disappear
```

### 5. Navigation Routes

#### Server Navigation Routes (server_navigation_routes.py)
```
OLD: /trees
NEW: /server/navigation/trees

OLD: /trees/<tree_id>
NEW: /server/navigation/trees/<tree_id>

OLD: /trees/by-name/<tree_name>
NEW: /server/navigation/trees/by-name/<tree_name>

OLD: /trees/by-id-and-team/<tree_id>/<team_id>
NEW: /server/navigation/trees/by-id-and-team/<tree_id>/<team_id>

OLD: /trees/<tree_id>/complete
NEW: /server/navigation/trees/<tree_id>/complete

OLD: /userinterfaces
NEW: /server/navigation/userinterfaces

OLD: /userinterfaces/<interface_id>
NEW: /server/navigation/userinterfaces/<interface_id>

OLD: /execute/<tree_id>/<node_id>
NEW: /server/navigation/execute/<tree_id>/<node_id>
```

#### Server Navigation Config Routes (server_navigation_config_routes.py)
```
OLD: /api/navigation/config/trees
NEW: /server/navigation/config/trees

OLD: /api/navigation/config/trees/<userinterface_name>
NEW: /server/navigation/config/trees/<userinterface_name>

OLD: /api/navigation/config/trees/<userinterface_name>/lock
NEW: /server/navigation/config/trees/<userinterface_name>/lock

OLD: /api/navigation/config/trees/<userinterface_name>/unlock
NEW: /server/navigation/config/trees/<userinterface_name>/unlock
```

#### Server Pathfinding Routes (server_pathfinding_routes.py)
```
OLD: /navigate/<tree_id>/<node_id>
NEW: /server/navigation/pathfinding/navigate/<tree_id>/<node_id>

OLD: /preview/<tree_id>/<node_id>
NEW: /server/navigation/pathfinding/preview/<tree_id>/<node_id>

OLD: /stats/<tree_id>
NEW: /server/navigation/pathfinding/stats/<tree_id>

OLD: /cache/clear
NEW: /server/navigation/pathfinding/cache/clear

OLD: /cache/stats
NEW: /server/navigation/pathfinding/cache/stats

OLD: /take-control/<tree_id>
NEW: /server/navigation/pathfinding/take-control/<tree_id>

OLD: /take-control/<tree_id>/status
NEW: /server/navigation/pathfinding/take-control/<tree_id>/status

OLD: /alternatives/<tree_id>/<node_id>
NEW: /server/navigation/pathfinding/alternatives/<tree_id>/<node_id>
```

### 6. Power Management Routes

#### Server Power Routes (server_power_routes.py)
```
OLD: /api/virtualpytest/usb-power/defaults
NEW: /server/power/usb/defaults

OLD: /api/virtualpytest/usb-power/take-control
NEW: /server/power/usb/take-control

OLD: /api/virtualpytest/usb-power/release-control
NEW: /server/power/usb/release-control

OLD: /api/virtualpytest/usb-power/status
NEW: /server/power/usb/status

OLD: /api/virtualpytest/usb-power/power-status
NEW: /server/power/usb/power-status

OLD: /api/virtualpytest/usb-power/power-on
NEW: /server/power/usb/power-on

OLD: /api/virtualpytest/usb-power/power-off
NEW: /server/power/usb/power-off

OLD: /api/virtualpytest/usb-power/reboot
NEW: /server/power/usb/reboot

OLD: /api/virtualpytest/usb-power/toggle
NEW: /server/power/usb/toggle
```

### 7. System Management Routes

#### Server System Routes (server_system_routes.py)
```
OLD: /api/system/logs
NEW: /server/system/logs

OLD: /api/system/logs/clear
NEW: /server/system/logs/clear

OLD: /api/system/register
NEW: /server/system/register

OLD: /api/system/unregister
NEW: /server/system/unregister

OLD: /api/system/health
NEW: /server/system/health

OLD: /api/system/health-with-devices
NEW: /server/system/health-with-devices

OLD: /api/system/clients
NEW: /server/system/clients

OLD: /api/system/clients/devices
NEW: /server/system/clients/devices

OLD: /api/system/device/<device_id>
NEW: /server/system/device/<device_id>

OLD: /api/system/client/<device_model>
NEW: /server/system/client/<device_model>

OLD: /api/system/ping
NEW: /server/system/ping
```

#### Common Core Routes (common_core_routes.py)
```
OLD: /api/health
NEW: /api/system/health
```

### 8. Data Management Routes

#### Common Routes
```
# common_device_routes.py
OLD: /api/devices
NEW: /api/data/devices

OLD: /api/devices/<device_id>
NEW: /api/data/devices/<device_id>

# common_devicemodel_routes.py
OLD: /api/devicemodels
NEW: /api/data/devicemodels

OLD: /api/devicemodels/<model_id>
NEW: /api/data/devicemodels/<model_id>

# common_userinterface_routes.py
OLD: /api/userinterfaces
NEW: /api/data/userinterfaces

OLD: /api/userinterfaces/<interface_id>
NEW: /api/data/userinterfaces/<interface_id>

# common_stats_routes.py
OLD: /api/stats
NEW: /api/data/stats

# server_campaign_routes.py
OLD: /api/campaigns
NEW: /api/data/campaigns

OLD: /api/campaigns/<campaign_id>
NEW: /api/data/campaigns/<campaign_id>

# server_testcase_routes.py
OLD: /testcases
NEW: /api/data/testcases

OLD: /testcases/<test_id>
NEW: /api/data/testcases/<test_id>
```

### 9. Controller Routes

#### Common Controller Routes (common_controller_routes.py)
```
OLD: /api/virtualpytest/controller-types
NEW: /api/controllers/types

OLD: /api/virtualpytest/controllers
NEW: /api/controllers/instances

OLD: /api/virtualpytest/controllers/test
NEW: /api/controllers/test

OLD: /api/virtualpytest/device-sets
NEW: /api/controllers/device-sets
```

### 10. Validation Routes

#### Server Validation Routes (server_validation_routes.py)
```
OLD: /health
NEW: /server/validation/health

OLD: /preview/<tree_id>
NEW: /server/validation/preview/<tree_id>

OLD: /run/<tree_id>
NEW: /server/validation/run/<tree_id>
```

## Error Code Implementation

### Standard Error Response Format
```json
{
  "success": false,
  "error_code": "SPECIFIC_ERROR_CODE",
  "error_type": "category",
  "message": "Human-readable message",
  "details": {
    "additional_context": "value"
  }
}
```

### Error Code Categories

#### 400 - Bad Request
- `MISSING_REQUIRED_FIELD` - Required parameter missing
- `INVALID_PARAMETER_VALUE` - Invalid parameter format/value
- `INVALID_DEVICE_MODEL` - Unknown device model
- `INVALID_COORDINATES` - Invalid area/coordinates
- `MALFORMED_REQUEST` - JSON parsing errors

#### 404 - Not Found
- `DEVICE_NOT_FOUND` - Device not registered
- `HOST_NOT_FOUND` - Host not available
- `REFERENCE_NOT_FOUND` - Verification reference missing
- `ENDPOINT_NOT_FOUND` - Route doesn't exist

#### 409 - Conflict
- `DEVICE_ALREADY_LOCKED` - Device in use by another session
- `SESSION_CONFLICT` - Session already exists
- `RESOURCE_LOCKED` - Resource being used

#### 422 - Unprocessable Entity
- `DEVICE_NOT_READY` - Device exists but not ready
- `HOST_NOT_INITIALIZED` - Host device object not initialized
- `CONTROLLER_NOT_AVAILABLE` - Required controller missing
- `SERVICE_NOT_RUNNING` - Required service down

#### 500 - Internal Server Error
- `CONTROLLER_ERROR` - Controller operation failed
- `NETWORK_ERROR` - Network communication failed
- `INFRASTRUCTURE_ERROR` - System infrastructure issue
- `VERIFICATION_ERROR` - Verification execution failed

#### 503 - Service Unavailable
- `HOST_UNREACHABLE` - Cannot connect to host
- `SERVICE_UNAVAILABLE` - Required service down
- `SYSTEM_OVERLOADED` - System at capacity

## Implementation Strategy

### Phase 1: Add New Routes (Parallel)
1. Add new route definitions alongside existing ones
2. Implement error code standardization
3. Test new routes thoroughly

### Phase 2: Update Documentation
1. Update API documentation
2. Create migration guide for clients
3. Update internal documentation

### Phase 3: Deprecation Notice
1. Add deprecation warnings to old routes
2. Log usage of old routes
3. Communicate timeline to users

### Phase 4: Migration
1. Update client applications
2. Monitor usage patterns
3. Provide migration support

### Phase 5: Cleanup
1. Remove old route definitions
2. Clean up unused code
3. Final testing

## Benefits

1. **Clarity** - Routes are self-documenting
2. **Consistency** - Predictable naming patterns
3. **Debugging** - Clear error codes help identify issues
4. **Maintenance** - Easier to understand and modify
5. **API Evolution** - Clear structure for future additions

## Backward Compatibility

During transition period:
- Both old and new routes will work
- Old routes will return deprecation warnings
- Gradual migration timeline
- Clear communication to users 