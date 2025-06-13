# URL Building Refactoring Plan

## Overview

Consolidate all URL building into 3 simple functions in `app_utils.py` and update all route files to use them consistently.

## Target Functions (Only 3 Needed)

```python
# Frontend (uses VITE_SERVER_URL)
vite_buildServerUrl(endpoint)                    # Frontend → Server API calls

# Server (uses host registry data)
server_buildHostUrl(host_info, endpoint)         # Server → Host API calls
server_buildHostWebUrl(host_info, path)          # Server → Host nginx/web calls

# Host (uses SERVER_URL env var)
host_buildServerUrl(endpoint)                    # Host → Server API calls
```

## Implementation Steps

### Phase 1: Core Functions Setup

- [x] **File**: `virtualpytest/src/utils/app_utils.py`
  - [x] Add the 3 new URL building functions
  - [x] Remove old/duplicate URL building functions
  - [x] Update imports/exports

### Phase 2: Frontend Updates

- [x] **File**: `virtualpytest/src/web/contexts/RegistrationContext.tsx`
  - [x] Replace `buildServerUrl` with `vite_buildServerUrl`
  - [x] Remove `buildHostUrl` and `buildHostWebUrl` (frontend only calls server)
  - [x] Update all URL building calls

### Phase 3: Host Route Files (use `host_buildServerUrl`)

- [ ] **File**: `virtualpytest/src/web/routes/host_av_routes.py`

  - [ ] Replace manual URL building with `host_buildServerUrl()`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/host_control_routes.py`

  - [ ] Replace manual URL building with `host_buildServerUrl()`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/host_remote_routes.py`

  - [ ] Replace manual URL building with `host_buildServerUrl()`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/host_verification_adb_routes.py`

  - [ ] Replace manual URL building with `host_buildServerUrl()`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/host_verification_execution_routes.py`

  - [ ] Replace manual URL building with `host_buildServerUrl()`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/host_verification_image_routes.py`

  - [ ] Replace manual URL building with `host_buildServerUrl()`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/host_verification_routes.py`

  - [ ] Replace manual URL building with `host_buildServerUrl()`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/host_verification_text_routes.py`
  - [ ] Replace manual URL building with `host_buildServerUrl()`
  - [ ] Update imports

### Phase 4: Server Route Files (use `server_buildHostUrl` and `server_buildHostWebUrl`)

- [x] **File**: `virtualpytest/src/web/routes/server_control_routes.py`

  - [x] Replace manual URL building with `server_buildHostUrl(host_info, endpoint)`
  - [x] Update imports
  - [x] **Priority**: HIGH (this fixes the current None:None error)

- [ ] **File**: `virtualpytest/src/web/routes/server_remote_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl(host_info, endpoint)`
  - [ ] Update imports

- [x] **File**: `virtualpytest/src/web/routes/server_verification_common_routes.py`

  - [x] Replace `buildHostUrl` and `buildHostWebUrl` with new functions
  - [x] Update imports

- [x] **File**: `virtualpytest/src/web/routes/server_verification_execution_routes.py`

  - [x] Replace `buildHostUrl` and `buildHostWebUrl` with new functions
  - [x] Update imports

- [x] **File**: `virtualpytest/src/web/routes/server_verification_image_routes.py`

  - [x] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [x] Update imports

- [x] **File**: `virtualpytest/src/web/routes/server_verification_text_routes.py`

  - [x] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [x] Update imports

- [x] **File**: `virtualpytest/src/web/routes/server_verification_adb_routes.py`

  - [x] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [x] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_campaign_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_device_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_devicemodel_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_navigation_config_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_navigation_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_pathfinding_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_power_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_screen_definition_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [x] **File**: `virtualpytest/src/web/routes/server_system_routes.py`

  - [x] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [x] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_testcase_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_userinterface_routes.py`

  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

- [ ] **File**: `virtualpytest/src/web/routes/server_validation_routes.py`
  - [ ] Replace manual URL building with `server_buildHostUrl` and `server_buildHostWebUrl`
  - [ ] Update imports

### Phase 5: Common/Utility Files

- [ ] **File**: `virtualpytest/src/web/routes/common_core_routes.py`

  - [ ] Update URL building calls to use appropriate function
  - [ ] Update imports

- [x] **File**: `virtualpytest/src/utils/host_utils.py`
  - [x] Replace `buildServerUrl` with `host_buildServerUrl`
  - [x] Update imports

### Phase 6: Verification & Cleanup

- [ ] **Search and replace** any remaining hardcoded URL building patterns
- [ ] **Remove** old URL building functions from `app_utils.py`
- [ ] **Test** critical paths:
  - [ ] Frontend → Server API calls
  - [ ] Server → Host API calls (especially take-control)
  - [ ] Host → Server registration/ping
  - [ ] Server → Host web/nginx resources

## Common Patterns to Replace

### In Host Routes:

```python
# ❌ OLD
url = f"http://localhost:5109/server/endpoint"
url = buildServerUrl('/server/endpoint')

# ✅ NEW
url = host_buildServerUrl('/server/endpoint')
```

### In Server Routes:

```python
# ❌ OLD
host_ip = host_info.get('host_ip')
host_port = host_info.get('host_port_external')
url = f"http://{host_ip}:{host_port}/host/endpoint"

# ✅ NEW
url = server_buildHostUrl(host_info, '/host/endpoint')
```

### In Frontend:

```typescript
// ❌ OLD
buildServerUrl('/server/endpoint');

// ✅ NEW
vite_buildServerUrl('/server/endpoint');
```

## Priority Order

1. **HIGH**: `server_control_routes.py` (fixes current None:None error)
2. **MEDIUM**: Other server routes that call hosts
3. **LOW**: Host routes, frontend, cleanup

## Success Criteria

- [ ] No more manual URL construction anywhere
- [ ] All routes use the 3 standardized functions
- [ ] Current None:None error is fixed
- [ ] All URL building is centralized in `app_utils.py`
- [ ] Environment variables are properly used for each context
