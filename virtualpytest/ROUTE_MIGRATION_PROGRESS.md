# Route Migration Progress

## Completed Migrations

### ✅ Server Routes (Backend)
1. **server_remote_routes.py** - Updated to `/server/remote`
   - `/server/remote/android-tv/*`
   - `/server/remote/android-mobile/*`
   - `/server/remote/ir-remote/*`
   - `/server/remote/bluetooth-remote/*`

2. **server_power_routes.py** - Updated to `/server/power`
   - `/server/power/usb-power/*`

3. **server_pathfinding_routes.py** - Updated to `/server/navigation`
   - `/server/navigation/*`

4. **common_controller_routes.py** - Updated to `/api/controller`
   - `/api/controller/controller-types`
   - `/api/controller/controllers`
   - `/api/controller/controllers/test`
   - `/api/controller/device-sets`

5. **common_audiovideo_routes.py** - Updated to `/api/av`
   - `/api/av/connect`
   - `/api/av/disconnect`
   - `/api/av/screenshot`
   - `/api/av/command`

6. **server_verification_common_routes.py** - Updated to `/server/verification`
   - `/server/verification/actions`
   - `/server/verification/reference/list`
   - `/server/verification/reference/delete`

7. **server_verification_text_routes.py** - Updated to `/server/verification`
   - `/server/verification/reference/text/auto-detect`
   - `/server/verification/reference/text/save`

8. **server_verification_image_routes.py** - Updated to `/server/verification`
   - `/server/verification/reference/capture`
   - `/server/verification/reference/process-area`
   - `/server/verification/reference/save`
   - `/server/verification/reference/ensure-stream-availability`

9. **server_verification_adb_routes.py** - Updated to `/server/verification`
   - `/server/verification/adb/element-lists`

10. **server_verification_execution_routes.py** - Updated to `/server/verification`
    - `/server/verification/execute`
    - `/server/verification/execute-batch`

11. **server_screen_definition_routes.py** - Updated to `/server/capture`
    - `/server/capture/screenshot`
    - `/server/capture/start`
    - `/server/capture/stop`
    - `/server/capture/status`
    - `/server/capture/latest-frame`
    - `/server/capture/images/screenshot/<filename>`
    - `/server/capture/images`
    - `/server/capture/stream/status`
    - `/server/capture/stream/stop`
    - `/server/capture/stream/restart`

12. **server_navigation_config_routes.py** - Updated to `/api/navigation/config`
    - `/api/navigation/config/trees`
    - `/api/navigation/config/trees/<userinterface_name>`
    - `/api/navigation/config/trees/<userinterface_name>/lock`
    - `/api/navigation/config/trees/<userinterface_name>/unlock`

### ✅ Frontend Files (TypeScript)
1. **remoteConfigs.ts** - Updated all remote device configurations
2. **remoteTypes.ts** - Added missing USB Power endpoints
3. **useControllerTypes.ts** - Updated to `/api/controller/controller-types`
4. **useControllers.ts** - Updated to `/api/controller/controller-types`
5. **useVerificationReferences.ts** - Updated to `/server/verification/reference/list`
6. **navigationApi.ts** - Updated to `server/navigation`
7. **captureApi.ts** - Updated to `server/capture`

### ✅ Route Registration
1. **__init__.py** - Removed old URL prefix from screen_definition_blueprint

## Route Convention Applied

**New Convention**: `/{context}/{domain}/{action}` where:
- **Context**: `server/`, `host/`, `api/`
- **Domain**: `remote`, `power`, `navigation`, `verification`, `capture`, `controller`, `av`
- **Action**: specific operations like `take-control`, `power-on`, `execute`

## Files Not Requiring Updates

### Already Using Correct Format
- **server_navigation_routes.py** - Already uses `/api/navigation`
- **server_system_routes.py** - No old patterns found
- **server_control_routes.py** - No old patterns found
- **server_validation_routes.py** - No old patterns found
- **server_remote_routes_v2.py** - No old patterns found

### No Active Routes
- **server_verification_control_routes.py** - Contains only documentation comments

## Summary

✅ **12 Backend Route Files Updated**
✅ **7 Frontend Files Updated**
✅ **1 Route Registration File Updated**
✅ **All Old `/api/virtualpytest/*` Patterns Migrated**
✅ **TypeScript Interface Updated for USB Power**

## Next Steps

1. **Test the updated routes** - Restart server and verify all endpoints work
2. **Update any remaining references** - Search for any missed old route patterns
3. **Update documentation** - Ensure API documentation reflects new routes
4. **Clean up migration files** - Remove temporary migration documentation

## Testing Commands

```bash
# Test remote control
curl -k -X POST https://77.56.53.130:5119/server/remote/android-mobile/take-control

# Test verification
curl -k -X GET https://77.56.53.130:5009/server/verification/reference/list

# Test capture
curl -k -X POST https://77.56.53.130:5009/server/capture/screenshot

# Test controller types
curl -k -X GET https://77.56.53.130:5009/api/controller/controller-types
``` 