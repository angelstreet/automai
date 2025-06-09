# Controller Endpoint Migration Plan

## Overview
All controller operations should go directly to hosts, not through the server. The server should only handle coordination operations like device locking/unlocking.

## Current Issues
1. **Mixed Patterns**: Some controller operations go to server, others to host
2. **Inconsistent Naming**: `/api/av/*` vs `/server/av/*` vs `/host/av/*`
3. **Unnecessary Proxying**: Server proxying controller operations instead of direct host access

## Migration Strategy

### Phase 1: Audit Current Endpoints

#### ❌ INCORRECT (Server-based controller operations)
```
/server/remote/*           → Should be /host/remote/*
/server/av/*              → Should be /host/av/*  
/server/capture/*         → Should be /host/capture/*
/api/av/*                → Should be /host/av/*
```

#### ✅ CORRECT (Host-based controller operations)
```
/host/remote/*            → Direct controller access ✅
/host/av/*               → Direct controller access ✅ 
/host/capture/*          → Direct controller access ✅
```

#### ✅ KEEP ON SERVER (Coordination/Management)
```
/server/control/take-control     → Device locking coordination
/server/control/release-control  → Device unlocking coordination
/server/navigation/*            → Navigation tree management
/server/verification/*          → Verification orchestration
/server/system/*               → Host registration management
```

### Phase 2: Files to Modify

#### Frontend Files (Change buildServerUrl → buildHostUrl)
```
src/web/components/user-interface/ScreenDefinitionEditor.tsx
  - Line 419: '/server/av/screenshot' → '/host/av/screenshot'

src/web/components/user-interface/StreamClickOverlay.tsx  
  - Line 71: '/server/remote/execute-action' → '/host/remote/command'

src/web/components/navigation/EdgeEditDialog.tsx
  - Line 123: '/server/remote/actions' → DELETE (use static config)

src/web/components/remote/HDMIStreamPanel.tsx
  - Line 108: '/server/av/connect' → '/host/av/connect'
  - Line 153: '/server/av/disconnect' → '/host/av/disconnect'

src/web/pages/NavigationEditor.tsx
  - Line 576: '/server/capture/screenshot' → '/host/capture/screenshot'

src/web/components/remote/RemotePanel.tsx
  - Line 151: '/server/capture/screenshot' → '/host/capture/screenshot'
```

#### Backend Files to DELETE (Redundant server controller routes)
```
src/web/routes/server_remote_routes.py          → DELETE (use host_remote_routes.py)
src/web/routes/common_audiovideo_routes.py      → KEEP (but move to host-only)
src/web/routes/server_screen_definition_routes.py → MOVE capture endpoints to host
```

#### Backend Files to CREATE/MODIFY
```
src/web/routes/host_av_routes.py               → CREATE (move from common_audiovideo_routes.py)
src/web/routes/host_capture_routes.py          → CREATE (move from server_screen_definition_routes.py)
```

### Phase 3: Implementation Steps

#### Step 1: Create Host AV Routes ✅ COMPLETED
```python
# src/web/routes/host_av_routes.py - CREATED
from flask import Blueprint

host_av_bp = Blueprint('host_av', __name__, url_prefix='/host/av')

@host_av_bp.route('/connect', methods=['POST'])
def connect():
    # Moved from common_audiovideo_routes.py ✅
    
@host_av_bp.route('/disconnect', methods=['POST']) 
def disconnect():
    # Moved from common_audiovideo_routes.py ✅
    
@host_av_bp.route('/screenshot', methods=['POST'])
def take_screenshot():
    # Moved from common_audiovideo_routes.py ✅
    
@host_av_bp.route('/status', methods=['GET'])
def get_status():
    # Moved from common_audiovideo_routes.py ✅
```

#### Step 2: Create Host Capture Routes  
```python
# src/web/routes/host_capture_routes.py
from flask import Blueprint

host_capture_bp = Blueprint('host_capture', __name__, url_prefix='/host/capture')

@host_capture_bp.route('/screenshot', methods=['POST'])
def take_screenshot():
    # Move from server_screen_definition_routes.py
    
@host_capture_bp.route('/images/<path:filename>', methods=['GET'])
def serve_image():
    # Move from server_screen_definition_routes.py
```

#### Step 3: Update Frontend to Use buildHostUrl ✅ IN PROGRESS
```typescript
// Before (WRONG):
const response = await fetch(buildServerUrl('/api/av/connect'), {

// After (CORRECT): ✅ COMPLETED in HDMIStreamPanel
const hostUrl = buildHostUrl(selectedHost.id, '/host/av/connect');
const response = await fetch(hostUrl, {
```

**COMPLETED:**
- ✅ HDMIStreamPanel.tsx - Updated to use /host/av/connect and /host/av/disconnect
- ✅ ScreenDefinitionEditor.tsx - Already correctly uses /host/remote/screenshot (not /server/av/screenshot as initially thought)
- ✅ RemotePanel.tsx - Already correctly uses /host/remote/screenshot via useRemoteConnection hook
- ✅ NavigationEditor.tsx - Updated to use /host/av/screenshot instead of /server/capture/screenshot
- ✅ ScreenshotCapture.tsx - Updated to use /host/av/images/* instead of /server/capture/images/*
- ✅ VideoCapture.tsx - Updated to use /host/av/images/* instead of /server/capture/images/*
- ✅ host_av_routes.py - Added image serving endpoints (/host/av/images/screenshot/* and /host/av/images)

**REMAINING:**
- ❌ Clean up obsolete /server/capture/* routes in server_screen_definition_routes.py (can be deprecated since host now serves images directly)
- ❌ Other components using /server/capture/* endpoints (if any)

#### Step 4: Update Route Registration ✅ COMPLETED
```python
# src/web/routes/__init__.py - UPDATED
# Removed common_audiovideo_routes from common routes
# Added host_av_routes to host-only routes
```

### Phase 4: Configuration Updates

#### Update Remote Configs (Already Correct)
```typescript
// src/web/hooks/remote/remoteConfigs.ts - Already correct!
serverEndpoints: {
  connect: '/server/control/take-control',        // Server coordination ✅
  disconnect: '/server/control/release-control',  // Server coordination ✅
  screenshot: '/host/remote/screenshot',          // Host controller ✅
  command: '/host/remote/command',                // Host controller ✅
}
```

#### Create AV Configs
```typescript
// src/config/avConfigs.ts - NEW FILE
export const AV_CONFIG = {
  serverEndpoints: {
    connect: '/host/av/connect',
    disconnect: '/host/av/disconnect', 
    screenshot: '/host/av/screenshot',
    startCapture: '/host/av/start-capture',
    stopCapture: '/host/av/stop-capture',
  }
};
```

### Phase 5: Testing & Validation

#### Test Each Endpoint Migration
1. **Screenshot Operations**
   - ✅ Remote screenshot: `/host/remote/screenshot`
   - ✅ AV screenshot: `/host/av/screenshot`
   - ✅ Capture screenshot: `/host/capture/screenshot`

2. **Command Operations**
   - ✅ Remote commands: `/host/remote/command`
   - ✅ AV commands: `/host/av/*`

3. **Coordination Operations (Keep on Server)**
   - ✅ Device locking: `/server/control/take-control`
   - ✅ Device unlocking: `/server/control/release-control`

#### Verify No Server Controller Operations Remain
```bash
# Should return no results after migration:
grep -r "buildServerUrl.*server.*remote" src/web/
grep -r "buildServerUrl.*server.*av" src/web/
grep -r "buildServerUrl.*server.*capture" src/web/
```

### Phase 6: Cleanup ✅ IN PROGRESS

#### Delete Obsolete Files ✅ PARTIALLY COMPLETED
```
src/web/routes/server_remote_routes.py          → DELETE (pending)
src/web/routes/common_audiovideo_routes.py      → ✅ DELETED (moved to host_av_routes.py)
```

#### Update Documentation
- Update API documentation to reflect host-based controller operations
- Update architecture diagrams to show direct host communication
- Update troubleshooting guides

## Benefits After Migration

1. **Consistent Architecture**: All controller operations go directly to hosts
2. **Better Performance**: No unnecessary server proxying
3. **Clearer Separation**: Server = coordination, Host = execution
4. **Easier Debugging**: Direct host communication for controller issues
5. **Scalability**: Hosts handle their own controller operations independently

## Rollback Plan

If issues arise, temporarily restore server endpoints while fixing host endpoints:
1. Re-enable server controller routes
2. Update frontend to use buildServerUrl temporarily  
3. Fix host endpoint issues
4. Re-migrate to host endpoints

## Success Criteria

- ✅ All controller operations use `/host/*` endpoints (AV and Remote operations completed)
- ❌ No `/server/remote/*`, `/server/av/*`, `/server/capture/*` endpoints remain (server_screen_definition_routes.py still has /server/capture/*)
- ✅ Frontend uses `buildHostUrl()` for all controller operations (HDMIStreamPanel, NavigationEditor completed; others already correct)
- ✅ Server only handles coordination operations (device locking/unlocking via /server/control/*)
- [ ] All tests pass with new endpoint structure